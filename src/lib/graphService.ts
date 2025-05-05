// src/lib/graphService.ts
import 'dotenv/config';
import { ClientSecretCredential } from '@azure/identity';
import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { Message, MailFolder } from '@microsoft/microsoft-graph-types';

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
export async function moveEmail(messageId: string, destinationFolderId: string): Promise<void> {
  try {
    await graphClient
      .api(`/users/${userEmail}/messages/${messageId}/move`)
      .post({
        destinationId: destinationFolderId
      });
  } catch (error) {
    console.error(`Error moving email ${messageId} to folder ${destinationFolderId}:`, error);
    throw error;
  }
}

/**
 * Get the ID of a mail folder by name
 * @param folderName The name of the folder to find
 * @returns The folder ID, or null if not found
 */
export async function getFolderId(folderName: string): Promise<string | null> {
  try {
    const response = await graphClient
      .api(`/users/${userEmail}/mailFolders`)
      .filter(`displayName eq '${folderName}'`)
      .get();

    const folders = response.value as MailFolder[];
    if (folders && folders.length > 0) {
      return folders[0].id || null;
    }
    return null;
  } catch (error) {
    console.error(`Error finding folder ID for "${folderName}":`, error);
    throw error;
  }
}

/**
 * Create a mail folder if it doesn't exist
 * @param folderName The name of the folder to create
 * @returns The ID of the created or existing folder
 */
export async function createFolderIfNotExists(folderName: string): Promise<string> {
  try {
    // First check if folder exists
    const existingId = await getFolderId(folderName);
    if (existingId) {
      return existingId;
    }

    // Create folder if it doesn't exist
    const response = await graphClient
      .api(`/users/${userEmail}/mailFolders`)
      .post({
        displayName: folderName
      });

    return response.id;
  } catch (error) {
    console.error(`Error creating folder "${folderName}":`, error);
    throw error;
  }
} 