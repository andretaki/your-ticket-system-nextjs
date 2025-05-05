import { relations } from "drizzle-orm/relations";
import { products, productPricing, productDescriptions, coas, tickets, comments, projects, users, chemicals, inventoryTransactions, lotNumbers, rfqSummaries, rfqSubmissions, emails, orderStatusRequests, emailAttachments, rfqRequests, coaRequests, freightDeals, freightFiles, bossEmails, emailChunks, ragDataSources, ragDocuments, ragChunks, returnItems, returnPhotos, returns, returnAuditLogs, poPricingData, documents, chunks, conversations, messages, sessions, ticketComments } from "./schema";

export const productPricingRelations = relations(productPricing, ({one}) => ({
	product: one(products, {
		fields: [productPricing.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	productPricings: many(productPricing),
	productDescriptions: many(productDescriptions),
	coas: many(coas),
	lotNumbers: many(lotNumbers),
	poPricingData: many(poPricingData),
}));

export const productDescriptionsRelations = relations(productDescriptions, ({one}) => ({
	product: one(products, {
		fields: [productDescriptions.productId],
		references: [products.id]
	}),
}));

export const coasRelations = relations(coas, ({one}) => ({
	product: one(products, {
		fields: [coas.productId],
		references: [products.id]
	}),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	ticket: one(tickets, {
		fields: [comments.ticketId],
		references: [tickets.id]
	}),
}));

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	comments: many(comments),
	project: one(projects, {
		fields: [tickets.projectId],
		references: [projects.id]
	}),
	user_assigneeId: one(users, {
		fields: [tickets.assigneeId],
		references: [users.id],
		relationName: "tickets_assigneeId_users_id"
	}),
	user_reporterId: one(users, {
		fields: [tickets.reporterId],
		references: [users.id],
		relationName: "tickets_reporterId_users_id"
	}),
	ticketComments: many(ticketComments),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	tickets: many(tickets),
}));

export const usersRelations = relations(users, ({many}) => ({
	tickets_assigneeId: many(tickets, {
		relationName: "tickets_assigneeId_users_id"
	}),
	tickets_reporterId: many(tickets, {
		relationName: "tickets_reporterId_users_id"
	}),
	sessions_userId: many(sessions, {
		relationName: "sessions_userId_users_id"
	}),
	sessions_userId: many(sessions, {
		relationName: "sessions_userId_users_id"
	}),
	ticketComments: many(ticketComments),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one}) => ({
	chemical: one(chemicals, {
		fields: [inventoryTransactions.chemicalId],
		references: [chemicals.id]
	}),
}));

export const chemicalsRelations = relations(chemicals, ({many}) => ({
	inventoryTransactions: many(inventoryTransactions),
}));

export const lotNumbersRelations = relations(lotNumbers, ({one}) => ({
	product: one(products, {
		fields: [lotNumbers.productId],
		references: [products.id]
	}),
}));

export const rfqSubmissionsRelations = relations(rfqSubmissions, ({one}) => ({
	rfqSummary: one(rfqSummaries, {
		fields: [rfqSubmissions.rfqId],
		references: [rfqSummaries.id]
	}),
}));

export const rfqSummariesRelations = relations(rfqSummaries, ({many}) => ({
	rfqSubmissions: many(rfqSubmissions),
}));

export const orderStatusRequestsRelations = relations(orderStatusRequests, ({one}) => ({
	email: one(emails, {
		fields: [orderStatusRequests.emailId],
		references: [emails.id]
	}),
}));

export const emailsRelations = relations(emails, ({many}) => ({
	orderStatusRequests: many(orderStatusRequests),
	emailAttachments: many(emailAttachments),
	rfqRequests: many(rfqRequests),
	coaRequests: many(coaRequests),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({one}) => ({
	email: one(emails, {
		fields: [emailAttachments.emailId],
		references: [emails.id]
	}),
}));

export const rfqRequestsRelations = relations(rfqRequests, ({one}) => ({
	email: one(emails, {
		fields: [rfqRequests.emailId],
		references: [emails.id]
	}),
}));

export const coaRequestsRelations = relations(coaRequests, ({one}) => ({
	email: one(emails, {
		fields: [coaRequests.emailId],
		references: [emails.id]
	}),
}));

export const freightFilesRelations = relations(freightFiles, ({one}) => ({
	freightDeal: one(freightDeals, {
		fields: [freightFiles.dealId],
		references: [freightDeals.id]
	}),
}));

export const freightDealsRelations = relations(freightDeals, ({many}) => ({
	freightFiles: many(freightFiles),
}));

export const emailChunksRelations = relations(emailChunks, ({one}) => ({
	bossEmail: one(bossEmails, {
		fields: [emailChunks.emailId],
		references: [bossEmails.emailId]
	}),
}));

export const bossEmailsRelations = relations(bossEmails, ({many}) => ({
	emailChunks: many(emailChunks),
}));

export const ragDocumentsRelations = relations(ragDocuments, ({one, many}) => ({
	ragDataSource: one(ragDataSources, {
		fields: [ragDocuments.dataSourceId],
		references: [ragDataSources.id]
	}),
	ragChunks: many(ragChunks),
}));

export const ragDataSourcesRelations = relations(ragDataSources, ({many}) => ({
	ragDocuments: many(ragDocuments),
}));

export const ragChunksRelations = relations(ragChunks, ({one}) => ({
	ragDocument: one(ragDocuments, {
		fields: [ragChunks.documentId],
		references: [ragDocuments.id]
	}),
}));

export const returnPhotosRelations = relations(returnPhotos, ({one}) => ({
	returnItem: one(returnItems, {
		fields: [returnPhotos.returnItemId],
		references: [returnItems.id]
	}),
}));

export const returnItemsRelations = relations(returnItems, ({one, many}) => ({
	returnPhotos: many(returnPhotos),
	return: one(returns, {
		fields: [returnItems.returnId],
		references: [returns.id]
	}),
}));

export const returnAuditLogsRelations = relations(returnAuditLogs, ({one}) => ({
	return: one(returns, {
		fields: [returnAuditLogs.returnId],
		references: [returns.id]
	}),
}));

export const returnsRelations = relations(returns, ({many}) => ({
	returnAuditLogs: many(returnAuditLogs),
	returnItems: many(returnItems),
}));

export const poPricingDataRelations = relations(poPricingData, ({one}) => ({
	product: one(products, {
		fields: [poPricingData.productGid],
		references: [products.id]
	}),
}));

export const chunksRelations = relations(chunks, ({one, many}) => ({
	document: one(documents, {
		fields: [chunks.documentId],
		references: [documents.id]
	}),
	chunk: one(chunks, {
		fields: [chunks.parentChunkId],
		references: [chunks.id],
		relationName: "chunks_parentChunkId_chunks_id"
	}),
	chunks: many(chunks, {
		relationName: "chunks_parentChunkId_chunks_id"
	}),
}));

export const documentsRelations = relations(documents, ({many}) => ({
	chunks: many(chunks),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({many}) => ({
	messages: many(messages),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user_userId: one(users, {
		fields: [sessions.userId],
		references: [users.id],
		relationName: "sessions_userId_users_id"
	}),
	user_userId: one(users, {
		fields: [sessions.userId],
		references: [users.id],
		relationName: "sessions_userId_users_id"
	}),
}));

export const ticketCommentsRelations = relations(ticketComments, ({one}) => ({
	ticket: one(tickets, {
		fields: [ticketComments.ticketId],
		references: [tickets.id]
	}),
	user: one(users, {
		fields: [ticketComments.commenterId],
		references: [users.id]
	}),
}));