// src/db/schema.ts
import { serial, text, timestamp, varchar, pgEnum, integer, boolean, unique, pgSchema, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm'; // sql import removed as it wasn't used directly here
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
    'COA Request', 'COC Request', 'SDS Request', 'Quote Request', 'General Inquiry', 'Test Entry'
]);

// --- Auth.js Tables (within ticketing_prod schema) ---
// Forward declaration for users table because accounts references it and users references accounts
export const users = ticketingProdSchema.table('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // User ID is TEXT (UUID)
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
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
  externalMessageId: varchar('external_message_id', { length: 255 }).unique(),
}, (table) => {
  return {
    externalMessageIdKey: unique('tickets_mailgun_message_id_key').on(table.externalMessageId),
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
  creatorId: text('creator_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  renewalCount: integer('renewal_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Relations ---
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: 'TicketAssignee' }),
  reportedTickets: many(tickets, { relationName: 'TicketReporter' }),
  comments: many(ticketComments, { relationName: 'UserComments' }),
  accounts: many(accounts),
  sessions: many(sessions),
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
  comments: many(ticketComments),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  commenter: one(users, {
    fields: [ticketComments.commenterId],
    references: [users.id],
    relationName: 'UserComments',
  }),
}));