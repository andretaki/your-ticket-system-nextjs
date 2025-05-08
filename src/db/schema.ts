// src/db/schema.ts
import { serial, text, timestamp, varchar, pgEnum, integer, boolean, unique, pgSchema, primaryKey, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import crypto from 'crypto'; // For UUID generation

// Define your PostgreSQL schema object
export const ticketingProdSchema = pgSchema('ticketing_prod');

// --- Enums ---
export const ticketStatusEnum = ticketingProdSchema.enum('ticket_status_enum', ['new', 'open', 'in_progress', 'pending_customer', 'closed']);
export const ticketPriorityEnum = ticketingProdSchema.enum('ticket_priority_enum', ['low', 'medium', 'high', 'urgent']);
export const userRoleEnum = ticketingProdSchema.enum('user_role', ['admin', 'manager', 'user']);
export const ticketingRoleEnum = ticketingProdSchema.enum('ticketing_role_enum', ['Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other']);
export const ticketTypeEcommerceEnum = ticketingProdSchema.enum('ticket_type_ecommerce_enum', [
    'Return', 'Shipping Issue', 'Order Issue', 'New Order', 'Credit Request',
    'COA Request', 'COC Request', 'SDS Request', 'Quote Request', 'Purchase Order', 'General Inquiry', 'Test Entry'
]);
export const ticketSentimentEnum = ticketingProdSchema.enum('ticket_sentiment_enum', ['positive', 'neutral', 'negative']);

// --- Canned Responses Table ---
export const cannedResponses = ticketingProdSchema.table('canned_responses', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull().unique(), // Short title for selection
  content: text('content').notNull(), // The actual response text/HTML
  category: varchar('category', { length: 50 }), // Optional categorization
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdById: text('created_by_id').references(() => users.id), // Optional: track who created it
});

// --- Auth.js Tables (within ticketing_prod schema) ---
export const users = ticketingProdSchema.table('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // User ID is TEXT (UUID)
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }), // Password can be null for external/OAuth users
  name: varchar('name', { length: 255 }),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
  role: userRoleEnum('role').default('user').notNull(),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  ticketingRole: ticketingRoleEnum('ticketing_role'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isExternal: boolean('is_external').default(false).notNull(),
});

export const accounts = ticketingProdSchema.table(
  'accounts',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // References TEXT user ID
    type: text('type').$type<"oauth" | "oidc" | "email" | "credentials">().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = ticketingProdSchema.table('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // References TEXT user ID
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = ticketingProdSchema.table(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);


// --- Your Application Tables (within ticketing_prod schema) ---

export const tickets = ticketingProdSchema.table('tickets', {
  id: serial('id').primaryKey(), // Tickets can keep serial ID
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: ticketStatusEnum('status').default('new').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  type: ticketTypeEcommerceEnum('type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),      // References TEXT user ID
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'set null' }), // References TEXT user ID
  orderNumber: varchar('order_number', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 255 }),
  senderEmail: varchar('sender_email', { length: 255 }),
  senderName: varchar('sender_name', { length: 255 }),
  senderPhone: varchar('sender_phone', { length: 20 }), // Added phone field
  externalMessageId: varchar('external_message_id', { length: 255 }).unique(),
  conversationId: text('conversation_id'), // <-- Added conversationId column (nullable)
  sentiment: ticketSentimentEnum('sentiment'), // Nullable sentiment
  ai_summary: text('ai_summary'), // Nullable AI-generated summary
  ai_suggested_assignee_id: text('ai_suggested_assignee_id').references(() => users.id, { onDelete: 'set null' }), // Nullable suggested assignee ID
}, (table) => {
  return {
    externalMessageIdKey: unique('tickets_mailgun_message_id_key').on(table.externalMessageId),
    // Optional: Index on conversationId if you added it via SQL
    conversationIdIndex: unique('idx_tickets_conversation_id').on(table.conversationId),
  };
});

