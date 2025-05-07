import { pgTable, pgSchema, foreignKey, unique, serial, varchar, text, timestamp, integer, boolean, index, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const ticketingProd = pgSchema("ticketing_prod");
export const ticketPriorityEnumInTicketingProd = ticketingProd.enum("ticket_priority_enum", ['low', 'medium', 'high', 'urgent'])
export const ticketStatusEnumInTicketingProd = ticketingProd.enum("ticket_status_enum", ['new', 'open', 'in_progress', 'pending_customer', 'closed'])
export const ticketTypeEcommerceEnumInTicketingProd = ticketingProd.enum("ticket_type_ecommerce_enum", ['Return', 'Shipping Issue', 'Order Issue', 'New Order', 'Credit Request', 'COA Request', 'COC Request', 'SDS Request', 'Quote Request', 'General Inquiry', 'Test Entry'])
export const ticketingRoleEnumInTicketingProd = ticketingProd.enum("ticketing_role_enum", ['Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other'])
export const userRoleInTicketingProd = ticketingProd.enum("user_role", ['admin', 'manager', 'user'])


export const ticketsInTicketingProd = ticketingProd.table("tickets", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: ticketStatusEnumInTicketingProd().default('new').notNull(),
	priority: ticketPriorityEnumInTicketingProd().default('medium').notNull(),
	type: ticketTypeEcommerceEnumInTicketingProd(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	assigneeId: text("assignee_id"),
	reporterId: text("reporter_id").notNull(),
	orderNumber: varchar("order_number", { length: 255 }),
	trackingNumber: varchar("tracking_number", { length: 255 }),
	senderEmail: varchar("sender_email", { length: 255 }),
	senderName: varchar("sender_name", { length: 255 }),
	externalMessageId: varchar("external_message_id", { length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [usersInTicketingProd.id],
			name: "tickets_assignee_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [usersInTicketingProd.id],
			name: "tickets_reporter_id_users_id_fk"
		}).onDelete("set null"),
	unique("tickets_external_message_id_unique").on(table.externalMessageId),
	unique("tickets_mailgun_message_id_key").on(table.externalMessageId),
]);

export const sessionsInTicketingProd = ticketingProd.table("sessions", {
	sessionToken: text("session_token").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInTicketingProd.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const ticketCommentsInTicketingProd = ticketingProd.table("ticket_comments", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	commentText: text("comment_text").notNull(),
	commenterId: text("commenter_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isFromCustomer: boolean("is_from_customer").default(false).notNull(),
	isInternalNote: boolean("is_internal_note").default(false).notNull(),
	isOutgoingReply: boolean("is_outgoing_reply").default(false).notNull(),
	externalMessageId: varchar("external_message_id", { length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [ticketsInTicketingProd.id],
			name: "ticket_comments_ticket_id_tickets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.commenterId],
			foreignColumns: [usersInTicketingProd.id],
			name: "ticket_comments_commenter_id_users_id_fk"
		}).onDelete("set null"),
	unique("ticket_comments_external_message_id_unique").on(table.externalMessageId),
	unique("ticket_comments_mailgun_message_id_key").on(table.externalMessageId),
]);

export const usersInTicketingProd = ticketingProd.table("users", {
	id: text().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }),
	name: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	role: userRoleInTicketingProd().default('user').notNull(),
	emailVerified: timestamp("email_verified", { mode: 'string' }),
	resetToken: varchar("reset_token", { length: 255 }),
	resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'string' }),
	ticketingRole: ticketingRoleEnumInTicketingProd("ticketing_role"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isExternal: boolean("is_external").default(false).notNull(),
	image: text(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const subscriptionsInTicketingProd = ticketingProd.table("subscriptions", {
	id: serial().primaryKey().notNull(),
	subscriptionId: text("subscription_id").notNull(),
	resource: text().notNull(),
	changeType: text("change_type").notNull(),
	notificationUrl: text("notification_url").notNull(),
	expirationDatetime: timestamp("expiration_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	clientState: text("client_state"),
	creatorId: text("creator_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	renewalCount: integer("renewal_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_subscription_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_subscription_expiration").using("btree", table.expirationDatetime.asc().nullsLast().op("timestamptz_ops")),
	unique("subscriptions_subscription_id_unique").on(table.subscriptionId),
]);

export const verificationTokensInTicketingProd = ticketingProd.table("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_identifier_token_pk"}),
]);

export const accountsInTicketingProd = ticketingProd.table("accounts", {
	userId: text("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInTicketingProd.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "accounts_provider_provider_account_id_pk"}),
]);
