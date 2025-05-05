// src/db/schema.ts
import { pgTable, serial, text, timestamp, varchar, pgEnum, integer, boolean, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- Enums (Matching SQL Definitions) ---
export const ticketStatusEnum = pgEnum('ticket_status_enum', ['new', 'open', 'in_progress', 'pending_customer', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority_enum', ['low', 'medium', 'high', 'urgent']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'user']); // General access role
export const ticketingRoleEnum = pgEnum('ticketing_role_enum', ['Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other']); // Specific permissions for staff

// New Enum for E-commerce Ticket Types
export const ticketTypeEcommerceEnum = pgEnum('ticket_type_ecommerce_enum', [
    'Return',
    'Shipping Issue',
    'Order Issue',
    'New Order',
    'Credit Request',
    'COA Request',
    'COC Request',
    'SDS Request',
    'Quote Request',
    'General Inquiry'
    // Add 'Other' if needed as a fallback
]);

// --- Tables ---

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(), // REMEMBER TO HASH
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(), // Use defaultNow() for consistency
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: timestamp('email_verified'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  ticketingRole: ticketingRoleEnum('ticketing_role'), // Nullable for non-staff/customers
  // Add updatedAt for good practice, even if not in original SQL
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table (needed for API)
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  // displayId: varchar('display_id', { length: 10 }).notNull().unique(), // Keep if your app uses this separate ID
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'), // Nullable based on SQL
  status: ticketStatusEnum('status').default('new').notNull(),
  priority: ticketPriorityEnum('priority').default('medium').notNull(),
  type: ticketTypeEcommerceEnum('type'), // Using the new enum, nullable
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  assigneeId: integer('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'set null' }), // Kept notNull, adjust if needed
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }), // References projects table
  // --- E-commerce specific fields ---
  orderNumber: varchar('order_number', { length: 255 }), // Added
  trackingNumber: varchar('tracking_number', { length: 255 }), // Added
  // --- Email processing fields ---
  senderEmail: varchar('sender_email', { length: 255 }), // Made nullable
  senderName: varchar('sender_name', { length: 255 }),
  externalMessageId: varchar('external_message_id', { length: 255 }).unique(),
  // customerId: integer('customer_id'), // Removed, assuming reporterId covers customer link via users table for now
}, (table) => {
  return {
    // Re-declare unique constraints if needed, Drizzle might infer them from .unique() on column
    // displayIdKey: unique('tickets_ticket_id_key').on(table.displayId), // Only if using displayId
    externalMessageIdKey: unique('tickets_mailgun_message_id_key').on(table.externalMessageId), // Use constraint name from SQL
    // Add indexes explicitly if Drizzle doesn't automatically create sufficient ones
    // statusIdx: index("idx_tickets_status").on(table.status),
    // priorityIdx: index("idx_tickets_priority").on(table.priority),
    // assigneeIdx: index("idx_tickets_assignee_id").on(table.assigneeId),
    // reporterIdx: index("idx_tickets_reporter_id").on(table.reporterId),
  };
});

export const ticketComments = pgTable('ticket_comments', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  commentText: text('comment_text').notNull(), // Matching SQL column name
  commenterId: integer('commenter_id').references(() => users.id, { onDelete: 'set null' }), // Nullable based on SQL FK
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // Add updatedAt if you want to track comment edits
  // updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isFromCustomer: boolean('is_from_customer').default(false).notNull(),
  isInternalNote: boolean('is_internal_note').default(false).notNull(),
  externalMessageId: varchar('external_message_id', { length: 255 }).unique(), // Added unique constraint
}, (table) => {
  return {
    // Explicitly defining unique constraint name from SQL
    externalMessageIdKey: unique('ticket_comments_mailgun_message_id_key').on(table.externalMessageId),
    // Add indexes explicitly if needed
    // ticketIdx: index("idx_ticket_comments_ticket_id").on(table.ticketId),
    // commenterIdx: index("idx_ticket_comments_commenter_id").on(table.commenterId),
  };
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().notNull(),
  resource: text('resource').notNull(),
  expirationDatetime: timestamp('expiration_datetime').notNull(), // Use correct name from SQL
  clientState: text('client_state'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: 'TicketAssignee' }),
  reportedTickets: many(tickets, { relationName: 'TicketReporter' }),
  comments: many(ticketComments, { relationName: 'UserComments' }),
}));

// Projects relations
export const projectsRelations = relations(projects, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
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

// No relations needed for subscriptions table in this context