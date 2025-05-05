// This file will be populated with your database schema
// You can run the introspect command to generate schema from your existing database
// or manually define your schema here

import { pgTable, serial, text, timestamp, varchar, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const statusEnum = pgEnum('status', ['open', 'in_progress', 'resolved', 'closed']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tickets table
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: statusEnum.enumValues }).notNull().default(statusEnum.enumValues[0]),
  priority: text('priority', { enum: priorityEnum.enumValues }).notNull().default(priorityEnum.enumValues[1]),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  assigneeId: integer('assignee_id').references(() => users.id),
  reporterId: integer('reporter_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Email-related fields for tickets created from emails
  senderEmail: text('sender_email'),
  senderName: text('sender_name'),
  externalMessageId: text('external_message_id'),
});

// Ticket comments table
export const ticketComments = pgTable('ticket_comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id),
  commenterId: integer('commenter_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products table (for e-commerce part)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Price in cents
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Product variants table
export const variants = pgTable('variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  price: integer('price'), // Optional override of base product price
  stock: integer('stock').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// === Drizzle Relations ===
export const usersRelations = relations(users, ({ many }) => ({
  assignedTickets: many(tickets, { relationName: 'assignedTickets' }),
  reportedTickets: many(tickets, { relationName: 'reportedTickets' }),
  comments: many(ticketComments, { relationName: 'commenterComments' }), // Explicit relation name
}));

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
    relationName: 'assignedTickets' // Match name in usersRelations
  }),
  reporter: one(users, {
    fields: [tickets.reporterId],
    references: [users.id],
    relationName: 'reportedTickets' // Match name in usersRelations
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
    relationName: 'commenterComments' // Match name in usersRelations
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
})); 