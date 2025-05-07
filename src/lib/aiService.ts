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
    summary: string; // For ticket title
    prioritySuggestion: typeof validPriorities[number]; // AI suggests priority
    sentiment: 'positive' | 'neutral' | 'negative' | null; // Optional sentiment
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

        **Email Subject:**
        ${subject}

        **Email Body:**
        ${body}

        **Instructions:**
        1.  Determine the most appropriate **ticketType** from the valid list. If none fit well, use "Other".
        2.  Extract the customer's **orderNumber**. It might look like #12345, ORD-67890, SO-555 etc. If none is found, return null.
        3.  Extract any **trackingNumber**. Common formats include long numbers (FedEx, UPS), or combinations like 1Z... (UPS). If none is found, return null.
        4.  Generate a concise **summary** (max 60 characters) suitable for a ticket title, capturing the main point of the email.
        5.  Suggest a **prioritySuggestion** based on the content. Look for words like "urgent", "important", "issue", "problem", or negative sentiment. Default to "medium" if unsure.
        6.  Analyze the overall customer **sentiment** ('positive', 'neutral', 'negative'). Return null if unclear.

        **Output Format:**
        Return **ONLY** a valid JSON object matching this structure:
        {
          "ticketType": "...",
          "orderNumber": "..." | null,
          "trackingNumber": "..." | null,
          "summary": "...",
          "prioritySuggestion": "...",
          "sentiment": "..." | null
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
            !validTicketTypes.includes(parsedResult.ticketType as any) && parsedResult.ticketType !== 'Other' ||
            !validPriorities.includes(parsedResult.prioritySuggestion as any)
        ) {
            console.error("AI Service Error: Parsed JSON does not match expected structure or has invalid enum values.", parsedResult);
            return null; // Indicate failure due to structure mismatch
        }

         // Ensure 'Other' is handled if the AI didn't pick a specific type
        if (!validTicketTypes.includes(parsedResult.ticketType as any)) {
            parsedResult.ticketType = 'Other';
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