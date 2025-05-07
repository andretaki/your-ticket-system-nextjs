import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/generative-ai";
import { ticketTypeEcommerceEnum, ticketPriorityEnum } from '@/db/schema'; // Import the correct enums

// --- Environment Variable Check ---
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: Missing GOOGLE_API_KEY environment variable. AI Service cannot start.");
    // In a real app, you might want to prevent the app from starting or disable AI features gracefully.
    // For now, we throw an error during initialization.
    throw new Error("AI Service configuration is incomplete. GOOGLE_API_KEY is missing.");
}

// --- Initialize Google AI Client ---
const genAI = new GoogleGenerativeAI(apiKey);

// --- Select the Gemini 2.0 Flash model ---
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
});

// --- Define Valid Options Based on Schema ---
// Pass these to the AI to guide its response
const validTicketTypes = ticketTypeEcommerceEnum.enumValues;
const validPriorities = ticketPriorityEnum.enumValues;

// --- Define the Structure for AI Output ---
interface EmailAnalysisResult {
    ticketType: typeof validTicketTypes[number] | 'Other'; // Allow 'Other' as fallback
    orderNumber: string | null;
    trackingNumber: string | null;
    lotNumber: string | null; // NEW: Added lot number field
    summary: string; // For ticket title
    prioritySuggestion: typeof validPriorities[number]; // AI suggests priority
    sentiment: 'positive' | 'neutral' | 'negative' | null; // Optional sentiment
    likelyCustomerRequest: boolean; // NEW: AI's assessment
    classificationReason?: string; // NEW: Brief reason for classification
    intent: 'order_status_inquiry' | 'tracking_request' | 'return_request' | 'order_issue' | 'documentation_request' | 'quote_request' | 'purchase_order_submission' | 'general_inquiry' | 'other' | null;
}

// --- Configure Generation Settings ---
// Tell the model to respond in JSON format
const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    temperature: 0.4, // Lower temperature for more consistent results
    maxOutputTokens: 1024, // Optimize for our use case
    topP: 0.8, // Add topP for better response quality
    topK: 40, // Add topK for better response quality
};

// --- Configure Safety Settings ---
// Adjust blocking thresholds based on your tolerance for potentially sensitive content
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Analyzes email subject and body using Gemini 2.0 Flash to extract ticket information.
 * @param subject Email subject
 * @param body Email body (plain text preferred)
 * @returns A structured analysis result or null if analysis fails.
 */
