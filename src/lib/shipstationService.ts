import axios, { AxiosError } from 'axios';
import * as alertService from '@/lib/alertService'; // For alerting on API failures

const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY;
const SHIPSTATION_API_SECRET = process.env.SHIPSTATION_API_SECRET;
const SHIPSTATION_BASE_URL = 'https://ssapi.shipstation.com';

// --- Rate Limiting Configuration ---
const RATE_LIMIT = 200; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_RETRIES = 3;

// Simple in-memory rate limiter
class RateLimiter {
    private requests: number[] = [];
    private readonly limit: number;
    private readonly window: number;

    constructor(limit: number, window: number) {
        this.limit = limit;
        this.window = window;
    }

    async waitForSlot(): Promise<void> {
        const now = Date.now();
        // Remove requests outside the current window
        this.requests = this.requests.filter(time => now - time < this.window);

        if (this.requests.length >= this.limit) {
            // Calculate wait time until the oldest request expires
            const oldestRequest = this.requests[0];
            const waitTime = this.window - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            // Try again after waiting
            return this.waitForSlot();
        }

        this.requests.push(now);
    }
}

// Create a single rate limiter instance for all requests
const rateLimiter = new RateLimiter(RATE_LIMIT, RATE_WINDOW);

// --- Type Definitions for ShipStation API Response Snippets ---
// Define interfaces based on the fields you actually need from ShipStation
interface ShipStationShipment {
    shipmentId: number;
    trackingNumber: string | null;
    shipDate: string; // ISO 8601 date string
    carrierCode: string | null; // e.g., 'fedex', 'ups', 'usps'
    voided: boolean;
    orderId?: number; // Added for shipments endpoint response
    orderNumber?: string; // Added for shipments endpoint response
    // Add other fields if needed: serviceCode, packageCode, confirmation, etc.
}

interface ShipStationOrder {
    orderId: number;
    orderNumber: string;
    orderStatus: 'awaiting_payment' | 'awaiting_shipment' | 'shipped' | 'on_hold' | 'cancelled';
    customerEmail: string | null;
    shipments: ShipStationShipment[] | null; // Shipments might be null or empty
    // Add other fields if needed: orderDate, shipTo, items, etc.
}

interface ShipStationOrderResponse {
    orders: ShipStationOrder[];
    total: number;
    page: number;
    pages: number;
}

interface ShipStationShipmentsResponse {
    shipments: ShipStationShipment[];
    total: number;
    page: number;
    pages: number;
}

// --- Result Structure for our Service ---
export interface OrderTrackingInfo {
    found: boolean;
    orderStatus?: ShipStationOrder['orderStatus'];
    shipments?: Array<{ // Simplify the shipment info we pass back
        trackingNumber: string;
        carrier: string;
        shipDate: string; // Keep as string for simplicity
    }>;
    errorMessage?: string; // In case of lookup errors
}

/**
 * Makes a rate-limited request to the ShipStation API with retry logic.
 * @param orderNumber The customer's order number.
 * @returns OrderTrackingInfo object or null if critical error occurs.
 */
export async function getOrderTrackingInfo(orderNumber: string): Promise<OrderTrackingInfo | null> {
    if (!SHIPSTATION_API_KEY || !SHIPSTATION_API_SECRET) {
        console.error("ShipStation Service: API Key or Secret not configured.");
        await alertService.trackErrorAndAlert(
            'ShipStationService-Config',
            'ShipStation API Key/Secret Missing',
            { orderNumber }
        );
        return null;
    }

    const authHeader = `Basic ${Buffer.from(`${SHIPSTATION_API_KEY}:${SHIPSTATION_API_SECRET}`).toString('base64')}`;
    console.log(`ShipStation Service: Looking up orderNumber: ${orderNumber}`);

    try {
        // Step 1: First check the /orders endpoint
        const orderInfo = await getOrderInfo(orderNumber, authHeader);
        
        if (!orderInfo.found) {
            return orderInfo; // Order not found, return the result
        }
        
        // Step 2: If order is found but no shipments, check the /shipments endpoint
        if (orderInfo.found && (!orderInfo.shipments || orderInfo.shipments.length === 0)) {
            console.log(`ShipStation Service: Order ${orderNumber} found but no shipments in order data. Checking shipments endpoint...`);
            
            const shipmentsInfo = await getShipmentsInfo(orderNumber, authHeader);
            
            if (shipmentsInfo.shipments && shipmentsInfo.shipments.length > 0) {
                // We found shipments via the shipments endpoint, update the order info
                console.log(`ShipStation Service: Found ${shipmentsInfo.shipments.length} shipments for order ${orderNumber} via shipments endpoint`);
                return {
                    found: true,
                    orderStatus: orderInfo.orderStatus,
                    shipments: shipmentsInfo.shipments
                };
            }
        }
        
        // Return the original order info if we didn't find additional shipments
        return orderInfo;
    } catch (error) {
        console.error("ShipStation Service: Critical error in getOrderTrackingInfo", error);
        await alertService.trackErrorAndAlert(
            'ShipStationService-API',
            `ShipStation API lookup failed critically for order ${orderNumber}`,
            { orderNumber, error: error instanceof Error ? error.message : 'Unknown error' }
        );
        return null;
    }
}

