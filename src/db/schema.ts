// src/db/schema.ts
import { serial, text, timestamp, varchar, pgEnum, integer, boolean, unique, pgSchema } from 'drizzle-orm/pg-core'; // Remove pgTable, keep other imports
import { relations, sql } from 'drizzle-orm';

// Define your PostgreSQL schema object
export const ticketingProdSchema = pgSchema('ticketing_prod');

// --- Enums ---
// Define enums within the ticketing_prod schema to avoid conflicts with existing public enums
export const ticketStatusEnum = ticketingProdSchema.enum('ticket_status_enum', ['new', 'open', 'in_progress', 'pending_customer', 'closed']);
export const ticketPriorityEnum = ticketingProdSchema.enum('ticket_priority_enum', ['low', 'medium', 'high', 'urgent']);
export const userRoleEnum = ticketingProdSchema.enum('user_role', ['admin', 'manager', 'user']);
export const ticketingRoleEnum = ticketingProdSchema.enum('ticketing_role_enum', ['Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other']);
export const ticketTypeEcommerceEnum = ticketingProdSchema.enum('ticket_type_ecommerce_enum', [
    'Return', 'Shipping Issue', 'Order Issue', 'New Order', 'Credit Request',
    'COA Request', 'COC Request', 'SDS Request', 'Quote Request', 'General Inquiry', 'Test Entry'
]);

// --- Tables (use table method on schema object) ---
export const users = ticketingProdSchema.table('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }), // Nullable
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: timestamp('email_verified'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  ticketingRole: ticketingRoleEnum('ticketing_role'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isExternal: boolean('is_external').default(false).notNull(),
});

export const tickets = ticketingProdSchema.table('tickets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: ticketStatusEnum('status').default('new').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  type: ticketTypeEcommerceEnum('type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'set null' }),
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
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  commentText: text('comment_text').notNull(),
  commenterId: integer('commenter_id').references(() => users.id, { onDelete: 'set null' }),
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
  id: text('id').primaryKey().notNull(),
  resource: text('resource').notNull(),
  expirationDatetime: timestamp('expiration_datetime').notNull(),
  clientState: text('client_state'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Relations ---
// (Relations should still work correctly as Drizzle will understand they are within the same schema context)
export const usersRelations = relations(users, ({ many }) => ({
     assignedTickets: many(tickets, { relationName: 'TicketAssignee' }),
     reportedTickets: many(tickets, { relationName: 'TicketReporter' }),
     comments: many(ticketComments, { relationName: 'UserComments' }),
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