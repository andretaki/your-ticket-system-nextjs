// src/lib/graphService.ts
import 'dotenv/config';
import { ClientSecretCredential } from '@azure/identity';
import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Message, MailFolder, InternetMessageHeader } from '@microsoft/microsoft-graph-types';

// Load environment variables
const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;
const userEmail = process.env.MICROSOFT_GRAPH_USER_EMAIL || 'sales@alliancechemical.com';

// Validate required environment variables
if (!tenantId || !clientId || !clientSecret) {
  console.error('Missing required Microsoft Graph environment variables.');
  throw new Error('Microsoft Graph configuration is incomplete. Check your .env file.');
}

// Create credential and authentication provider
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
});

// Initialize Microsoft Graph client
const graphClient = Client.initWithMiddleware({
  authProvider,
  defaultVersion: 'v1.0'
});

/**
 * Get unread emails from the inbox
 * @param limit Maximum number of emails to fetch
 * @returns Array of unread Message objects
 */
export async function getUnreadEmails(limit = 20): Promise<Message[]> {
  try {
    const response = await graphClient
      .api(`/users/${userEmail}/mailFolders/inbox/messages`)
      .filter('isRead eq false')
      .top(limit)
      .get();

    return response.value as Message[];
  } catch (error) {
    console.error('Error fetching unread emails:', error);
    throw error;
  }
}

/**
 * Mark an email as read
 * @param messageId The ID of the email to mark as read
 */
export async function markEmailAsRead(messageId: string): Promise<void> {
  try {
    await graphClient
      .api(`/users/${userEmail}/messages/${messageId}`)
      .update({
        isRead: true
      });
  } catch (error) {
    console.error(`Error marking email ${messageId} as read:`, error);
    throw error;
  }
}

/**
 * Move an email to a different folder
 * @param messageId The ID of the email to move
 * @param destinationFolderId The ID of the destination folder
 */
// export async function moveEmail(messageId: string, destinationFolderId: string): Promise<void> {
//   try {
//     await graphClient
//       .api(`/users/${userEmail}/messages/${messageId}/move`)
//       .post({
//         destinationId: destinationFolderId
//       });
//   } catch (error) {
//     console.error(`Error moving email ${messageId} to folder ${destinationFolderId}:`, error);
//     throw error;
//   }
// }

/**
 * Get the ID of a mail folder by name
 * @param folderName The name of the folder to find
 * @returns The folder ID, or null if not found
 */
// export async function getFolderId(folderName: string): Promise<string | null> {
//   try {
//     const response = await graphClient
//       .api(`/users/${userEmail}/mailFolders`)
//       .filter(`displayName eq '${folderName}'`)
//       .get();

//     const folders = response.value as MailFolder[];
//     if (folders && folders.length > 0) {
//       return folders[0].id || null;
//     }
//     return null;
//   } catch (error) {
//     console.error(`Error finding folder ID for "${folderName}":`, error);
//     throw error;
//   }
// }

/**
 * Create a mail folder if it doesn't exist
 * @param folderName The name of the folder to create
 * @returns The ID of the created or existing folder
 */
// export async function createFolderIfNotExists(folderName: string): Promise<string> {
//   try {
//     // First check if folder exists
//     const existingId = await getFolderId(folderName);
//     if (existingId) {
//       return existingId;
//     }

//     // Create folder if it doesn't exist
//     const response = await graphClient
//       .api(`/users/${userEmail}/mailFolders`)
//       .post({
//         displayName: folderName
//       });

//     return response.id;
//   } catch (error) {
//     console.error(`Error creating folder "${folderName}":`, error);
//     throw error;
//   }
// }

interface ThreadingInfo {
  inReplyToId?: string | null;
  referencesIds?: string[] | null;
  conversationId?: string | null;
}

