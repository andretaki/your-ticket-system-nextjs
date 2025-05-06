import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import * as subscriptionManager from '@/lib/graphSubscriptionManager';

// Helper to verify admin permissions
async function verifyAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error('Unauthorized: Authentication required');
    }
    
    // Check if the user has admin role
    if (session.user.role !== 'admin') {
        throw new Error('Forbidden: Admin permissions required');
    }
    
    return session.user;
}

export async function GET(request: NextRequest) {
    try {
        await verifyAdmin();
        
        // List all subscriptions
        const subscriptions = await subscriptionManager.listSubscriptions();
        
        return NextResponse.json({
            message: `Found ${subscriptions.length} active subscriptions`,
            subscriptions
        });
    } catch (error: any) {
        if (error.message.startsWith('Unauthorized') || error.message.startsWith('Forbidden')) {
            return NextResponse.json({ error: error.message }, { status: error.message.startsWith('Unauthorized') ? 401 : 403 });
        }
        console.error('Admin API Error (GET subscriptions):', error);
        return NextResponse.json({ error: 'Failed to list subscriptions' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await verifyAdmin();
        const body = await request.json();
        const action = body.action;
        
        if (!action) {
            return NextResponse.json({ error: 'Action parameter required' }, { status: 400 });
        }
        
        switch (action) {
            case 'create': {
                const subscription = await subscriptionManager.createMailSubscription();
                if (!subscription) {
                    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
                }
                return NextResponse.json({
                    message: 'Subscription created successfully',
                    subscription
                });
            }
            
            case 'renew': {
                const { subscriptionId } = body;
                if (!subscriptionId) {
                    return NextResponse.json({ error: 'Subscription ID required for renewal' }, { status: 400 });
                }
                
                const renewedSubscription = await subscriptionManager.renewSubscription(subscriptionId);
                if (!renewedSubscription) {
                    return NextResponse.json({ error: 'Failed to renew subscription' }, { status: 500 });
                }
                
                return NextResponse.json({
                    message: 'Subscription renewed successfully',
                    subscription: renewedSubscription
                });
            }
            
            case 'delete': {
                const { subscriptionId } = body;
                if (!subscriptionId) {
                    return NextResponse.json({ error: 'Subscription ID required for deletion' }, { status: 400 });
                }
                
                const success = await subscriptionManager.deleteSubscription(subscriptionId);
                if (!success) {
                    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
                }
                
                return NextResponse.json({
                    message: 'Subscription deleted successfully',
                });
            }
            
            case 'ensure': {
                const subscription = await subscriptionManager.ensureActiveSubscription();
                if (!subscription) {
                    return NextResponse.json({ error: 'Failed to ensure active subscription' }, { status: 500 });
                }
                
                return NextResponse.json({
                    message: 'Active subscription ensured',
                    subscription
                });
            }
            
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        if (error.message.startsWith('Unauthorized') || error.message.startsWith('Forbidden')) {
            return NextResponse.json({ error: error.message }, { status: error.message.startsWith('Unauthorized') ? 401 : 403 });
        }
        console.error('Admin API Error (POST subscriptions):', error);
        return NextResponse.json({ error: 'Failed to process subscription request' }, { status: 500 });
    }
} 