export async function analyzeEmailContent(subject: string, body: string): Promise<EmailAnalysisResult | null> {
    // --- Construct the Prompt ---
    const prompt = `
        Analyze the following e-commerce customer support email subject and body to extract relevant information for a support ticket.

        **Valid Ticket Types:** ${validTicketTypes.join(', ')}, Other
        **Valid Priorities:** ${validPriorities.join(', ')}
        **Valid Intents:** order_status_inquiry, tracking_request, return_request, order_issue, documentation_request, quote_request, purchase_order_submission, general_inquiry, other

        **Email Subject:**
        ${subject}

        **Email Body:**
        ${body}

        **Instructions:**
        1.  Determine the primary **intent** from the valid list. If the user asks for tracking OR general status/delivery, use 'order_status_inquiry'. Use 'tracking_request' only if they ONLY ask for tracking.
        2.  Determine the most appropriate **ticketType** from the valid list. If none fit well, use "Other".
        3.  Extract the customer's **orderNumber**. It might look like #12345, ORD-67890, PO 12345, 3693, etc. Be flexible. If none is found, return null.
        4.  Extract any **trackingNumber**. If none is found, return null.
        5.  Extract any **lotNumber**. Look for patterns like LOT12345, Lot: ABCDE, L/N: ..., Lot Number: ..., etc. If none is found, return null.
        6.  Generate a concise **summary** (max 60 characters) suitable for a ticket title.
        7.  Suggest a **prioritySuggestion**. Default to "medium" if unsure. "high" for issues, "urgent" if explicitly stated.
        8.  Analyze the overall customer **sentiment** ('positive', 'neutral', 'negative'). Return null if unclear.
        9.  Classify if this email is likely a legitimate customer request requiring action (**likelyCustomerRequest**: true) or not (false).
        10. Provide a brief **classificationReason**.

        **Output Format:**
        Return **ONLY** a valid JSON object matching this structure:
        {
          "intent": "...",
          "ticketType": "...",
          "orderNumber": "..." | null,
          "trackingNumber": "..." | null,
          "lotNumber": "..." | null,
          "summary": "...",
          "prioritySuggestion": "...",
          "sentiment": "..." | null,
          "likelyCustomerRequest": true | false,
          "classificationReason": "..."
        }
    `;

    try {
        console.log(`AI Service: Sending request to Gemini 2.0 Flash for subject: "${subject.substring(0, 50)}..."`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });

        const responseText = result.response.text();
        console.log("AI Service: Raw Gemini Response Text:", responseText); // Log raw response for debugging

        if (!responseText) {
            console.error("AI Service Error: Gemini response was empty.");
            return null;
        }

        // --- Parse and Validate JSON Response ---
        let parsedResult: EmailAnalysisResult;
        try {
            // Clean potential markdown backticks if the model wraps the JSON
            const cleanedJson = responseText.replace(/^```json\s*|```$/g, '').trim();
            parsedResult = JSON.parse(cleanedJson);
        } catch (parseError) {
            console.error("AI Service Error: Failed to parse Gemini JSON response:", parseError);
            console.error("AI Service: Offending Text:", responseText); // Log the text that failed parsing
            return null; // Indicate failure
        }

        // Basic validation (could be more robust with Zod)
        if (
            !parsedResult ||
            typeof parsedResult.summary !== 'string' ||
            (!validTicketTypes.includes(parsedResult.ticketType as any) && parsedResult.ticketType !== 'Other') ||
            !validPriorities.includes(parsedResult.prioritySuggestion as any) ||
            typeof parsedResult.likelyCustomerRequest !== 'boolean' ||
            !['order_status_inquiry', 'tracking_request', 'return_request', 'order_issue', 'documentation_request', 'quote_request', 'purchase_order_submission', 'general_inquiry', 'other', null].includes(parsedResult.intent)
        ) {
            console.error("AI Service Error: Parsed JSON has invalid structure or enum values.", parsedResult);
            // Try to fix common issues before failing
            if (parsedResult && !validTicketTypes.includes(parsedResult.ticketType as any)) {
                parsedResult.ticketType = 'General Inquiry'; // Default if AI hallucinates type
            }
            if (parsedResult && !validPriorities.includes(parsedResult.prioritySuggestion as any)) {
                parsedResult.prioritySuggestion = 'medium'; // Default priority
            }
            // If still invalid after fixing, return null
            if (!parsedResult || !['order_status_inquiry', 'tracking_request', 'return_request', 'order_issue', 'documentation_request', 'quote_request', 'purchase_order_submission', 'general_inquiry', 'other', null].includes(parsedResult.intent)) {
                console.error("AI Service Error: Could not recover - Invalid intent or other core fields missing.");
                return null;
            }
            console.warn("AI Service Warning: Recovered from minor validation issue in AI response.");
        }

        // Ensure 'Other'/'General Inquiry' is handled
        if (!validTicketTypes.includes(parsedResult.ticketType as any)) {
            parsedResult.ticketType = 'General Inquiry'; // Or 'Other'
        }

        console.log("AI Service: Successfully parsed analysis:", parsedResult);
        return parsedResult;

    } catch (error: any) {
        console.error("AI Service Error: Error calling Gemini API:", error.message || error);
        // Log detailed error if available (e.g., safety blocks)
        if (error.response?.promptFeedback) {
            console.error("AI Safety Feedback:", error.response.promptFeedback);
        }
        return null; // Indicate failure
    }
} 