/**
 * Helper function to get order information from the /orders endpoint
 */
async function getOrderInfo(orderNumber: string, authHeader: string): Promise<OrderTrackingInfo> {
    const url = `${SHIPSTATION_BASE_URL}/orders`;
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
        try {
            // Wait for a rate limit slot before making the request
            await rateLimiter.waitForSlot();

            const response = await axios.get<ShipStationOrderResponse>(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                },
                params: {
                    orderNumber: orderNumber,
                    pageSize: 1
                }
            });

            if (response.data && response.data.orders && response.data.orders.length > 0) {
                const order = response.data.orders[0];
                console.log(`ShipStation Service: Found order ${order.orderId} with status ${order.orderStatus}`);

                const validShipments = (order.shipments || [])
                    .filter(shipment => !shipment.voided && shipment.trackingNumber && shipment.carrierCode)
                    .map(shipment => ({
                        trackingNumber: shipment.trackingNumber!,
                        carrier: shipment.carrierCode!,
                        shipDate: shipment.shipDate
                    }));

                return {
                    found: true,
                    orderStatus: order.orderStatus,
                    shipments: validShipments.length > 0 ? validShipments : undefined
                };
            } else {
                console.log(`ShipStation Service: OrderNumber ${orderNumber} not found.`);
                return { found: false, errorMessage: 'Order number not found in our system.' };
            }

        } catch (error: unknown) {
            let errorMessage = `Failed to fetch data from ShipStation for order ${orderNumber}`;
            let statusCode: number | undefined;
            let retryAfter: number | undefined;

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                statusCode = axiosError.response?.status;
                retryAfter = parseInt(axiosError.response?.headers?.['retry-after'] || '0', 10);

                errorMessage = `${errorMessage}. Status: ${statusCode}. ${axiosError.message}`;
                if (axiosError.response?.data) {
                    console.error("ShipStation API Error Response:", axiosError.response.data);
                } else {
                    console.error("ShipStation API Error:", axiosError.message);
                }

                // Handle rate limiting (429) with retry
                if (statusCode === 429 && retryCount < MAX_RETRIES) {
                    const waitTime = (retryAfter || 5) * 1000; // Convert to milliseconds
                    console.log(`ShipStation Service: Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue; // Try again
                }
            } else {
                console.error("ShipStation Service Error:", error);
                errorMessage = `${errorMessage}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }

            // Alert on API errors (e.g., 5xx, 401, potentially 429 rate limits)
            if (!statusCode || statusCode >= 400) {
                await alertService.trackErrorAndAlert(
                    'ShipStationService-API',
                    `ShipStation API lookup failed for order ${orderNumber}`,
                    { orderNumber, statusCode, retryCount, error: errorMessage }
                );
            }

            // If we've exhausted retries or it's not a rate limit error, return error info
            return { found: false, errorMessage: `System error looking up order. Status Code: ${statusCode}` };
        }
    }

    // If we've exhausted all retries
    return { found: false, errorMessage: 'Maximum retry attempts reached for ShipStation API' };
}

/**
 * Helper function to get shipment information from the /shipments endpoint
 */
async function getShipmentsInfo(orderNumber: string, authHeader: string): Promise<{shipments?: Array<{trackingNumber: string; carrier: string; shipDate: string}>}> {
    const url = `${SHIPSTATION_BASE_URL}/shipments`;
    let retryCount = 0;
    
    while (retryCount <= MAX_RETRIES) {
        try {
            // Wait for a rate limit slot before making the request
            await rateLimiter.waitForSlot();

            const response = await axios.get<ShipStationShipmentsResponse>(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                },
                params: {
                    orderNumber: orderNumber,
                    pageSize: 100 // Get all shipments for this order
                }
            });

            if (response.data && response.data.shipments && response.data.shipments.length > 0) {
                console.log(`ShipStation Service: Found ${response.data.shipments.length} shipments for order ${orderNumber}`);

                const validShipments = response.data.shipments
                    .filter(shipment => !shipment.voided && shipment.trackingNumber && shipment.carrierCode)
                    .map(shipment => ({
                        trackingNumber: shipment.trackingNumber!,
                        carrier: shipment.carrierCode!,
                        shipDate: shipment.shipDate
                    }));

                return {
                    shipments: validShipments.length > 0 ? validShipments : undefined
                };
            } else {
                console.log(`ShipStation Service: No shipments found for orderNumber ${orderNumber}.`);
                return { shipments: undefined };
            }

        } catch (error: unknown) {
            let statusCode: number | undefined;
            let retryAfter: number | undefined;

            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                statusCode = axiosError.response?.status;
                retryAfter = parseInt(axiosError.response?.headers?.['retry-after'] || '0', 10);

                // Handle rate limiting (429) with retry
                if (statusCode === 429 && retryCount < MAX_RETRIES) {
                    const waitTime = (retryAfter || 5) * 1000; // Convert to milliseconds
                    console.log(`ShipStation Service: Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue; // Try again
                }
            }

            console.error("ShipStation Service: Error fetching shipments", error);
            // Return empty result on error
            return { shipments: undefined };
        }
    }

    console.log(`ShipStation Service: Max retries reached when fetching shipments for order ${orderNumber}`);
    return { shipments: undefined };
} 