export const ticketComments = ticketingProdSchema.table('ticket_comments', {
  id: serial('id').primaryKey(), // Comments can keep serial ID
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  commentText: text('comment_text').notNull(),
  commenterId: text('commenter_id').references(() => users.id, { onDelete: 'set null' }), // References TEXT user ID
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isFromCustomer: boolean('is_from_customer').default(false).notNull(),
  isInternalNote: boolean('is_internal_note').default(false).notNull(),
  isOutgoingReply: boolean('is_outgoing_reply').default(false).notNull(),
  externalMessageId: varchar('external_message_id', { length: 255 }).unique(),
}, (table) => {
  return {
    externalMessageIdKey: unique('ticket_comments_mailgun_message_id_key').on(table.externalMessageId),
  };
});

export const subscriptions = ticketingProdSchema.table('subscriptions', {
  id: serial('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull().unique(),
  resource: text('resource').notNull(),
  changeType: text('change_type').notNull(),
  notificationUrl: text('notification_url').notNull(),
  expirationDateTime: timestamp('expiration_datetime', { withTimezone: true }).notNull(),
  clientState: text('client_state'),
  creatorId: text('creator_id').notNull(), // Changed from integer to text if creator can be system/UUID
  isActive: boolean('is_active').default(true).notNull(),
  renewalCount: integer('renewal_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ticketAttachments = ticketingProdSchema.table('ticket_attachments', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(), // Size in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  storagePath: varchar('storage_path', { length: 500 }).notNull(), // Path to where the file is stored
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => ticketComments.id, { onDelete: 'cascade' }),
  uploaderId: text('uploader_id').references(() => users.id, { onDelete: 'set null' }), // References TEXT user ID
});

// --- Relations ---
// (Relations should remain largely the same, just ensure they reference the correct types)
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: 'TicketAssignee' }),
  suggestedTickets: many(tickets, { relationName: 'TicketAiSuggestedAssignee' }), // New relation for AI suggestion
  reportedTickets: many(tickets, { relationName: 'TicketReporter' }),
  comments: many(ticketComments, { relationName: 'UserComments' }),
  uploadedAttachments: many(ticketAttachments, { relationName: 'AttachmentUploader' }),
  accounts: many(accounts),
  sessions: many(sessions),
  reviewedQuarantinedEmails: many(quarantinedEmails),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'TicketAssignee',
  }),
  reporter: one(users, {
    fields: [tickets.reporterId],
    references: [users.id],
    relationName: 'TicketReporter',
  }),
  aiSuggestedAssignee: one(users, { // New relation for AI suggestion
    fields: [tickets.ai_suggested_assignee_id],
    references: [users.id],
    relationName: 'TicketAiSuggestedAssignee',
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments), // Existing relation
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  commenter: one(users, {
    fields: [ticketComments.commenterId],
    references: [users.id],
    relationName: 'UserComments' // Corrected relation name based on usersRelations
  }),
  attachments: many(ticketAttachments), // Existing relation
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAttachments.ticketId],
    references: [tickets.id],
    relationName: 'AttachmentTicket',
  }),
  comment: one(ticketComments, {
    fields: [ticketAttachments.commentId],
    references: [ticketComments.id],
    relationName: 'AttachmentComment',
  }),
  uploader: one(users, {
    fields: [ticketAttachments.uploaderId],
    references: [users.id],
    relationName: 'AttachmentUploader',
  }),
}));

// --- Quarantine Table ---
export const quarantineStatusEnum = ticketingProdSchema.enum('quarantine_status_enum', [
  'pending_review',
  'approved_ticket',
  'approved_comment',
  'rejected_spam',
  'rejected_vendor',
  'deleted'
]);

export const quarantinedEmails = ticketingProdSchema.table('quarantined_emails', {
  id: serial('id').primaryKey(),
  originalGraphMessageId: text('original_graph_message_id').notNull().unique(),
  internetMessageId: text('internet_message_id').notNull().unique(),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  bodyPreview: text('body_preview').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  aiClassification: boolean('ai_classification').notNull(),
  aiReason: text('ai_reason'),
  status: quarantineStatusEnum('status').default('pending_review').notNull(),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Add relations for quarantinedEmails
export const quarantinedEmailsRelations = relations(quarantinedEmails, ({ one }) => ({
  reviewer: one(users, {
    fields: [quarantinedEmails.reviewerId],
    references: [users.id],
  }),
}));