/**
 * Sends an email reply using Microsoft Graph API, using provided threading information.
 * @param toEmailAddress The recipient's email address.
 * @param subject The subject of the reply email.
 * @param messageContent The HTML content of the reply.
 * @param threadingInfo Object containing inReplyToId, referencesIds, conversationId or a Message object.
 * @param fromEmailAddress The email address to send from (e.g., your shared mailbox).
 * @returns The sent message object or null if sending fails.
 */
export async function sendEmailReply(
  toEmailAddress: string,
  subject: string,
  messageContent: string, 
  threadingInfo: ThreadingInfo | Message,
  fromEmailAddress: string = userEmail
): Promise<Message | null> {
  try {
    // --- Construct Threading Headers ---
    const internetMessageHeaders: InternetMessageHeader[] = [];
    
    if ('internetMessageId' in threadingInfo) {
      // Handle legacy Message object format for backward compatibility
      const originalMessage = threadingInfo as Message;
      
      if (originalMessage.internetMessageId) {
        internetMessageHeaders.push({
          name: 'In-Reply-To',
          value: `<${originalMessage.internetMessageId}>`
        });
        console.log(`GraphService: Setting In-Reply-To: <${originalMessage.internetMessageId}>`);
        
        // Add References header using existing references + current message ID
        const existingRefs = (originalMessage.internetMessageHeaders as InternetMessageHeader[] | undefined)?.find(
          h => h.name === 'References' || h.name === 'X-References'
        )?.value || '';
        
        internetMessageHeaders.push({
          name: 'References',
          value: `${existingRefs} <${originalMessage.internetMessageId}>`.trim()
        });
        console.log(`GraphService: Setting References: ${internetMessageHeaders.find(h => h.name === 'References')?.value}`);
      }
    } else {
      // Handle new ThreadingInfo interface
      const threading = threadingInfo as ThreadingInfo;
      
      if (threading.inReplyToId) {
        internetMessageHeaders.push({
          name: 'In-Reply-To',
          value: `<${threading.inReplyToId}>`
        });
        console.log(`GraphService: Setting In-Reply-To: <${threading.inReplyToId}>`);
      }
      
      if (threading.referencesIds && threading.referencesIds.length > 0) {
        const referencesValue = threading.referencesIds.map(id => `<${id}>`).join(' ');
        internetMessageHeaders.push({
          name: 'References',
          value: referencesValue
        });
        console.log(`GraphService: Setting References: ${referencesValue}`);
      } else if (threading.inReplyToId) {
        // If only In-Reply-To is available, use it for References as well
        internetMessageHeaders.push({
          name: 'References',
          value: `<${threading.inReplyToId}>`
        });
        console.log(`GraphService: Setting References based on In-Reply-To: <${threading.inReplyToId}>`);
      }
    }
    // --- End Construct Threading Headers ---

    // No conversion needed - directly use the provided HTML
    const htmlContent = messageContent;

    // Define the message request structure inline
    const replyMessage = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: toEmailAddress,
            },
          },
        ],
        // Add the constructed standard headers
        internetMessageHeaders: internetMessageHeaders.length > 0 ? internetMessageHeaders : undefined,
      },
      saveToSentItems: true,
    };

    // Log the reply being sent
    console.log(`GraphService: Attempting to send email reply to ${toEmailAddress} from ${fromEmailAddress} with subject "${subject}"`);

    // Use the /sendMail action
    const response = await graphClient
      .api(`/users/${fromEmailAddress}/sendMail`)
      .post(replyMessage);

    console.log(`GraphService: Email reply sent successfully. Response indicates success (actual message object not returned by sendMail).`);
    // sendMail action doesn't return the full message object immediately
    return { id: 'sent' } as Message; // Return a minimal success indicator

  } catch (error: any) {
    console.error('GraphService: Error sending email reply:', JSON.stringify(error, null, 2));
    // More detailed error logging
    if (error.details) console.error('GraphService Error Details:', error.details);
    if (error.code) console.error(`GraphService Error Code: ${error.code}`);
    return null;
  }
}

