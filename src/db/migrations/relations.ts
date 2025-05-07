import { relations } from "drizzle-orm/relations";
import { usersInTicketingProd, ticketsInTicketingProd, sessionsInTicketingProd, ticketCommentsInTicketingProd, accountsInTicketingProd } from "./schema";

export const ticketsInTicketingProdRelations = relations(ticketsInTicketingProd, ({one, many}) => ({
	usersInTicketingProd_assigneeId: one(usersInTicketingProd, {
		fields: [ticketsInTicketingProd.assigneeId],
		references: [usersInTicketingProd.id],
		relationName: "ticketsInTicketingProd_assigneeId_usersInTicketingProd_id"
	}),
	usersInTicketingProd_reporterId: one(usersInTicketingProd, {
		fields: [ticketsInTicketingProd.reporterId],
		references: [usersInTicketingProd.id],
		relationName: "ticketsInTicketingProd_reporterId_usersInTicketingProd_id"
	}),
	ticketCommentsInTicketingProds: many(ticketCommentsInTicketingProd),
}));

export const usersInTicketingProdRelations = relations(usersInTicketingProd, ({many}) => ({
	ticketsInTicketingProds_assigneeId: many(ticketsInTicketingProd, {
		relationName: "ticketsInTicketingProd_assigneeId_usersInTicketingProd_id"
	}),
	ticketsInTicketingProds_reporterId: many(ticketsInTicketingProd, {
		relationName: "ticketsInTicketingProd_reporterId_usersInTicketingProd_id"
	}),
	sessionsInTicketingProds: many(sessionsInTicketingProd),
	ticketCommentsInTicketingProds: many(ticketCommentsInTicketingProd),
	accountsInTicketingProds: many(accountsInTicketingProd),
}));

export const sessionsInTicketingProdRelations = relations(sessionsInTicketingProd, ({one}) => ({
	usersInTicketingProd: one(usersInTicketingProd, {
		fields: [sessionsInTicketingProd.userId],
		references: [usersInTicketingProd.id]
	}),
}));

export const ticketCommentsInTicketingProdRelations = relations(ticketCommentsInTicketingProd, ({one}) => ({
	ticketsInTicketingProd: one(ticketsInTicketingProd, {
		fields: [ticketCommentsInTicketingProd.ticketId],
		references: [ticketsInTicketingProd.id]
	}),
	usersInTicketingProd: one(usersInTicketingProd, {
		fields: [ticketCommentsInTicketingProd.commenterId],
		references: [usersInTicketingProd.id]
	}),
}));

export const accountsInTicketingProdRelations = relations(accountsInTicketingProd, ({one}) => ({
	usersInTicketingProd: one(usersInTicketingProd, {
		fields: [accountsInTicketingProd.userId],
		references: [usersInTicketingProd.id]
	}),
}));