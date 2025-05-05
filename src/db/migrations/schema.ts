import { pgTable, varchar, numeric, foreignKey, check, boolean, index, text, timestamp, unique, serial, integer, date, jsonb, uuid, doublePrecision, vector, json, smallint, bigint, pgView, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const emailCategory = pgEnum("email_category", ['RFQ', 'COA', 'ORDER_STATUS', 'OTHER'])
export const emailStatus = pgEnum("email_status", ['processed', 'pending', 'error'])
export const hazardLevel = pgEnum("hazard_level", ['corrosive', 'toxic', 'flammable', 'low'])
export const stockStatus = pgEnum("stock_status", ['critical', 'warning', 'normal'])
export const ticketPriorityEnum = pgEnum("ticket_priority_enum", ['low', 'medium', 'high', 'urgent'])
export const ticketStatusEnum = pgEnum("ticket_status_enum", ['new', 'open', 'in_progress', 'pending_customer', 'closed'])
export const ticketType = pgEnum("ticket_type", ['Bug/Error', 'Feature Request', 'Security', 'Other'])
export const ticketingRoleEnum = pgEnum("ticketing_role_enum", ['Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other'])
export const transactionType = pgEnum("transaction_type", ['received', 'shipped', 'adjusted'])
export const userRole = pgEnum("user_role", ['admin', 'manager', 'user'])

export const ticketDisplayIdSeq = pgSequence("ticket_display_id_seq", {  startWith: "1001", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const chemprice = pgTable("chemprice", {
	chemicalName: varchar("chemical_name", { length: 255 }),
	unit: varchar({ length: 50 }),
	pricePerPound: numeric("price_per_pound"),
	specificGravity: numeric("specific_gravity"),
	concentration: numeric(),
});

export const productPricing = pgTable("product_pricing", {
	productId: varchar("product_id", { length: 255 }).primaryKey().notNull(),
	title: varchar({ length: 255 }),
	pricingTier: varchar("pricing_tier", { length: 10 }),
	tierMarginMultiplier: numeric("tier_margin_multiplier", { precision: 10, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_pricing_product_id_fkey"
		}),
]);

export const option2Lookup = pgTable("option2_lookup", {
	option2Value: varchar("option2_value", { length: 255 }).primaryKey().notNull(),
	volume: numeric(),
	isLiquid: boolean("is_liquid"),
	laborPrice: numeric("labor_price", { precision: 10, scale:  2 }),
	containerPrice: numeric("container_price", { precision: 10, scale:  2 }),
	boxPrice: numeric("box_price", { precision: 10, scale:  2 }),
	weight: numeric({ precision: 10, scale:  2 }),
	baseMargin: numeric("base_margin", { precision: 10, scale:  2 }),
}, (table) => [
	check("option2_lookup_labor_price_check", sql`labor_price >= (0)::numeric`),
]);

export const products = pgTable("products", {
	id: varchar().primaryKey().notNull(),
	title: text().notNull(),
	pricePerPound: numeric("price_per_pound"),
	specificGravity: numeric("specific_gravity"),
}, (table) => [
	index("idx_products_title_trgm").using("gist", table.title.asc().nullsLast().op("gist_trgm_ops")),
]);

export const productDescriptions = pgTable("product_descriptions", {
	productId: varchar("product_id", { length: 255 }).primaryKey().notNull(),
	generatedDescription: text("generated_description"),
	seoTitle: text("seo_title"),
	seoDescription: text("seo_description"),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	generatedDescriptionHtml: text("generated_description_html"),
	form: varchar({ length: 255 }),
	grade: varchar({ length: 255 }),
	percentage: text(),
	casNumber: varchar("cas_number", { length: 100 }),
	formula: varchar({ length: 255 }),
	molecularWeight: text("molecular_weight"),
	boilingPoint: text("boiling_point"),
	meltingPoint: text("melting_point"),
	flashPoint: text("flash_point"),
	appearance: text(),
	solubility: text(),
	industry: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_descriptions_product_id_fkey"
		}),
]);

export const variants = pgTable("variants", {
	id: varchar().primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	title: text().notNull(),
	price: varchar(),
	sku: varchar(),
	option1: text(),
	option2: text(),
	option3: text(),
	calculatedPrice: numeric("calculated_price"),
	productTitle: text("product_title"),
	volume: numeric(),
	shopifyVariantId: varchar("shopify_variant_id"),
	cost: numeric(),
}, (table) => [
	index("idx_variants_product_id").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("idx_variants_shopify_id").using("btree", table.shopifyVariantId.asc().nullsLast().op("text_ops")).where(sql`(shopify_variant_id IS NOT NULL)`),
	index("idx_variants_shopify_variant_id").using("btree", table.shopifyVariantId.asc().nullsLast().op("text_ops")).where(sql`(shopify_variant_id IS NOT NULL)`),
	index("idx_variants_sku").using("btree", table.sku.asc().nullsLast().op("text_ops")).where(sql`(sku IS NOT NULL)`),
	unique("unique_shopify_variant_id").on(table.shopifyVariantId),
]);

export const oauthTokens = pgTable("oauth_tokens", {
	id: serial().primaryKey().notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const shipments = pgTable("shipments", {
	shipmentId: integer("shipment_id").primaryKey().notNull(),
	orderId: integer("order_id"),
	orderKey: varchar("order_key", { length: 255 }),
	userId: varchar("user_id", { length: 255 }),
	orderNumber: varchar("order_number", { length: 255 }),
	createDate: timestamp("create_date", { withTimezone: true, mode: 'string' }),
	shipDate: date("ship_date"),
	shipmentCost: numeric("shipment_cost", { precision: 10, scale:  2 }),
	insuranceCost: numeric("insurance_cost", { precision: 10, scale:  2 }),
	trackingNumber: varchar("tracking_number", { length: 255 }),
	isReturnLabel: boolean("is_return_label"),
	batchNumber: varchar("batch_number", { length: 255 }),
	carrierCode: varchar("carrier_code", { length: 50 }),
	serviceCode: varchar("service_code", { length: 50 }),
	packageCode: varchar("package_code", { length: 50 }),
	confirmation: varchar({ length: 50 }),
	warehouseId: integer("warehouse_id"),
	voided: boolean(),
	voidDate: timestamp("void_date", { withTimezone: true, mode: 'string' }),
	marketplaceNotified: boolean("marketplace_notified"),
	notifyErrorMessage: text("notify_error_message"),
	dimensions: jsonb(),
	advancedOptions: jsonb("advanced_options"),
	labelData: text("label_data"),
	formData: jsonb("form_data"),
	shipTo: jsonb("ship_to"),
	weight: jsonb(),
	insuranceOptions: jsonb("insurance_options"),
	shipmentItems: jsonb("shipment_items"),
}, (table) => [
	index("idx_shipments_carrier_code").using("btree", table.carrierCode.asc().nullsLast().op("text_ops")),
	index("idx_shipments_carrier_service").using("btree", table.carrierCode.asc().nullsLast().op("text_ops"), table.serviceCode.asc().nullsLast().op("text_ops")),
	index("idx_shipments_create_date").using("btree", table.createDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shipments_date_carrier").using("btree", table.shipDate.asc().nullsLast().op("text_ops"), table.carrierCode.asc().nullsLast().op("date_ops")),
	index("idx_shipments_insurance_options").using("gin", table.insuranceOptions.asc().nullsLast().op("jsonb_ops")),
	index("idx_shipments_marketplace_notified").using("btree", table.marketplaceNotified.asc().nullsLast().op("bool_ops")),
	index("idx_shipments_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	index("idx_shipments_package_code").using("btree", table.packageCode.asc().nullsLast().op("text_ops")),
	index("idx_shipments_service_code").using("btree", table.serviceCode.asc().nullsLast().op("text_ops")),
	index("idx_shipments_ship_date").using("btree", table.shipDate.asc().nullsLast().op("date_ops")),
	index("idx_shipments_ship_to").using("gin", table.shipTo.asc().nullsLast().op("jsonb_ops")),
	index("idx_shipments_shipment_items").using("gin", table.shipmentItems.asc().nullsLast().op("jsonb_ops")),
	index("idx_shipments_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_shipments_voided").using("btree", table.voided.asc().nullsLast().op("bool_ops")),
	index("idx_shipments_warehouse_id").using("btree", table.warehouseId.asc().nullsLast().op("int4_ops")),
	index("idx_shipments_weight").using("gin", table.weight.asc().nullsLast().op("jsonb_ops")),
]);

export const warehouseOutgoingChecklist = pgTable("warehouse_outgoing_checklist", {
	id: serial().primaryKey().notNull(),
	clientName: varchar({ length: 255 }).notNull(),
	datePerformed: date().notNull(),
	invoiceNumber: varchar({ length: 255 }).notNull(),
	orderType: varchar({ length: 255 }).notNull(),
	inspector: varchar({ length: 255 }).notNull(),
	lotNumbers: varchar({ length: 255 }).notNull(),
	preparedBy: varchar({ length: 255 }).notNull(),
	packingSlip: jsonb().notNull(),
	cofAs: jsonb().notNull(),
	inspectProducts: jsonb().notNull(),
	billOfLading: jsonb().notNull(),
	mistakes: varchar({ length: 255 }).notNull(),
	actionTaken: text(),
	comments: text(),
	attachmentName: varchar("attachment_name", { length: 255 }),
	attachmentUrl: varchar({ length: 1000 }),
});

export const coas = pgTable("coas", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id", { length: 255 }).notNull(),
	title: text(),
	uploadDate: timestamp("upload_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	s3Key: varchar("s3_key", { length: 255 }).notNull(),
	pdfUrl: varchar("pdf_url", { length: 1000 }),
	status: varchar({ length: 50 }).default('Uploaded').notNull(),
	versionId: varchar("version_id", { length: 255 }),
	rebrandedS3Key: varchar("rebranded_s3_key", { length: 255 }),
	rebrandedPdfUrl: varchar("rebranded_pdf_url", { length: 1000 }),
	processingStatus: varchar("processing_status", { length: 50 }).default('Pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	approvalStatus: varchar("approval_status", { length: 50 }).default('Pending').notNull(),
	processingError: text("processing_error"),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "coas_product_id_fkey"
		}).onDelete("cascade"),
]);

export const comments = pgTable("comments", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id"),
	author: varchar({ length: 100 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "comments_ticket_id_fkey"
		}),
]);

export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	displayId: varchar("display_id", { length: 10 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	status: ticketStatusEnum().default('new').notNull(),
	priority: ticketPriorityEnum().default('medium').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	assignedUserEmail: varchar("assigned_user_email", { length: 255 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	senderEmail: varchar("sender_email", { length: 255 }).notNull(),
	senderName: varchar("sender_name", { length: 255 }),
	bodyText: text("body_text"),
	bodyHtml: text("body_html"),
	externalMessageId: varchar("external_message_id", { length: 255 }),
	customerId: integer("customer_id"),
	type: ticketType(),
	projectId: integer("project_id"),
	assigneeId: integer("assignee_id"),
	reporterId: integer("reporter_id"),
}, (table) => [
	index("idx_tickets_assignee_id").using("btree", table.assigneeId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_priority").using("btree", table.priority.asc().nullsLast().op("enum_ops")),
	index("idx_tickets_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_reporter_id").using("btree", table.reporterId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "fk_tickets_project_id"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "fk_tickets_assignee_id"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "fk_tickets_reporter_id"
		}).onDelete("set null"),
	unique("tickets_ticket_id_key").on(table.displayId),
	unique("tickets_mailgun_message_id_key").on(table.externalMessageId),
]);

export const chemicals = pgTable("chemicals", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	concentration: varchar({ length: 20 }).notNull(),
	minStock: integer("min_stock").notNull(),
	maxStock: integer("max_stock").notNull(),
	currentStock: integer("current_stock").notNull(),
	hazardType: hazardLevel("hazard_type").notNull(),
	location: varchar({ length: 50 }).default('main'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_chemicals_current_stock").using("btree", table.currentStock.asc().nullsLast().op("int4_ops")),
	index("idx_chemicals_hazard_type").using("btree", table.hazardType.asc().nullsLast().op("enum_ops")),
	check("chemicals_min_stock_check", sql`min_stock >= 0`),
	check("chemicals_check", sql`max_stock > min_stock`),
	check("chemicals_current_stock_check", sql`current_stock >= 0`),
	check("stock_within_bounds", sql`current_stock <= max_stock`),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	chemicalId: uuid("chemical_id").notNull(),
	transactionType: transactionType("transaction_type").notNull(),
	quantity: integer().notNull(),
	previousStock: integer("previous_stock").notNull(),
	newStock: integer("new_stock").notNull(),
	transactionDate: timestamp("transaction_date", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	performedBy: varchar("performed_by", { length: 100 }).notNull(),
	notes: text(),
}, (table) => [
	index("idx_transactions_chemical_id").using("btree", table.chemicalId.asc().nullsLast().op("uuid_ops")),
	index("idx_transactions_date").using("btree", table.transactionDate.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.chemicalId],
			foreignColumns: [chemicals.id],
			name: "inventory_transactions_chemical_id_fkey"
		}),
]);

export const transactions = pgTable("transactions", {
	id: serial().primaryKey().notNull(),
	date: date(),
	transactionType: varchar("transaction_type", { length: 50 }),
	num: varchar({ length: 50 }),
	customer: varchar({ length: 100 }),
	productService: varchar("product_service", { length: 100 }),
	account: varchar({ length: 50 }),
	amount: numeric({ precision: 10, scale:  2 }),
	terms: varchar({ length: 50 }),
	invoiceNum: varchar("invoice_num", { length: 50 }),
	class: varchar({ length: 50 }),
});

export const variantIdMappings = pgTable("variant_id_mappings", {
	internalId: varchar("internal_id").notNull(),
	shopifyId: varchar("shopify_id").notNull(),
	sku: varchar().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const gs1 = pgTable("gs1", {
	gs1CompanyPrefix: varchar("gs1_company_prefix", { length: 50 }),
	gtin: varchar({ length: 50 }),
	gtin8: varchar("gtin_8", { length: 50 }),
	gtin12Upc: varchar("gtin_12_upc", { length: 50 }),
	gtin13Ean: varchar("gtin_13_ean", { length: 50 }),
	brandName: varchar("brand_name", { length: 255 }),
	brand1Language: varchar("brand_1_language", { length: 10 }),
	productDescription: text("product_description"),
	desc1Language: varchar("desc_1_language", { length: 10 }),
	productIndustry: varchar("product_industry", { length: 50 }),
	packagingLevel: varchar("packaging_level", { length: 50 }),
	isVariable: boolean("is_variable"),
	isPurchasable: boolean("is_purchasable"),
	statusLabel: varchar("status_label", { length: 50 }),
	height: numeric({ precision: 10, scale:  2 }),
	width: numeric({ precision: 10, scale:  2 }),
	depth: numeric({ precision: 10, scale:  2 }),
	dimensionMeasure: varchar("dimension_measure", { length: 20 }),
	grossWeight: numeric("gross_weight", { precision: 10, scale:  2 }),
	netWeight: numeric("net_weight", { precision: 10, scale:  2 }),
	weightMeasure: varchar("weight_measure", { length: 20 }),
	sku: varchar({ length: 50 }),
	subBrandName: varchar("sub_brand_name", { length: 255 }),
	productDescriptionShort: text("product_description_short"),
	labelDescription: text("label_description"),
	netContent1Count: numeric("net_content_1_count", { precision: 10, scale:  2 }),
	netContent1UnitOfMeasure: varchar("net_content_1_unit_of_measure", { length: 20 }),
	netContent2Count: numeric("net_content_2_count", { precision: 10, scale:  2 }),
	netContent2UnitOfMeasure: varchar("net_content_2_unit_of_measure", { length: 20 }),
	netContent3Count: numeric("net_content_3_count", { precision: 10, scale:  2 }),
	netContent3UnitOfMeasure: varchar("net_content_3_unit_of_measure", { length: 20 }),
	brandName2: varchar("brand_name_2", { length: 255 }),
	brand2Language: varchar("brand_2_language", { length: 10 }),
	description2: text("description_2"),
	desc2Language: varchar("desc_2_language", { length: 10 }),
	globalProductClassification: varchar("global_product_classification", { length: 50 }),
	imageUrl: text("image_url"),
	imageUrlValidation: boolean("image_url_validation"),
	targetMarkets: varchar("target_markets", { length: 50 }),
	lastModifiedDate: date("last_modified_date"),
});

export const amazonPricing = pgTable("amazon_pricing", {
	id: serial().primaryKey().notNull(),
	sellerSku: varchar("seller_sku", { length: 255 }),
	asin1: varchar({ length: 20 }),
	itemName: varchar("item_name", { length: 255 }),
	price: numeric({ precision: 10, scale:  2 }),
});

export const purchases = pgTable("purchases", {
	id: serial().primaryKey().notNull(),
	bolProNumber: varchar("bol_pro_number", { length: 255 }).notNull(),
	carrierBrokerInfo: varchar("carrier_broker_info", { length: 255 }).notNull(),
	brokerContactDetails: varchar("broker_contact_details", { length: 255 }).notNull(),
	pickupDate: date("pickup_date").notNull(),
	expectedDeliveryDate: date("expected_delivery_date").notNull(),
	productDescription: text("product_description").notNull(),
	receivingStatus: varchar("receiving_status", { length: 50 }).notNull(),
	received: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("purchases_receiving_status_check", sql`(receiving_status)::text = ANY ((ARRAY['pending'::character varying, 'received'::character varying, 'delayed'::character varying])::text[])`),
]);

export const labelRequests = pgTable("label_requests", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id", { length: 255 }),
	productName: text("product_name"),
	quantity: integer(),
	status: varchar({ length: 20 }).default('pending'),
	requestedAt: timestamp("requested_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	customRequest: boolean("custom_request").default(false),
	customDetails: text("custom_details"),
	requestedBy: varchar("requested_by", { length: 255 }),
	printedBy: varchar("printed_by", { length: 255 }),
	printedAt: timestamp("printed_at", { mode: 'string' }),
	lotNumber: varchar("lot_number", { length: 255 }),
	variantOption1: varchar("variant_option1", { length: 255 }),
	sku: varchar({ length: 255 }),
});

export const lotNumbers = pgTable("lot_numbers", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id", { length: 255 }).notNull(),
	month: varchar({ length: 20 }).notNull(),
	lotNumber: varchar("lot_number", { length: 255 }),
	year: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	productTitle: varchar("product_title", { length: 255 }).default('Default Title').notNull(),
	sku: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "lot_numbers_product_id_fkey"
		}),
	unique("unique_lot_number").on(table.productId, table.month, table.year),
]);

export const hazmatInfo = pgTable("hazmat_info", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	unNumber: varchar("un_number", { length: 20 }),
	hazardClass: varchar("hazard_class", { length: 50 }),
	packingGroup: varchar("packing_group", { length: 20 }),
	warningText: text("warning_text"),
	storageRequirements: text("storage_requirements"),
	ppeRequirements: text("ppe_requirements"),
	emergencyContact: text("emergency_contact"),
	requiredPictograms: jsonb("required_pictograms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	productTitle: text("product_title").notNull(),
	properShippingName: varchar("proper_shipping_name", { length: 255 }),
});

export const outreach = pgTable("outreach", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	cartId: varchar("cart_id", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	contactDate: timestamp("contact_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	salesStage: varchar("sales_stage", { length: 50 }),
	called: boolean().default(false).notNull(),
	emailed: boolean().default(false).notNull(),
	orderNumber: varchar("order_number", { length: 255 }),
	orderTotal: numeric("order_total", { precision: 10, scale:  2 }),
	orderDate: timestamp("order_date", { mode: 'string' }),
	notes: text(),
	lastEmailSentAt: timestamp("last_email_sent_at", { mode: 'string' }),
}, (table) => [
	unique("unique_cart_id").on(table.cartId),
]);

export const amazonGtins = pgTable("amazon_gtins", {
	itemSku: text("item_sku"),
	externalProductId: doublePrecision("external_product_id"),
	externalProductIdType: text("external_product_id_type"),
	itemName: text("item_name"),
});

export const abandonedCartOutreach = pgTable("abandoned_cart_outreach", {
	id: serial().primaryKey().notNull(),
	cartId: varchar("cart_id", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	called: boolean().default(false).notNull(),
	emailed: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastEmailSentAt: timestamp("last_email_sent_at", { mode: 'string' }),
}, (table) => [
	index("idx_abandoned_cart_outreach_cart_id").using("btree", table.cartId.asc().nullsLast().op("text_ops")),
	unique("abandoned_cart_outreach_cart_id_key").on(table.cartId),
]);

export const rfqSummaries = pgTable("rfq_summaries", {
	id: serial().primaryKey().notNull(),
	filename: text().notNull(),
	s3Url: text("s3_url").notNull(),
	summary: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	rfqNumber: varchar("rfq_number", { length: 50 }),
	vendor: varchar({ length: 255 }),
	requestDate: timestamp("request_date", { mode: 'string' }),
	s3Key: varchar("s3_key", { length: 255 }),
});

export const customerAddresses = pgTable("customer_addresses", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 255 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	address1: varchar({ length: 255 }).notNull(),
	address2: varchar({ length: 255 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 50 }).notNull(),
	postalCode: varchar("postal_code", { length: 20 }).notNull(),
	country: varchar({ length: 50 }).notNull(),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	postcardSent: boolean("postcard_sent").default(false),
	postcardSentAt: timestamp("postcard_sent_at", { mode: 'string' }),
}, (table) => [
	unique("unique_order_id").on(table.orderId),
]);

export const rfqSubmissions = pgTable("rfq_submissions", {
	id: serial().primaryKey().notNull(),
	filename: text().notNull(),
	originalPdfUrl: text("original_pdf_url"),
	completedPdfUrl: text("completed_pdf_url"),
	quoteRef: text("quote_ref"),
	firmUntil: timestamp("firm_until", { withTimezone: true, mode: 'string' }),
	paymentTerms: text("payment_terms"),
	authorizedSignature: text("authorized_signature"),
	signatureDate: timestamp("signature_date", { withTimezone: true, mode: 'string' }),
	deliveryDays: text("delivery_days"),
	minimumQtyRun: text("minimum_qty_run"),
	qtyUnitPack: text("qty_unit_pack"),
	iawNsn: text("iaw_nsn"),
	exceptionNote: text("exception_note"),
	priceBreaks: jsonb("price_breaks"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	formData: jsonb("form_data"),
	rfqId: integer("rfq_id").notNull(),
	nsn: varchar({ length: 50 }),
	bidPrice: numeric("bid_price", { precision: 10, scale:  2 }),
	quantity: integer(),
	notes: text(),
	s3Key: varchar("s3_key", { length: 255 }),
}, (table) => [
	index("idx_rfq_submissions_nsn").using("btree", table.nsn.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.rfqId],
			foreignColumns: [rfqSummaries.id],
			name: "rfq_submissions_rfq_id_fkey"
		}).onDelete("cascade"),
]);

export const cache = pgTable("cache", {
	key: text().primaryKey().notNull(),
	data: jsonb().default({}).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).default(sql`(now() + '30 days'::interval)`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_cache_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
]);

export const dashboardHistory = pgTable("dashboard_history", {
	id: serial().primaryKey().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	data: jsonb(),
}, (table) => [
	index("idx_dashboard_history_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
]);

export const orderStatusRequests = pgTable("order_status_requests", {
	id: serial().primaryKey().notNull(),
	emailId: integer("email_id").notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerCompany: varchar("customer_company", { length: 255 }),
	contactDetails: text("contact_details"),
	orderNumber: varchar("order_number", { length: 100 }),
	purchaseOrderNumber: varchar("purchase_order_number", { length: 100 }),
	orderDate: date("order_date"),
	inquiry: text(),
	urgency: varchar({ length: 50 }),
	status: varchar({ length: 50 }).default('new').notNull(),
	assignedTo: varchar("assigned_to", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_order_status_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [emails.id],
			name: "order_status_requests_email_id_fkey"
		}).onDelete("cascade"),
]);

export const emails = pgTable("emails", {
	id: serial().primaryKey().notNull(),
	messageId: varchar("message_id", { length: 255 }).notNull(),
	subject: text().notNull(),
	sender: varchar({ length: 255 }).notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	content: text().notNull(),
	category: emailCategory().notNull(),
	confidence: numeric({ precision: 5, scale:  2 }),
	status: emailStatus().default('pending').notNull(),
	processingDetails: jsonb("processing_details"),
	error: text(),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_emails_category").using("btree", table.category.asc().nullsLast().op("enum_ops")),
	index("idx_emails_received_at").using("btree", table.receivedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_emails_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	unique("unique_message_id").on(table.messageId),
]);

export const emailAttachments = pgTable("email_attachments", {
	id: serial().primaryKey().notNull(),
	emailId: integer("email_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileType: varchar("file_type", { length: 100 }),
	fileSize: integer("file_size"),
	s3Key: varchar("s3_key", { length: 255 }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [emails.id],
			name: "email_attachments_email_id_fkey"
		}).onDelete("cascade"),
]);

export const rfqRequests = pgTable("rfq_requests", {
	id: serial().primaryKey().notNull(),
	emailId: integer("email_id").notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerCompany: varchar("customer_company", { length: 255 }),
	contactDetails: text("contact_details"),
	requestDetails: jsonb("request_details"),
	products: jsonb(),
	timeframe: varchar({ length: 255 }),
	additionalRequirements: text("additional_requirements"),
	status: varchar({ length: 50 }).default('new').notNull(),
	assignedTo: varchar("assigned_to", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_rfq_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [emails.id],
			name: "rfq_requests_email_id_fkey"
		}).onDelete("cascade"),
]);

export const coaRequests = pgTable("coa_requests", {
	id: serial().primaryKey().notNull(),
	emailId: integer("email_id").notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerCompany: varchar("customer_company", { length: 255 }),
	contactDetails: text("contact_details"),
	products: jsonb(),
	urgency: varchar({ length: 50 }),
	additionalNotes: text("additional_notes"),
	status: varchar({ length: 50 }).default('new').notNull(),
	assignedTo: varchar("assigned_to", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_coa_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [emails.id],
			name: "coa_requests_email_id_fkey"
		}).onDelete("cascade"),
]);

export const coaDocuments = pgTable("coa_documents", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	originalFilename: varchar("original_filename", { length: 255 }).notNull(),
	standardizedName: varchar("standardized_name", { length: 255 }).notNull(),
	compoundName: varchar("compound_name", { length: 255 }).notNull(),
	casNumber: varchar("cas_number", { length: 50 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	issueDate: timestamp("issue_date", { mode: 'string' }),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	manufacturer: varchar({ length: 255 }),
	purityPercentage: numeric("purity_percentage", { precision: 5, scale:  2 }),
	documentType: varchar("document_type", { length: 100 }).default('COA'),
	metadata: jsonb().default({}).notNull(),
	testResults: jsonb("test_results").default({}).notNull(),
	storagePath: text("storage_path").notNull(),
	textContent: text("text_content"),
	processedByAi: boolean("processed_by_ai").default(true),
	aiConfidenceScore: numeric("ai_confidence_score", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	formattedPdfPath: text("formatted_pdf_path"),
}, (table) => [
	index("coa_batch_number_idx").using("btree", table.batchNumber.asc().nullsLast().op("text_ops")),
	index("coa_cas_number_idx").using("btree", table.casNumber.asc().nullsLast().op("text_ops")),
	index("coa_compound_name_idx").using("btree", table.compoundName.asc().nullsLast().op("text_ops")),
	index("coa_manufacturer_idx").using("btree", table.manufacturer.asc().nullsLast().op("text_ops")),
	index("coa_metadata_idx").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")),
	index("coa_test_results_idx").using("gin", table.testResults.asc().nullsLast().op("jsonb_ops")),
	index("coa_text_search_idx").using("gin", sql`to_tsvector('english'::regconfig, text_content)`),
]);

export const freightContacts = pgTable("freight_contacts", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	company: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	notes: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_freight_contacts_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_freight_contacts_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("unique_freight_email").on(table.email),
]);

export const processedEmailsLog = pgTable("processed_emails_log", {
	id: serial().primaryKey().notNull(),
	emailId: varchar("email_id", { length: 255 }).notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	status: varchar({ length: 50 }).notNull(),
	notes: text(),
}, (table) => [
	unique("processed_emails_log_email_id_key").on(table.emailId),
]);

export const freightDeals = pgTable("freight_deals", {
	id: serial().primaryKey().notNull(),
	brokerName: varchar("broker_name", { length: 255 }).notNull(),
	contactPerson: varchar("contact_person", { length: 255 }).notNull(),
	dateBooked: date("date_booked").notNull(),
	estimatedDelivery: date("estimated_delivery").notNull(),
	status: varchar({ length: 50 }).default('Booked').notNull(),
	proNumber: varchar("pro_number", { length: 100 }),
	bolNumber: varchar("bol_number", { length: 100 }),
	invoiceNumber: varchar("invoice_number", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	notes: text(),
	pickupLocation: varchar("pickup_location", { length: 255 }),
	destination: varchar({ length: 255 }),
	productName: varchar("product_name", { length: 255 }),
	fileNames: text("file_names").array(),
	s3Keys: text("s3_keys").array(),
	fileTypes: text("file_types").array(),
	fileUploadedAt: timestamp("file_uploaded_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_freight_deals_files").using("gin", table.fileNames.asc().nullsLast().op("array_ops")),
]);

export const freightFiles = pgTable("freight_files", {
	id: serial().primaryKey().notNull(),
	dealId: integer("deal_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	s3Key: varchar("s3_key", { length: 255 }).notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_freight_files_deal_id").using("btree", table.dealId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [freightDeals.id],
			name: "fk_freight_files_deal_id"
		}).onDelete("cascade"),
]);

export const emailChunks = pgTable("email_chunks", {
	id: serial().primaryKey().notNull(),
	emailId: varchar("email_id", { length: 255 }).notNull(),
	chunkType: varchar("chunk_type", { length: 50 }).notNull(),
	content: text().notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	embedding: vector({ dimensions: 1536 }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("email_chunks_email_id_idx").using("btree", table.emailId.asc().nullsLast().op("text_ops")),
	index("email_chunks_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("email_chunks_type_idx").using("btree", table.chunkType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [bossEmails.emailId],
			name: "email_chunks_email_id_fkey"
		}).onDelete("cascade"),
	unique("email_chunks_email_id_chunk_index_key").on(table.emailId, table.chunkIndex),
]);

export const emailProcessingStatus = pgTable("email_processing_status", {
	id: integer().default(1).primaryKey().notNull(),
	lastProcessedTime: timestamp("last_processed_time", { withTimezone: true, mode: 'string' }),
	processedCount: integer("processed_count").default(0).notNull(),
	lastProcessedEmailId: varchar("last_processed_email_id", { length: 255 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	check("email_processing_status_id_check", sql`id = 1`),
]);

export const tasks = pgTable("tasks", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	date: timestamp({ mode: 'string' }).notNull(),
	priority: text(),
	completed: boolean().default(false),
}, (table) => [
	check("tasks_priority_check", sql`priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])`),
]);

export const bossEmails = pgTable("boss_emails", {
	id: serial().primaryKey().notNull(),
	emailId: varchar("email_id", { length: 255 }).notNull(),
	subject: text().notNull(),
	content: text().notNull(),
	sentDate: timestamp("sent_date", { withTimezone: true, mode: 'string' }).notNull(),
	sender: varchar({ length: 255 }).notNull(),
	recipients: text(),
	ccRecipients: text("cc_recipients"),
	importance: varchar({ length: 50 }),
	embedding: vector({ dimensions: 1536 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	topics: jsonb().default([]),
	keyEntities: jsonb("key_entities").default([]),
	actionItems: jsonb("action_items").default([]),
	eventType: varchar("event_type", { length: 100 }),
	eventDate: timestamp("event_date", { withTimezone: true, mode: 'string' }),
	eventLocation: text("event_location"),
	sentimentScore: integer("sentiment_score"),
	priority: varchar({ length: 20 }),
	confidential: boolean(),
	categories: jsonb().default([]),
}, (table) => [
	index("boss_emails_categories_idx").using("gin", table.categories.asc().nullsLast().op("jsonb_path_ops")),
	index("boss_emails_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("boss_emails_key_entities_idx").using("gin", table.keyEntities.asc().nullsLast().op("jsonb_path_ops")),
	index("boss_emails_sent_date_idx").using("btree", table.sentDate.asc().nullsLast().op("timestamptz_ops")),
	index("boss_emails_topics_idx").using("gin", table.topics.asc().nullsLast().op("jsonb_path_ops")),
	unique("boss_emails_email_id_key").on(table.emailId),
]);

export const ragDataSources = pgTable("rag_data_sources", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("rag_data_sources_name_key").on(table.name),
]);

export const ragDocuments = pgTable("rag_documents", {
	id: serial().primaryKey().notNull(),
	dataSourceId: integer("data_source_id").notNull(),
	sourceId: varchar("source_id", { length: 255 }).notNull(),
	contentHash: varchar("content_hash", { length: 64 }),
	content: jsonb().notNull(),
	metadata: jsonb(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("rag_documents_datasource_fk_idx").using("btree", table.dataSourceId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.dataSourceId],
			foreignColumns: [ragDataSources.id],
			name: "rag_documents_data_source_id_fkey"
		}).onDelete("cascade"),
	unique("rag_documents_source_idx").on(table.dataSourceId, table.sourceId),
]);

export const ragChunks = pgTable("rag_chunks", {
	id: serial().primaryKey().notNull(),
	documentId: integer("document_id").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("rag_chunks_document_fk_idx").using("btree", table.documentId.asc().nullsLast().op("int4_ops")),
	index("rag_chunks_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [ragDocuments.id],
			name: "rag_chunks_document_id_fkey"
		}).onDelete("cascade"),
]);

export const returns = pgTable("returns", {
	id: serial().primaryKey().notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	amazonOrderId: varchar("amazon_order_id", { length: 50 }),
	customerName: varchar("customer_name", { length: 100 }),
	returnDate: timestamp("return_date", { mode: 'string' }).defaultNow(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	inspectedBy: varchar("inspected_by", { length: 50 }),
	inspectedAt: timestamp("inspected_at", { mode: 'string' }),
	notes: text(),
});

export const productTaggingResults = pgTable("product_tagging_results", {
	id: serial().primaryKey().notNull(),
	productId: varchar("product_id", { length: 100 }).notNull(),
	isCustomerEmail: boolean("is_customer_email").default(true),
	confidence: numeric({ precision: 5, scale:  4 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tagging_results_product_id").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	unique("unique_product_id").on(table.productId),
]);

export const returnPhotos = pgTable("return_photos", {
	id: serial().primaryKey().notNull(),
	returnItemId: integer("return_item_id").notNull(),
	photoUrl: varchar("photo_url", { length: 255 }).notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	uploadedBy: varchar("uploaded_by", { length: 50 }),
	description: text(),
}, (table) => [
	foreignKey({
			columns: [table.returnItemId],
			foreignColumns: [returnItems.id],
			name: "return_photos_return_item_id_fkey"
		}),
]);

export const returnAuditLogs = pgTable("return_audit_logs", {
	id: serial().primaryKey().notNull(),
	returnId: integer("return_id").notNull(),
	action: varchar({ length: 100 }).notNull(),
	performedBy: varchar("performed_by", { length: 50 }).notNull(),
	performedAt: timestamp("performed_at", { mode: 'string' }).defaultNow(),
	details: json(),
}, (table) => [
	foreignKey({
			columns: [table.returnId],
			foreignColumns: [returns.id],
			name: "return_audit_logs_return_id_fkey"
		}),
]);

export const returnItems = pgTable("return_items", {
	id: serial().primaryKey().notNull(),
	returnId: integer("return_id").notNull(),
	productId: varchar("product_id", { length: 50 }).notNull(),
	sku: varchar({ length: 50 }).notNull(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	quantity: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }),
	condition: text(),
	refundAmount: numeric("refund_amount", { precision: 10, scale:  2 }),
	itemCondition: jsonb("item_condition").default({"item":"Original condition","packaging":"Original condition","accessories":"Original condition"}),
	outsideReturnWindow: boolean("outside_return_window").default(false),
}, (table) => [
	foreignKey({
			columns: [table.returnId],
			foreignColumns: [returns.id],
			name: "return_items_return_id_fkey"
		}),
]);

export const gs1AmazonVerification = pgTable("gs1_amazon_verification", {
	itemSku: text("item_sku").primaryKey().notNull(),
	verifiedMatch: boolean("verified_match"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }).defaultNow(),
	shopifyId: text("shopify_id"),
});

export const customerFollowups = pgTable("customer_followups", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	purchaseDate: timestamp("purchase_date", { mode: 'string' }).notNull(),
	orderTotal: numeric("order_total", { precision: 10, scale:  2 }).notNull(),
	followupDate: timestamp("followup_date", { mode: 'string' }).notNull(),
	followupSent: boolean("followup_sent").default(false),
	lastContactedAt: timestamp("last_contacted_at", { mode: 'string' }),
	responseReceived: boolean("response_received").default(false),
	notes: text(),
	itemsPurchased: jsonb("items_purchased"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_customer_followups_email").using("btree", table.customerEmail.asc().nullsLast().op("text_ops")),
	index("idx_customer_followups_followup_date").using("btree", table.followupDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_customer_followups_order_total").using("btree", table.orderTotal.asc().nullsLast().op("numeric_ops")),
	index("idx_customer_followups_sent").using("btree", table.followupSent.asc().nullsLast().op("bool_ops")),
]);

export const productTaggingProcessedEmails = pgTable("product_tagging_processed_emails", {
	id: serial().primaryKey().notNull(),
	messageId: varchar("message_id", { length: 255 }).notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	productsFound: integer("products_found").default(0),
	isCustomerEmail: boolean("is_customer_email").default(false),
}, (table) => [
	index("idx_processed_emails_message_id").using("btree", table.messageId.asc().nullsLast().op("text_ops")),
	unique("product_tagging_unique_message_id").on(table.messageId),
]);

export const subscriptions = pgTable("subscriptions", {
	id: text().primaryKey().notNull(),
	resource: text().notNull(),
	expirationDatetime: timestamp("expiration_datetime", { mode: 'string' }).notNull(),
	clientState: text("client_state"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const purchaserOrder = pgTable("purchaser_order", {
	poNumber: text("po_number"),
	date: text(),
	vendor: text(),
	product: text(),
	poDate: date("po_date"),
});

export const whaleFollowups = pgTable("whale_followups", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 255 }).notNull(),
	orderNumber: varchar("order_number", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	purchaseDate: timestamp("purchase_date", { mode: 'string' }).notNull(),
	orderTotal: numeric("order_total", { precision: 10, scale:  2 }).notNull(),
	followupDate: timestamp("followup_date", { mode: 'string' }).notNull(),
	followupSent: boolean("followup_sent").default(false),
	lastContactedAt: timestamp("last_contacted_at", { mode: 'string' }),
	itemsPurchased: jsonb("items_purchased"),
	shippingAddress: jsonb("shipping_address"),
	orderData: jsonb("order_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_whale_followups_customer_email").using("btree", table.customerEmail.asc().nullsLast().op("text_ops")),
	index("idx_whale_followups_followup_date").using("btree", table.followupDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_whale_followups_followup_sent").using("btree", table.followupSent.asc().nullsLast().op("bool_ops")),
	index("idx_whale_followups_order_total").using("btree", table.orderTotal.asc().nullsLast().op("numeric_ops")),
	index("idx_whale_followups_purchase_date").using("btree", table.purchaseDate.asc().nullsLast().op("timestamp_ops")),
	unique("whale_followups_order_id_key").on(table.orderId),
]);

export const whaleChases = pgTable("whale_chases", {
	id: serial().primaryKey().notNull(),
	orderId: varchar("order_id", { length: 255 }).notNull(),
	orderNumber: varchar("order_number", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	purchaseDate: timestamp("purchase_date", { mode: 'string' }).notNull(),
	orderTotal: numeric("order_total", { precision: 10, scale:  2 }).notNull(),
	followupDate: timestamp("followup_date", { mode: 'string' }).notNull(),
	followupSent: boolean("followup_sent").default(false),
	lastContactedAt: timestamp("last_contacted_at", { mode: 'string' }),
	itemsPurchased: jsonb("items_purchased"),
	shippingAddress: jsonb("shipping_address"),
	orderData: jsonb("order_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("whale_chases_order_id_key").on(table.orderId),
]);

export const poPricingData = pgTable("po_pricing_data", {
	id: serial().primaryKey().notNull(),
	poNumber: varchar("po_number", { length: 50 }).notNull(),
	vendor: varchar({ length: 255 }),
	poDate: date("po_date"),
	unitPrice: numeric("unit_price", { precision: 12, scale:  4 }),
	priceUnit: varchar("price_unit", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	productName: varchar("product_name", { length: 255 }),
	productGid: text("product_gid"),
	canonicalProductName: text("canonical_product_name"),
	rawItemText: text("raw_item_text"),
	normalizedVendor: text("normalized_vendor"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_po_pricing_data_normalized_vendor").using("btree", table.normalizedVendor.asc().nullsLast().op("text_ops")),
	index("idx_po_pricing_data_po").using("btree", table.poNumber.asc().nullsLast().op("text_ops")),
	index("idx_po_pricing_data_po_number").using("btree", table.poNumber.asc().nullsLast().op("text_ops")),
	index("idx_po_pricing_data_upper_product_name").using("btree", sql`upper((product_name)::text)`),
	index("idx_popd_po_date").using("btree", table.poDate.asc().nullsLast().op("date_ops")),
	index("idx_popd_po_number").using("btree", table.poNumber.asc().nullsLast().op("text_ops")),
	index("idx_popd_product_name").using("btree", table.productName.asc().nullsLast().op("text_ops")),
	index("idx_popd_vendor").using("btree", table.vendor.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productGid],
			foreignColumns: [products.id],
			name: "fk_po_pricing_data_product"
		}).onUpdate("cascade").onDelete("set null"),
	unique("po_pricing_data_po_raw_text_unique").on(table.poNumber, table.rawItemText),
]);

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	sourceIdentifier: varchar("source_identifier", { length: 512 }),
	sourceType: varchar("source_type", { length: 50 }).notNull(),
	name: varchar({ length: 512 }).notNull(),
	type: varchar({ length: 100 }),
	size: integer(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastModifiedAt: timestamp("last_modified_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 256 }),
	processingStatus: varchar("processing_status", { length: 50 }).default('pending'),
	numPages: integer("num_pages"),
	extractedMetadata: jsonb("extracted_metadata"),
	sourceUrl: text("source_url"),
	documentVersion: integer("document_version").default(1),
	accessControlTags: jsonb("access_control_tags"),
	documentFingerprint: varchar("document_fingerprint", { length: 256 }),
}, (table) => [
	index("idx_documents_processing_status").using("btree", table.processingStatus.asc().nullsLast().op("text_ops")),
	index("idx_documents_source_type").using("btree", table.sourceType.asc().nullsLast().op("text_ops")),
	unique("documents_source_identifier_unique").on(table.sourceIdentifier),
]);

export const chunks = pgTable("chunks", {
	id: serial().primaryKey().notNull(),
	documentId: integer("document_id").notNull(),
	parentChunkId: integer("parent_chunk_id"),
	chunkType: smallint("chunk_type").default(2).notNull(),
	content: text().notNull(),
	contentEmbedding: vector("content_embedding", { dimensions: 1536 }).notNull(),
	metadata: jsonb().notNull(),
	wordCount: integer("word_count"),
	charCount: integer("char_count"),
	confidenceScore: smallint("confidence_score"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	chunkLastModified: timestamp("chunk_last_modified", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	chunkVersion: integer("chunk_version").default(1),
	accessControlTags: jsonb("access_control_tags"),
}, (table) => [
	index("idx_chunks_access_control_tags_gin").using("gin", table.accessControlTags.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_chunks_chunk_type").using("btree", table.chunkType.asc().nullsLast().op("int2_ops")),
	index("idx_chunks_confidence_score").using("btree", table.confidenceScore.asc().nullsLast().op("int2_ops")),
	index("idx_chunks_content_embedding_hnsw_cosine").using("hnsw", table.contentEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_chunks_document_id").using("btree", table.documentId.asc().nullsLast().op("int4_ops")),
	index("idx_chunks_last_modified").using("btree", table.chunkLastModified.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_chunks_metadata_gin").using("gin", table.metadata.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_chunks_metadata_section_title").using("btree", sql`((metadata ->> 'sectionTitle'::text))`),
	index("idx_chunks_metadata_source_type").using("btree", sql`((metadata ->> 'sourceType'::text))`),
	index("idx_chunks_parent_chunk_id").using("btree", table.parentChunkId.asc().nullsLast().op("int4_ops")),
	index("idx_chunks_version").using("btree", table.chunkVersion.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "chunks_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentChunkId],
			foreignColumns: [table.id],
			name: "chunks_parent_chunk_id_chunks_id_fk"
		}).onDelete("set null"),
]);

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 256 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	title: text(),
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	role: varchar({ length: 15 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_sessions_user_id"
		}),
]);

export const alerts = pgTable("alerts", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	severity: integer().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	title: text().notNull(),
	message: text().notNull(),
	source: text(),
	referenceId: text("reference_id"),
	status: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`clock_timestamp()`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`clock_timestamp()`).notNull(),
}, (table) => [
	index("idx_alerts_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_alerts_reference_id").using("btree", table.referenceId.asc().nullsLast().op("text_ops")),
	index("idx_alerts_severity").using("btree", table.severity.desc().nullsFirst().op("int4_ops")),
	index("idx_alerts_source").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("idx_alerts_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_alerts_timestamp").using("btree", table.timestamp.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_alerts_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	role: userRole().default('user').notNull(),
	emailVerified: timestamp("email_verified", { mode: 'string' }),
	resetToken: varchar("reset_token", { length: 255 }),
	resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'string' }),
	ticketingRole: ticketingRoleEnum("ticketing_role"),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const shopifySyncProducts = pgTable("shopify_sync_products", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }),
	title: text(),
	description: text(),
	productType: text("product_type"),
	vendor: text(),
	handle: text(),
	status: text(),
	tags: text(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	variants: jsonb(),
	images: jsonb(),
	options: jsonb(),
	metafields: jsonb(),
	syncDate: date("sync_date").notNull(),
}, (table) => [
	index("idx_shopify_products_handle").using("btree", table.handle.asc().nullsLast().op("text_ops")),
	index("idx_shopify_products_id").using("btree", table.productId.asc().nullsLast().op("int8_ops")),
	index("idx_shopify_products_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("shopify_sync_products_product_id_key").on(table.productId),
]);

export const shopifySyncCustomers = pgTable("shopify_sync_customers", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	phone: text(),
	verifiedEmail: boolean("verified_email"),
	acceptsMarketing: boolean("accepts_marketing"),
	ordersCount: integer("orders_count"),
	state: text(),
	totalSpent: numeric("total_spent", { precision: 12, scale:  2 }),
	note: text(),
	addresses: jsonb(),
	defaultAddress: jsonb("default_address"),
	taxExemptions: jsonb("tax_exemptions"),
	taxExempt: boolean("tax_exempt"),
	tags: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	syncDate: date("sync_date").notNull(),
}, (table) => [
	index("idx_shopify_customers_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_shopify_customers_id").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	index("idx_shopify_customers_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("shopify_sync_customers_customer_id_key").on(table.customerId),
]);

export const shopifySyncOrders = pgTable("shopify_sync_orders", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }),
	name: text(),
	orderNumber: integer("order_number"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }),
	email: text(),
	phone: text(),
	financialStatus: text("financial_status"),
	fulfillmentStatus: text("fulfillment_status"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	currency: text(),
	totalPrice: numeric("total_price", { precision: 12, scale:  2 }),
	subtotalPrice: numeric("subtotal_price", { precision: 12, scale:  2 }),
	totalTax: numeric("total_tax", { precision: 12, scale:  2 }),
	totalDiscounts: numeric("total_discounts", { precision: 12, scale:  2 }),
	totalShipping: numeric("total_shipping", { precision: 12, scale:  2 }),
	billingAddress: jsonb("billing_address"),
	shippingAddress: jsonb("shipping_address"),
	lineItems: jsonb("line_items"),
	shippingLines: jsonb("shipping_lines"),
	discountApplications: jsonb("discount_applications"),
	note: text(),
	tags: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	syncDate: date("sync_date").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
}, (table) => [
	index("idx_shopify_orders_customer_id").using("btree", table.customerId.asc().nullsLast().op("int8_ops")),
	index("idx_shopify_orders_id").using("btree", table.orderId.asc().nullsLast().op("int8_ops")),
	index("idx_shopify_orders_processed_at").using("btree", table.processedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shopify_orders_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("shopify_sync_orders_order_id_key").on(table.orderId),
]);

export const shopifySyncCollections = pgTable("shopify_sync_collections", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	collectionId: bigint("collection_id", { mode: "number" }),
	title: text(),
	handle: text(),
	description: text(),
	descriptionHtml: text("description_html"),
	productsCount: integer("products_count"),
	products: jsonb(),
	ruleSet: jsonb("rule_set"),
	sortOrder: text("sort_order"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	templateSuffix: text("template_suffix"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	syncDate: date("sync_date").notNull(),
}, (table) => [
	index("idx_shopify_collections_handle").using("btree", table.handle.asc().nullsLast().op("text_ops")),
	index("idx_shopify_collections_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("shopify_sync_collections_collection_id_key").on(table.collectionId),
]);

export const shopifySyncBlogArticles = pgTable("shopify_sync_blog_articles", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	blogId: bigint("blog_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }),
	blogTitle: text("blog_title"),
	title: text(),
	author: text(),
	content: text(),
	contentHtml: text("content_html"),
	excerpt: text(),
	handle: text(),
	image: jsonb(),
	tags: text(),
	seo: jsonb(),
	status: text(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	commentsCount: integer("comments_count"),
	summaryHtml: text("summary_html"),
	templateSuffix: text("template_suffix"),
	syncDate: date("sync_date").notNull(),
}, (table) => [
	index("idx_shopify_blog_articles_handle").using("btree", table.handle.asc().nullsLast().op("text_ops")),
	index("idx_shopify_blog_articles_published_at").using("btree", table.publishedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shopify_blog_articles_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("shopify_sync_blog_articles_blog_id_article_id_key").on(table.blogId, table.articleId),
]);

export const shipstationSyncOrders = pgTable("shipstation_sync_orders", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }),
	orderNumber: text("order_number"),
	orderKey: text("order_key"),
	orderDate: timestamp("order_date", { withTimezone: true, mode: 'string' }),
	createDate: timestamp("create_date", { withTimezone: true, mode: 'string' }),
	modifyDate: timestamp("modify_date", { withTimezone: true, mode: 'string' }),
	paymentDate: timestamp("payment_date", { withTimezone: true, mode: 'string' }),
	shipByDate: timestamp("ship_by_date", { withTimezone: true, mode: 'string' }),
	orderStatus: text("order_status"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }),
	customerUsername: text("customer_username"),
	customerEmail: text("customer_email"),
	billTo: jsonb("bill_to"),
	shipTo: jsonb("ship_to"),
	items: jsonb(),
	amountPaid: numeric("amount_paid", { precision: 12, scale:  2 }),
	taxAmount: numeric("tax_amount", { precision: 12, scale:  2 }),
	shippingAmount: numeric("shipping_amount", { precision: 12, scale:  2 }),
	customerNotes: text("customer_notes"),
	internalNotes: text("internal_notes"),
	marketplaceName: text("marketplace_name"),
	marketplaceOrderId: text("marketplace_order_id"),
	marketplaceOrderKey: text("marketplace_order_key"),
	marketplaceOrderNumber: text("marketplace_order_number"),
	shippingMethod: text("shipping_method"),
	carrierCode: text("carrier_code"),
	serviceCode: text("service_code"),
	packageCode: text("package_code"),
	confirmation: text(),
	shipDate: timestamp("ship_date", { withTimezone: true, mode: 'string' }),
	holdUntilDate: timestamp("hold_until_date", { withTimezone: true, mode: 'string' }),
	weight: jsonb(),
	dimensions: jsonb(),
	insuranceOptions: jsonb("insurance_options"),
	internationalOptions: jsonb("international_options"),
	advancedOptions: jsonb("advanced_options"),
	tagIds: jsonb("tag_ids"),
	userId: text("user_id"),
	externallyFulfilled: boolean("externally_fulfilled"),
	externallyFulfilledBy: text("externally_fulfilled_by"),
	labelMessages: text("label_messages"),
	customField1: text("custom_field1"),
	customField2: text("custom_field2"),
	customField3: text("custom_field3"),
	syncDate: date("sync_date").notNull(),
	orderTotal: numeric("order_total", { precision: 12, scale:  2 }),
	gift: boolean(),
	giftMessage: text("gift_message"),
	paymentMethod: text("payment_method"),
	requestedShippingService: text("requested_shipping_service"),
}, (table) => [
	index("idx_shipstation_orders_modify_date").using("btree", table.modifyDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shipstation_orders_order_date").using("btree", table.orderDate.asc().nullsLast().op("timestamptz_ops")),
	unique("shipstation_sync_orders_order_id_key").on(table.orderId),
]);

export const shipstationSyncShipments = pgTable("shipstation_sync_shipments", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	shipmentId: bigint("shipment_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }),
	orderNumber: text("order_number"),
	createDate: timestamp("create_date", { withTimezone: true, mode: 'string' }),
	shipDate: timestamp("ship_date", { withTimezone: true, mode: 'string' }),
	trackingNumber: text("tracking_number"),
	carrierCode: text("carrier_code"),
	serviceCode: text("service_code"),
	confirmation: text(),
	shipCost: numeric("ship_cost", { precision: 12, scale:  2 }),
	insuranceCost: numeric("insurance_cost", { precision: 12, scale:  2 }),
	trackingStatus: text("tracking_status"),
	voided: boolean(),
	voidDate: timestamp("void_date", { withTimezone: true, mode: 'string' }),
	marketplaceNotified: boolean("marketplace_notified"),
	notifyErrorMessage: text("notify_error_message"),
	shipTo: jsonb("ship_to"),
	weight: jsonb(),
	dimensions: jsonb(),
	insuranceOptions: jsonb("insurance_options"),
	advancedOptions: jsonb("advanced_options"),
	labelData: text("label_data"),
	formData: text("form_data"),
	syncDate: date("sync_date").notNull(),
	orderKey: text("order_key"),
	userId: text("user_id"),
}, (table) => [
	index("idx_shipstation_shipments_order_id").using("btree", table.orderId.asc().nullsLast().op("int8_ops")),
	index("idx_shipstation_shipments_ship_date").using("btree", table.shipDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shipstation_shipments_tracking_number").using("btree", table.trackingNumber.asc().nullsLast().op("text_ops")),
	index("idx_shipstation_shipments_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("shipstation_sync_shipments_shipment_id_key").on(table.shipmentId),
]);

export const tempGtinFilld = pgTable("temp_gtin_filld", {
	action: text(),
	gs1Companyprefix: integer(),
	gtin: doublePrecision(),
	packaginglevel: text(),
	description: text(),
	desc1Language: text(),
	brandname: text(),
	brand1Language: text(),
	status: text(),
	industry: text(),
	isvariable: text(),
	ispurchasable: text(),
	sku: text(),
	certified: text(),
	height: text(),
	width: text(),
	depth: text(),
	dimensionmeasure: text(),
	grossweight: text(),
	netweight: text(),
	weightmeasure: text(),
	comments: text(),
	childgtins: text(),
	quantity: text(),
	subbrandname: text(),
	productdescriptionshort: text(),
	labeldescription: text(),
	netcontent1Count: text(),
	netcontent1Unitofmeasure: text(),
	netcontent2Count: text(),
	netcontent2Unitofmeasure: text(),
	netcontent3Count: text(),
	netcontent3Unitofmeasure: text(),
	brandname2: text(),
	brand2Language: text(),
	description2: text(),
	desc2Language: text(),
	globalproductclassification: integer(),
	imageurl: text(),
	targetmarkets: text(),
});

export const tempBlankGtin = pgTable("temp_blank_gtin", {
	action: text(),
	gs1Companyprefix: integer(),
	gtin: doublePrecision(),
	packaginglevel: text(),
	description: text(),
	desc1Language: text(),
	brandname: text(),
	brand1Language: text(),
	status: text(),
	industry: text(),
	isvariable: text(),
	ispurchasable: text(),
	sku: text(),
	certified: text(),
	height: text(),
	width: text(),
	depth: text(),
	dimensionmeasure: text(),
	grossweight: text(),
	netweight: text(),
	weightmeasure: text(),
	comments: text(),
	childgtins: text(),
	quantity: text(),
	subbrandname: text(),
	productdescriptionshort: text(),
	labeldescription: text(),
	netcontent1Count: text(),
	netcontent1Unitofmeasure: text(),
	netcontent2Count: text(),
	netcontent2Unitofmeasure: text(),
	netcontent3Count: text(),
	netcontent3Unitofmeasure: text(),
	brandname2: text(),
	brand2Language: text(),
	description2: text(),
	desc2Language: text(),
	globalproductclassification: integer(),
	imageurl: text(),
	targetmarkets: text(),
});

export const ticketComments = pgTable("ticket_comments", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	commenterEmail: varchar("commenter_email", { length: 255 }),
	commenterName: varchar("commenter_name", { length: 255 }),
	commentText: text("comment_text").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	isFromCustomer: boolean("is_from_customer").default(false).notNull(),
	isInternalNote: boolean("is_internal_note").default(false).notNull(),
	externalMessageId: varchar("external_message_id", { length: 255 }),
	commenterId: integer("commenter_id"),
}, (table) => [
	index("idx_ticket_comments_commenter_id").using("btree", table.commenterId.asc().nullsLast().op("int4_ops")),
	index("idx_ticket_comments_ticket_id").using("btree", table.ticketId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "fk_ticket"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.commenterId],
			foreignColumns: [users.id],
			name: "fk_ticket_comments_commenter_id"
		}).onDelete("set null"),
	unique("ticket_comments_mailgun_message_id_key").on(table.externalMessageId),
]);

export const shopifySyncState = pgTable("shopify_sync_state", {
	entityType: text("entity_type").primaryKey().notNull(),
	lastCursor: text("last_cursor"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastRestSinceId: bigint("last_rest_since_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	currentBlogId: bigint("current_blog_id", { mode: "number" }),
	lastSyncStartTime: timestamp("last_sync_start_time", { withTimezone: true, mode: 'string' }),
	lastSyncEndTime: timestamp("last_sync_end_time", { withTimezone: true, mode: 'string' }),
	status: text().default('pending').notNull(),
	lastError: text("last_error"),
	lastProcessedCount: integer("last_processed_count").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalProcessedCount: bigint("total_processed_count", { mode: "number" }).default(0),
	lastProcessedTime: timestamp("last_processed_time", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_shopify_sync_state_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique("projects_name_key").on(table.name),
]);
export const lowStockItems = pgView("low_stock_items", {	id: uuid(),
	name: varchar({ length: 100 }),
	currentStock: integer("current_stock"),
	minStock: integer("min_stock"),
	maxStock: integer("max_stock"),
	stockStatus: stockStatus("stock_status"),
}).as(sql`SELECT id, name, current_stock, min_stock, max_stock, CASE WHEN current_stock < min_stock THEN 'critical'::stock_status WHEN current_stock::numeric < (min_stock::numeric * 1.2) THEN 'warning'::stock_status ELSE 'normal'::stock_status END AS stock_status FROM chemicals WHERE current_stock::numeric < (min_stock::numeric * 1.2)`);

export const skuMatchView = pgView("sku_match_view", {	sellerSku: varchar("seller_sku", { length: 255 }),
	itemName: varchar("item_name", { length: 255 }),
	amazonPrice: numeric("amazon_price", { precision: 10, scale:  2 }),
	productTitle: text("product_title"),
	variantPrice: varchar("variant_price"),
	sku: varchar(),
}).as(sql`SELECT amazon_pricing.seller_sku, amazon_pricing.item_name, amazon_pricing.price AS amazon_price, variants.product_title, variants.price AS variant_price, variants.sku FROM amazon_pricing JOIN variants ON amazon_pricing.seller_sku::text = variants.sku::text`);

export const standardizedCoaNames = pgView("standardized_coa_names", {	id: uuid(),
	originalFilename: varchar("original_filename", { length: 255 }),
	standardizedFilename: text("standardized_filename"),
}).as(sql`SELECT id, original_filename, concat(compound_name, '_', COALESCE(cas_number, 'noCAS'::character varying), '_', COALESCE(batch_number, 'noBatch'::character varying), '_', manufacturer, '_', to_char(issue_date, 'YYYYMMDD'::text)) AS standardized_filename FROM coa_documents`);

export const viewVerifiedProducts = pgView("view_verified_products", {	itemSku: text("item_sku"),
	amazonItemName: varchar("amazon_item_name", { length: 255 }),
	gs1Sku: varchar("gs1_sku", { length: 50 }),
	gs1Description: text("gs1_description"),
	brandName: varchar("brand_name", { length: 255 }),
	gtin: varchar({ length: 50 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	shopifyId: varchar("shopify_id"),
}).as(sql`SELECT gav.item_sku, ap.item_name AS amazon_item_name, g.sku AS gs1_sku, g.product_description AS gs1_description, g.brand_name, g.gtin, gav.reviewed_at AS verified_at, vim.shopify_id FROM gs1_amazon_verification gav JOIN amazon_pricing ap ON gav.item_sku = ap.seller_sku::text JOIN amazon_gtins ag ON ag.item_sku = gav.item_sku JOIN gs1 g ON g.gtin_12_upc::text = ag.external_product_id::text LEFT JOIN variant_id_mappings vim ON vim.sku::text = gav.item_sku WHERE gav.verified_match = true`);

export const viewAmazonWithGs1 = pgView("view_amazon_with_gs1", {	itemSku: text("item_sku"),
	amazonItemName: text("amazon_item_name"),
	externalProductId: doublePrecision("external_product_id"),
	externalProductIdType: text("external_product_id_type"),
	gs1Sku: varchar("gs1_sku", { length: 50 }),
	gtin: varchar({ length: 50 }),
	gtin12Upc: varchar("gtin_12_upc", { length: 50 }),
	brandName: varchar("brand_name", { length: 255 }),
	productDescription: text("product_description"),
	productDescriptionShort: text("product_description_short"),
	labelDescription: text("label_description"),
	isVariable: boolean("is_variable"),
	isPurchasable: boolean("is_purchasable"),
	statusLabel: varchar("status_label", { length: 50 }),
	height: numeric({ precision: 10, scale:  2 }),
	width: numeric({ precision: 10, scale:  2 }),
	depth: numeric({ precision: 10, scale:  2 }),
	dimensionMeasure: varchar("dimension_measure", { length: 20 }),
	grossWeight: numeric("gross_weight", { precision: 10, scale:  2 }),
	netWeight: numeric("net_weight", { precision: 10, scale:  2 }),
	weightMeasure: varchar("weight_measure", { length: 20 }),
	globalProductClassification: varchar("global_product_classification", { length: 50 }),
	imageUrl: text("image_url"),
	imageUrlValidation: boolean("image_url_validation"),
	targetMarkets: varchar("target_markets", { length: 50 }),
	lastModifiedDate: date("last_modified_date"),
}).as(sql`SELECT a.item_sku, a.item_name AS amazon_item_name, a.external_product_id, a.external_product_id_type, g.sku AS gs1_sku, g.gtin, g.gtin_12_upc, g.brand_name, g.product_description, g.product_description_short, g.label_description, g.is_variable, g.is_purchasable, g.status_label, g.height, g.width, g.depth, g.dimension_measure, g.gross_weight, g.net_weight, g.weight_measure, g.global_product_classification, g.image_url, g.image_url_validation, g.target_markets, g.last_modified_date FROM amazon_gtins a JOIN gs1 g ON a.external_product_id::text = g.gtin_12_upc::text`);

export const googleAdsCustomerList = pgView("google_ads_customer_list", {	email: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	country: text(),
	zip: text(),
	emailRepeat: text("email_repeat"),
	zipRepeat: text("zip_repeat"),
	phone: text(),
	phoneRepeat: text("phone_repeat"),
}).as(sql`SELECT DISTINCT ON ((lower(COALESCE(c.email, o.email)))) COALESCE(c.email, o.email) AS email, COALESCE(c.first_name, o.first_name) AS first_name, COALESCE(c.last_name, o.last_name) AS last_name, COALESCE(c.default_address ->> 'country'::text, o.shipping_address ->> 'country'::text) AS country, COALESCE(c.default_address ->> 'zip'::text, o.shipping_address ->> 'zip'::text) AS zip, COALESCE(o.email, c.email) AS email_repeat, COALESCE(o.shipping_address ->> 'zip'::text, c.default_address ->> 'zip'::text) AS zip_repeat, COALESCE(o.phone, c.phone) AS phone, COALESCE(c.phone, o.phone) AS phone_repeat FROM shopify_sync_orders o LEFT JOIN shopify_sync_customers c ON o.customer_id = c.customer_id WHERE COALESCE(c.email, o.email) IS NOT NULL ORDER BY (lower(COALESCE(c.email, o.email))), o.processed_at DESC`);

export const googleAdsCustomerExport = pgView("google_ads_customer_export", {	email: text(),
	phone: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	country: text(),
	zip: text(),
}).as(sql`SELECT lower(TRIM(BOTH FROM email)) AS email, regexp_replace(TRIM(BOTH FROM COALESCE(phone, phone_repeat)), '[^0-9+]'::text, ''::text, 'g'::text) AS phone, initcap(TRIM(BOTH FROM first_name)) AS first_name, initcap(TRIM(BOTH FROM last_name)) AS last_name, upper(COALESCE(NULLIF(TRIM(BOTH FROM country), ''::text), 'US'::text)) AS country, TRIM(BOTH FROM zip) AS zip FROM google_ads_customer_list WHERE email IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL AND zip IS NOT NULL`);

export const remainingBlankGtins = pgView("remaining_blank_gtins", {	action: text(),
	gs1Companyprefix: integer(),
	gtin: doublePrecision(),
	packaginglevel: text(),
	description: text(),
	desc1Language: text(),
	brandname: text(),
	brand1Language: text(),
	status: text(),
	industry: text(),
	isvariable: text(),
	ispurchasable: text(),
	sku: text(),
	certified: text(),
	height: text(),
	width: text(),
	depth: text(),
	dimensionmeasure: text(),
	grossweight: text(),
	netweight: text(),
	weightmeasure: text(),
	comments: text(),
	childgtins: text(),
	quantity: text(),
	subbrandname: text(),
	productdescriptionshort: text(),
	labeldescription: text(),
	netcontent1Count: text(),
	netcontent1Unitofmeasure: text(),
	netcontent2Count: text(),
	netcontent2Unitofmeasure: text(),
	netcontent3Count: text(),
	netcontent3Unitofmeasure: text(),
	brandname2: text(),
	brand2Language: text(),
	description2: text(),
	desc2Language: text(),
	globalproductclassification: integer(),
	imageurl: text(),
	targetmarkets: text(),
}).as(sql`SELECT action, gs1companyprefix, gtin, packaginglevel, description, desc1language, brandname, brand1language, status, industry, isvariable, ispurchasable, sku, certified, height, width, depth, dimensionmeasure, grossweight, netweight, weightmeasure, comments, childgtins, quantity, subbrandname, productdescriptionshort, labeldescription, netcontent1count, netcontent1unitofmeasure, netcontent2count, netcontent2unitofmeasure, netcontent3count, netcontent3unitofmeasure, brandname2, brand2language, description2, desc2language, globalproductclassification, imageurl, targetmarkets FROM temp_blank_gtin b WHERE NOT (EXISTS ( SELECT 1 FROM temp_gtin_filld f WHERE f.gtin = b.gtin))`);