/**
 * Get a specific email message by its ID.
 * @param messageId The ID of the message.
 * @returns The Message object or null if not found/error.
 */
export async function getMessageById(messageId: string): Promise<Message | null> {
  try {
    const message = await graphClient
      .api(`/users/${userEmail}/messages/${messageId}`)
      // Select only the fields you need to reduce payload size
      .select('id,subject,body,bodyPreview,sender,from,toRecipients,ccRecipients,bccRecipients,internetMessageId,conversationId,createdDateTime,receivedDateTime,isRead,importance,parentFolderId,internetMessageHeaders')
      .get();
    return message as Message;
  } catch (error) {
    console.error(`Error fetching message by ID ${messageId}:`, error);
    return null;
  }
}

/**
 * Creates a new Microsoft Graph subscription for new emails with direct parameters.
 * @param notificationUrl The URL of your webhook endpoint.
 * @param clientState A secret string for validation (optional but recommended).
 * @returns The created subscription object or null.
 */
export async function createEmailSubscription(
  notificationUrl: string,
  clientState?: string
): Promise<any | null> {
  const expirationDateTime = new Date();
  expirationDateTime.setDate(expirationDateTime.getDate() + 2); // Expires in 2 days (adjust as needed, max usually 3 for mail)

  const subscription = {
    changeType: 'created',
    notificationUrl: notificationUrl,
    resource: `/users/${userEmail}/mailFolders/inbox/messages`, // Or just /users/${userEmail}/messages
    expirationDateTime: expirationDateTime.toISOString(),
    clientState: clientState || process.env.MICROSOFT_GRAPH_WEBHOOK_SECRET || "DefaultSecretState", // Use a secret
    latestSupportedTlsVersion: "v1_2" // Recommended by Microsoft
  };

  try {
    console.log('Attempting to create subscription:', JSON.stringify(subscription, null, 2));
    const response = await graphClient
      .api('/subscriptions')
      .post(subscription);
    console.log('Subscription created successfully:', response);
    return response;
  } catch (error: any) {
    console.error('Error creating subscription:', JSON.stringify(error, null, 2));
    if (error.body) {
        try {
            const errorBody = JSON.parse(error.body);
            console.error('Error details:', errorBody.error);
        } catch (e) {
            console.error('Error body:', error.body);
        }
    }
    return null;
  }
}

/**
 * Renews an existing Microsoft Graph subscription.
 * @param subscriptionId The ID of the subscription to renew.
 * @returns The updated subscription object or null.
 */
export async function renewSubscription(subscriptionId: string): Promise<any | null> {
  const newExpirationDateTime = new Date();
  newExpirationDateTime.setDate(newExpirationDateTime.getDate() + 2); // Renew for another 2 days

  try {
    const response = await graphClient
      .api(`/subscriptions/${subscriptionId}`)
      .update({
        expirationDateTime: newExpirationDateTime.toISOString()
      });
    console.log(`Subscription ${subscriptionId} renewed successfully:`, response);
    return response;
  } catch (error: any) {
    console.error(`Error renewing subscription ${subscriptionId}:`, error);
    if (error.body) {
      try {
        const errorBody = JSON.parse(error.body);
        console.error('Error details:', errorBody.error);
      } catch (e) {
        console.error('Error body:', error.body);
      }
    }
    return null;
  }
}

/**
 * Lists all active subscriptions for the application.
 * @returns Array of subscription objects.
 */
export async function listSubscriptions(): Promise<any[]> {
  try {
    const response = await graphClient.api('/subscriptions').get();
    return response.value || [];
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    return [];
  }
}

/**
 * Deletes a specific subscription.
 * @param subscriptionId The ID of the subscription to delete.
 * @returns True if successful, false otherwise.
 */
export async function deleteSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await graphClient.api(`/subscriptions/${subscriptionId}`).delete();
    console.log(`Subscription ${subscriptionId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`Error deleting subscription ${subscriptionId}:`, error);
    return false;
  }
} 