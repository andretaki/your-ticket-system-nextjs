-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."email_category" AS ENUM('RFQ', 'COA', 'ORDER_STATUS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('processed', 'pending', 'error');--> statement-breakpoint
CREATE TYPE "public"."hazard_level" AS ENUM('corrosive', 'toxic', 'flammable', 'low');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('critical', 'warning', 'normal');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status_enum" AS ENUM('new', 'open', 'in_progress', 'pending_customer', 'closed');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('Bug/Error', 'Feature Request', 'Security', 'Other');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('received', 'shipped', 'adjusted');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'user');--> statement-breakpoint
CREATE SEQUENCE "public"."ticket_display_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "chemprice" (
	"chemical_name" varchar(255),
	"unit" varchar(50),
	"price_per_pound" numeric,
	"specific_gravity" numeric,
	"concentration" numeric
);
--> statement-breakpoint
CREATE TABLE "product_pricing" (
	"product_id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"pricing_tier" varchar(10),
	"tier_margin_multiplier" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "option2_lookup" (
	"option2_value" varchar(255) PRIMARY KEY NOT NULL,
	"volume" numeric,
	"is_liquid" boolean,
	"labor_price" numeric(10, 2),
	"container_price" numeric(10, 2),
	"box_price" numeric(10, 2),
	"weight" numeric(10, 2),
	"base_margin" numeric(10, 2),
	CONSTRAINT "option2_lookup_labor_price_check" CHECK (labor_price >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"price_per_pound" numeric,
	"specific_gravity" numeric
);
--> statement-breakpoint
CREATE TABLE "product_descriptions" (
	"product_id" varchar(255) PRIMARY KEY NOT NULL,
	"generated_description" text,
	"seo_title" text,
	"seo_description" text,
	"last_updated" timestamp DEFAULT CURRENT_TIMESTAMP,
	"generated_description_html" text,
	"form" varchar(255),
	"grade" varchar(255),
	"percentage" text,
	"cas_number" varchar(100),
	"formula" varchar(255),
	"molecular_weight" text,
	"boiling_point" text,
	"melting_point" text,
	"flash_point" text,
	"appearance" text,
	"solubility" text,
	"industry" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" varchar PRIMARY KEY NOT NULL,
	"product_id" varchar NOT NULL,
	"title" text NOT NULL,
	"price" varchar,
	"sku" varchar,
	"option1" text,
	"option2" text,
	"option3" text,
	"calculated_price" numeric,
	"product_title" text,
	"volume" numeric,
	"shopify_variant_id" varchar,
	"cost" numeric,
	CONSTRAINT "unique_shopify_variant_id" UNIQUE("shopify_variant_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"shipment_id" integer PRIMARY KEY NOT NULL,
	"order_id" integer,
	"order_key" varchar(255),
	"user_id" varchar(255),
	"order_number" varchar(255),
	"create_date" timestamp with time zone,
	"ship_date" date,
	"shipment_cost" numeric(10, 2),
	"insurance_cost" numeric(10, 2),
	"tracking_number" varchar(255),
	"is_return_label" boolean,
	"batch_number" varchar(255),
	"carrier_code" varchar(50),
	"service_code" varchar(50),
	"package_code" varchar(50),
	"confirmation" varchar(50),
	"warehouse_id" integer,
	"voided" boolean,
	"void_date" timestamp with time zone,
	"marketplace_notified" boolean,
	"notify_error_message" text,
	"dimensions" jsonb,
	"advanced_options" jsonb,
	"label_data" text,
	"form_data" jsonb,
	"ship_to" jsonb,
	"weight" jsonb,
	"insurance_options" jsonb,
	"shipment_items" jsonb
);
--> statement-breakpoint
CREATE TABLE "warehouse_outgoing_checklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientName" varchar(255) NOT NULL,
	"datePerformed" date NOT NULL,
	"invoiceNumber" varchar(255) NOT NULL,
	"orderType" varchar(255) NOT NULL,
	"inspector" varchar(255) NOT NULL,
	"lotNumbers" varchar(255) NOT NULL,
	"preparedBy" varchar(255) NOT NULL,
	"packingSlip" jsonb NOT NULL,
	"cofAs" jsonb NOT NULL,
	"inspectProducts" jsonb NOT NULL,
	"billOfLading" jsonb NOT NULL,
	"mistakes" varchar(255) NOT NULL,
	"actionTaken" text,
	"comments" text,
	"attachment_name" varchar(255),
	"attachmentUrl" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "coas" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"title" text,
	"upload_date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"file_name" varchar(255) NOT NULL,
	"s3_key" varchar(255) NOT NULL,
	"pdf_url" varchar(1000),
	"status" varchar(50) DEFAULT 'Uploaded' NOT NULL,
	"version_id" varchar(255),
	"rebranded_s3_key" varchar(255),
	"rebranded_pdf_url" varchar(1000),
	"processing_status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"approval_status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"processing_error" text
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"author" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_id" varchar(10) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "ticket_status_enum" DEFAULT 'new' NOT NULL,
	"priority" "ticket_priority_enum" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"assigned_user_email" varchar(255),
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"sender_email" varchar(255) NOT NULL,
	"sender_name" varchar(255),
	"body_text" text,
	"body_html" text,
	"external_message_id" varchar(255),
	"customer_id" integer,
	"type" "ticket_type",
	"project_id" integer,
	"assignee_id" integer,
	"reporter_id" integer,
	CONSTRAINT "tickets_ticket_id_key" UNIQUE("display_id"),
	CONSTRAINT "tickets_mailgun_message_id_key" UNIQUE("external_message_id")
);
--> statement-breakpoint
CREATE TABLE "chemicals" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	"concentration" varchar(20) NOT NULL,
	"min_stock" integer NOT NULL,
	"max_stock" integer NOT NULL,
	"current_stock" integer NOT NULL,
	"hazard_type" "hazard_level" NOT NULL,
	"location" varchar(50) DEFAULT 'main',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "chemicals_min_stock_check" CHECK (min_stock >= 0),
	CONSTRAINT "chemicals_check" CHECK (max_stock > min_stock),
	CONSTRAINT "chemicals_current_stock_check" CHECK (current_stock >= 0),
	CONSTRAINT "stock_within_bounds" CHECK (current_stock <= max_stock)
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"chemical_id" uuid NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"transaction_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"performed_by" varchar(100) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date,
	"transaction_type" varchar(50),
	"num" varchar(50),
	"customer" varchar(100),
	"product_service" varchar(100),
	"account" varchar(50),
	"amount" numeric(10, 2),
	"terms" varchar(50),
	"invoice_num" varchar(50),
	"class" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "variant_id_mappings" (
	"internal_id" varchar NOT NULL,
	"shopify_id" varchar NOT NULL,
	"sku" varchar NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "gs1" (
	"gs1_company_prefix" varchar(50),
	"gtin" varchar(50),
	"gtin_8" varchar(50),
	"gtin_12_upc" varchar(50),
	"gtin_13_ean" varchar(50),
	"brand_name" varchar(255),
	"brand_1_language" varchar(10),
	"product_description" text,
	"desc_1_language" varchar(10),
	"product_industry" varchar(50),
	"packaging_level" varchar(50),
	"is_variable" boolean,
	"is_purchasable" boolean,
	"status_label" varchar(50),
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"depth" numeric(10, 2),
	"dimension_measure" varchar(20),
	"gross_weight" numeric(10, 2),
	"net_weight" numeric(10, 2),
	"weight_measure" varchar(20),
	"sku" varchar(50),
	"sub_brand_name" varchar(255),
	"product_description_short" text,
	"label_description" text,
	"net_content_1_count" numeric(10, 2),
	"net_content_1_unit_of_measure" varchar(20),
	"net_content_2_count" numeric(10, 2),
	"net_content_2_unit_of_measure" varchar(20),
	"net_content_3_count" numeric(10, 2),
	"net_content_3_unit_of_measure" varchar(20),
	"brand_name_2" varchar(255),
	"brand_2_language" varchar(10),
	"description_2" text,
	"desc_2_language" varchar(10),
	"global_product_classification" varchar(50),
	"image_url" text,
	"image_url_validation" boolean,
	"target_markets" varchar(50),
	"last_modified_date" date
);
--> statement-breakpoint
CREATE TABLE "amazon_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_sku" varchar(255),
	"asin1" varchar(20),
	"item_name" varchar(255),
	"price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"bol_pro_number" varchar(255) NOT NULL,
	"carrier_broker_info" varchar(255) NOT NULL,
	"broker_contact_details" varchar(255) NOT NULL,
	"pickup_date" date NOT NULL,
	"expected_delivery_date" date NOT NULL,
	"product_description" text NOT NULL,
	"receiving_status" varchar(50) NOT NULL,
	"received" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "purchases_receiving_status_check" CHECK ((receiving_status)::text = ANY ((ARRAY['pending'::character varying, 'received'::character varying, 'delayed'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "label_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(255),
	"product_name" text,
	"quantity" integer,
	"status" varchar(20) DEFAULT 'pending',
	"requested_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"custom_request" boolean DEFAULT false,
	"custom_details" text,
	"requested_by" varchar(255),
	"printed_by" varchar(255),
	"printed_at" timestamp,
	"lot_number" varchar(255),
	"variant_option1" varchar(255),
	"sku" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "lot_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"month" varchar(20) NOT NULL,
	"lot_number" varchar(255),
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"product_title" varchar(255) DEFAULT 'Default Title' NOT NULL,
	"sku" varchar(255),
	CONSTRAINT "unique_lot_number" UNIQUE("product_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "hazmat_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar NOT NULL,
	"un_number" varchar(20),
	"hazard_class" varchar(50),
	"packing_group" varchar(20),
	"warning_text" text,
	"storage_requirements" text,
	"ppe_requirements" text,
	"emergency_contact" text,
	"required_pictograms" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"product_title" text NOT NULL,
	"proper_shipping_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "outreach" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"cart_id" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"contact_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"sales_stage" varchar(50),
	"called" boolean DEFAULT false NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"order_number" varchar(255),
	"order_total" numeric(10, 2),
	"order_date" timestamp,
	"notes" text,
	"last_email_sent_at" timestamp,
	CONSTRAINT "unique_cart_id" UNIQUE("cart_id")
);
--> statement-breakpoint
CREATE TABLE "amazon_gtins" (
	"item_sku" text,
	"external_product_id" double precision,
	"external_product_id_type" text,
	"item_name" text
);
--> statement-breakpoint
CREATE TABLE "abandoned_cart_outreach" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"called" boolean DEFAULT false NOT NULL,
	"emailed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_email_sent_at" timestamp,
	CONSTRAINT "abandoned_cart_outreach_cart_id_key" UNIQUE("cart_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"s3_url" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"rfq_number" varchar(50),
	"vendor" varchar(255),
	"request_date" timestamp,
	"s3_key" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"address1" varchar(255) NOT NULL,
	"address2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(50) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"postcard_sent" boolean DEFAULT false,
	"postcard_sent_at" timestamp,
	CONSTRAINT "unique_order_id" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"original_pdf_url" text,
	"completed_pdf_url" text,
	"quote_ref" text,
	"firm_until" timestamp with time zone,
	"payment_terms" text,
	"authorized_signature" text,
	"signature_date" timestamp with time zone,
	"delivery_days" text,
	"minimum_qty_run" text,
	"qty_unit_pack" text,
	"iaw_nsn" text,
	"exception_note" text,
	"price_breaks" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"form_data" jsonb,
	"rfq_id" integer NOT NULL,
	"nsn" varchar(50),
	"bid_price" numeric(10, 2),
	"quantity" integer,
	"notes" text,
	"s3_key" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp DEFAULT (now() + '30 days'::interval),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "dashboard_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "order_status_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255) NOT NULL,
	"customer_company" varchar(255),
	"contact_details" text,
	"order_number" varchar(100),
	"purchase_order_number" varchar(100),
	"order_date" date,
	"inquiry" text,
	"urgency" varchar(50),
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"assigned_to" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"sender" varchar(255) NOT NULL,
	"received_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"content" text NOT NULL,
	"category" "email_category" NOT NULL,
	"confidence" numeric(5, 2),
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"processing_details" jsonb,
	"error" text,
	"last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "unique_message_id" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "email_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100),
	"file_size" integer,
	"s3_key" varchar(255),
	"uploaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255) NOT NULL,
	"customer_company" varchar(255),
	"contact_details" text,
	"request_details" jsonb,
	"products" jsonb,
	"timeframe" varchar(255),
	"additional_requirements" text,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"assigned_to" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coa_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255) NOT NULL,
	"customer_company" varchar(255),
	"contact_details" text,
	"products" jsonb,
	"urgency" varchar(50),
	"additional_notes" text,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"assigned_to" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coa_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"standardized_name" varchar(255) NOT NULL,
	"compound_name" varchar(255) NOT NULL,
	"cas_number" varchar(50),
	"batch_number" varchar(100),
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"manufacturer" varchar(255),
	"purity_percentage" numeric(5, 2),
	"document_type" varchar(100) DEFAULT 'COA',
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"test_results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"storage_path" text NOT NULL,
	"text_content" text,
	"processed_by_ai" boolean DEFAULT true,
	"ai_confidence_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"formatted_pdf_path" text
);
--> statement-breakpoint
CREATE TABLE "freight_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"company" varchar(255),
	"phone" varchar(50),
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_freight_email" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "processed_emails_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" varchar(255) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(50) NOT NULL,
	"notes" text,
	CONSTRAINT "processed_emails_log_email_id_key" UNIQUE("email_id")
);
--> statement-breakpoint
CREATE TABLE "freight_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"broker_name" varchar(255) NOT NULL,
	"contact_person" varchar(255) NOT NULL,
	"date_booked" date NOT NULL,
	"estimated_delivery" date NOT NULL,
	"status" varchar(50) DEFAULT 'Booked' NOT NULL,
	"pro_number" varchar(100),
	"bol_number" varchar(100),
	"invoice_number" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"pickup_location" varchar(255),
	"destination" varchar(255),
	"product_name" varchar(255),
	"file_names" text[],
	"s3_keys" text[],
	"file_types" text[],
	"file_uploaded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "freight_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"s3_key" varchar(255) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" varchar(255) NOT NULL,
	"chunk_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "email_chunks_email_id_chunk_index_key" UNIQUE("email_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "email_processing_status" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_processed_time" timestamp with time zone,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"last_processed_email_id" varchar(255),
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "email_processing_status_id_check" CHECK (id = 1)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"priority" text,
	"completed" boolean DEFAULT false,
	CONSTRAINT "tasks_priority_check" CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))
);
--> statement-breakpoint
CREATE TABLE "boss_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"sent_date" timestamp with time zone NOT NULL,
	"sender" varchar(255) NOT NULL,
	"recipients" text,
	"cc_recipients" text,
	"importance" varchar(50),
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"topics" jsonb DEFAULT '[]'::jsonb,
	"key_entities" jsonb DEFAULT '[]'::jsonb,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"event_type" varchar(100),
	"event_date" timestamp with time zone,
	"event_location" text,
	"sentiment_score" integer,
	"priority" varchar(20),
	"confidential" boolean,
	"categories" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "boss_emails_email_id_key" UNIQUE("email_id")
);
--> statement-breakpoint
CREATE TABLE "rag_data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rag_data_sources_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_source_id" integer NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"content_hash" varchar(64),
	"content" jsonb NOT NULL,
	"metadata" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rag_documents_source_idx" UNIQUE("data_source_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "rag_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"amazon_order_id" varchar(50),
	"customer_name" varchar(100),
	"return_date" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"inspected_by" varchar(50),
	"inspected_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_tagging_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"is_customer_email" boolean DEFAULT true,
	"confidence" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_product_id" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "return_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_item_id" integer NOT NULL,
	"photo_url" varchar(255) NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"uploaded_by" varchar(50),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "return_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"performed_by" varchar(50) NOT NULL,
	"performed_at" timestamp DEFAULT now(),
	"details" json
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_id" integer NOT NULL,
	"product_id" varchar(50) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2),
	"condition" text,
	"refund_amount" numeric(10, 2),
	"item_condition" jsonb DEFAULT '{"item":"Original condition","packaging":"Original condition","accessories":"Original condition"}'::jsonb,
	"outside_return_window" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "gs1_amazon_verification" (
	"item_sku" text PRIMARY KEY NOT NULL,
	"verified_match" boolean,
	"reviewed_by" text,
	"reviewed_at" timestamp DEFAULT now(),
	"shopify_id" text
);
--> statement-breakpoint
CREATE TABLE "customer_followups" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"purchase_date" timestamp NOT NULL,
	"order_total" numeric(10, 2) NOT NULL,
	"followup_date" timestamp NOT NULL,
	"followup_sent" boolean DEFAULT false,
	"last_contacted_at" timestamp,
	"response_received" boolean DEFAULT false,
	"notes" text,
	"items_purchased" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "product_tagging_processed_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now(),
	"products_found" integer DEFAULT 0,
	"is_customer_email" boolean DEFAULT false,
	CONSTRAINT "product_tagging_unique_message_id" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"resource" text NOT NULL,
	"expiration_datetime" timestamp NOT NULL,
	"client_state" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchaser_order" (
	"po_number" text,
	"date" text,
	"vendor" text,
	"product" text,
	"po_date" date
);
--> statement-breakpoint
CREATE TABLE "whale_followups" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"order_total" numeric(10, 2) NOT NULL,
	"followup_date" timestamp NOT NULL,
	"followup_sent" boolean DEFAULT false,
	"last_contacted_at" timestamp,
	"items_purchased" jsonb,
	"shipping_address" jsonb,
	"order_data" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "whale_followups_order_id_key" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "whale_chases" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"order_total" numeric(10, 2) NOT NULL,
	"followup_date" timestamp NOT NULL,
	"followup_sent" boolean DEFAULT false,
	"last_contacted_at" timestamp,
	"items_purchased" jsonb,
	"shipping_address" jsonb,
	"order_data" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "whale_chases_order_id_key" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "po_pricing_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"vendor" varchar(255),
	"po_date" date,
	"unit_price" numeric(12, 4),
	"price_unit" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	"product_name" varchar(255),
	"product_gid" text,
	"canonical_product_name" text,
	"raw_item_text" text,
	"normalized_vendor" text,
	"updated_at" timestamp with time zone,
	CONSTRAINT "po_pricing_data_po_raw_text_unique" UNIQUE("po_number","raw_item_text")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_identifier" varchar(512),
	"source_type" varchar(50) NOT NULL,
	"name" varchar(512) NOT NULL,
	"type" varchar(100),
	"size" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" varchar(256),
	"processing_status" varchar(50) DEFAULT 'pending',
	"num_pages" integer,
	"extracted_metadata" jsonb,
	"source_url" text,
	"document_version" integer DEFAULT 1,
	"access_control_tags" jsonb,
	"document_fingerprint" varchar(256),
	CONSTRAINT "documents_source_identifier_unique" UNIQUE("source_identifier")
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"parent_chunk_id" integer,
	"chunk_type" smallint DEFAULT 2 NOT NULL,
	"content" text NOT NULL,
	"content_embedding" vector(1536) NOT NULL,
	"metadata" jsonb NOT NULL,
	"word_count" integer,
	"char_count" integer,
	"confidence_score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"chunk_last_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"chunk_version" integer DEFAULT 1,
	"access_control_tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" varchar(15) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" timestamp,
	"reset_token" varchar(255),
	"reset_token_expiry" timestamp,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" integer NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"source" text,
	"reference_id" text,
	"status" text,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" bigint,
	"title" text,
	"description" text,
	"product_type" text,
	"vendor" text,
	"handle" text,
	"status" text,
	"tags" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"variants" jsonb,
	"images" jsonb,
	"options" jsonb,
	"metafields" jsonb,
	"sync_date" date NOT NULL,
	CONSTRAINT "shopify_sync_products_product_id_key" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" bigint,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"verified_email" boolean,
	"accepts_marketing" boolean,
	"orders_count" integer,
	"state" text,
	"total_spent" numeric(12, 2),
	"note" text,
	"addresses" jsonb,
	"default_address" jsonb,
	"tax_exemptions" jsonb,
	"tax_exempt" boolean,
	"tags" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"sync_date" date NOT NULL,
	CONSTRAINT "shopify_sync_customers_customer_id_key" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint,
	"name" text,
	"order_number" integer,
	"customer_id" bigint,
	"email" text,
	"phone" text,
	"financial_status" text,
	"fulfillment_status" text,
	"processed_at" timestamp with time zone,
	"currency" text,
	"total_price" numeric(12, 2),
	"subtotal_price" numeric(12, 2),
	"total_tax" numeric(12, 2),
	"total_discounts" numeric(12, 2),
	"total_shipping" numeric(12, 2),
	"billing_address" jsonb,
	"shipping_address" jsonb,
	"line_items" jsonb,
	"shipping_lines" jsonb,
	"discount_applications" jsonb,
	"note" text,
	"tags" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"sync_date" date NOT NULL,
	"first_name" text,
	"last_name" text,
	CONSTRAINT "shopify_sync_orders_order_id_key" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" bigint,
	"title" text,
	"handle" text,
	"description" text,
	"description_html" text,
	"products_count" integer,
	"products" jsonb,
	"rule_set" jsonb,
	"sort_order" text,
	"published_at" timestamp with time zone,
	"template_suffix" text,
	"updated_at" timestamp with time zone,
	"sync_date" date NOT NULL,
	CONSTRAINT "shopify_sync_collections_collection_id_key" UNIQUE("collection_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_blog_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"blog_id" bigint,
	"article_id" bigint,
	"blog_title" text,
	"title" text,
	"author" text,
	"content" text,
	"content_html" text,
	"excerpt" text,
	"handle" text,
	"image" jsonb,
	"tags" text,
	"seo" jsonb,
	"status" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"comments_count" integer,
	"summary_html" text,
	"template_suffix" text,
	"sync_date" date NOT NULL,
	CONSTRAINT "shopify_sync_blog_articles_blog_id_article_id_key" UNIQUE("blog_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "shipstation_sync_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint,
	"order_number" text,
	"order_key" text,
	"order_date" timestamp with time zone,
	"create_date" timestamp with time zone,
	"modify_date" timestamp with time zone,
	"payment_date" timestamp with time zone,
	"ship_by_date" timestamp with time zone,
	"order_status" text,
	"customer_id" bigint,
	"customer_username" text,
	"customer_email" text,
	"bill_to" jsonb,
	"ship_to" jsonb,
	"items" jsonb,
	"amount_paid" numeric(12, 2),
	"tax_amount" numeric(12, 2),
	"shipping_amount" numeric(12, 2),
	"customer_notes" text,
	"internal_notes" text,
	"marketplace_name" text,
	"marketplace_order_id" text,
	"marketplace_order_key" text,
	"marketplace_order_number" text,
	"shipping_method" text,
	"carrier_code" text,
	"service_code" text,
	"package_code" text,
	"confirmation" text,
	"ship_date" timestamp with time zone,
	"hold_until_date" timestamp with time zone,
	"weight" jsonb,
	"dimensions" jsonb,
	"insurance_options" jsonb,
	"international_options" jsonb,
	"advanced_options" jsonb,
	"tag_ids" jsonb,
	"user_id" text,
	"externally_fulfilled" boolean,
	"externally_fulfilled_by" text,
	"label_messages" text,
	"custom_field1" text,
	"custom_field2" text,
	"custom_field3" text,
	"sync_date" date NOT NULL,
	"order_total" numeric(12, 2),
	"gift" boolean,
	"gift_message" text,
	"payment_method" text,
	"requested_shipping_service" text,
	CONSTRAINT "shipstation_sync_orders_order_id_key" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "shipstation_sync_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" bigint,
	"order_id" bigint,
	"order_number" text,
	"create_date" timestamp with time zone,
	"ship_date" timestamp with time zone,
	"tracking_number" text,
	"carrier_code" text,
	"service_code" text,
	"confirmation" text,
	"ship_cost" numeric(12, 2),
	"insurance_cost" numeric(12, 2),
	"tracking_status" text,
	"voided" boolean,
	"void_date" timestamp with time zone,
	"marketplace_notified" boolean,
	"notify_error_message" text,
	"ship_to" jsonb,
	"weight" jsonb,
	"dimensions" jsonb,
	"insurance_options" jsonb,
	"advanced_options" jsonb,
	"label_data" text,
	"form_data" text,
	"sync_date" date NOT NULL,
	"order_key" text,
	"user_id" text,
	CONSTRAINT "shipstation_sync_shipments_shipment_id_key" UNIQUE("shipment_id")
);
--> statement-breakpoint
CREATE TABLE "temp_gtin_filld" (
	"action" text,
	"gs1companyprefix" integer,
	"gtin" double precision,
	"packaginglevel" text,
	"description" text,
	"desc1language" text,
	"brandname" text,
	"brand1language" text,
	"status" text,
	"industry" text,
	"isvariable" text,
	"ispurchasable" text,
	"sku" text,
	"certified" text,
	"height" text,
	"width" text,
	"depth" text,
	"dimensionmeasure" text,
	"grossweight" text,
	"netweight" text,
	"weightmeasure" text,
	"comments" text,
	"childgtins" text,
	"quantity" text,
	"subbrandname" text,
	"productdescriptionshort" text,
	"labeldescription" text,
	"netcontent1count" text,
	"netcontent1unitofmeasure" text,
	"netcontent2count" text,
	"netcontent2unitofmeasure" text,
	"netcontent3count" text,
	"netcontent3unitofmeasure" text,
	"brandname2" text,
	"brand2language" text,
	"description2" text,
	"desc2language" text,
	"globalproductclassification" integer,
	"imageurl" text,
	"targetmarkets" text
);
--> statement-breakpoint
CREATE TABLE "temp_blank_gtin" (
	"action" text,
	"gs1companyprefix" integer,
	"gtin" double precision,
	"packaginglevel" text,
	"description" text,
	"desc1language" text,
	"brandname" text,
	"brand1language" text,
	"status" text,
	"industry" text,
	"isvariable" text,
	"ispurchasable" text,
	"sku" text,
	"certified" text,
	"height" text,
	"width" text,
	"depth" text,
	"dimensionmeasure" text,
	"grossweight" text,
	"netweight" text,
	"weightmeasure" text,
	"comments" text,
	"childgtins" text,
	"quantity" text,
	"subbrandname" text,
	"productdescriptionshort" text,
	"labeldescription" text,
	"netcontent1count" text,
	"netcontent1unitofmeasure" text,
	"netcontent2count" text,
	"netcontent2unitofmeasure" text,
	"netcontent3count" text,
	"netcontent3unitofmeasure" text,
	"brandname2" text,
	"brand2language" text,
	"description2" text,
	"desc2language" text,
	"globalproductclassification" integer,
	"imageurl" text,
	"targetmarkets" text
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"commenter_email" varchar(255),
	"commenter_name" varchar(255),
	"comment_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"is_from_customer" boolean DEFAULT false NOT NULL,
	"is_internal_note" boolean DEFAULT false NOT NULL,
	"external_message_id" varchar(255),
	"commenter_id" integer,
	CONSTRAINT "ticket_comments_mailgun_message_id_key" UNIQUE("external_message_id")
);
--> statement-breakpoint
CREATE TABLE "shopify_sync_state" (
	"entity_type" text PRIMARY KEY NOT NULL,
	"last_cursor" text,
	"last_rest_since_id" bigint,
	"current_blog_id" bigint,
	"last_sync_start_time" timestamp with time zone,
	"last_sync_end_time" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"last_processed_count" integer DEFAULT 0,
	"total_processed_count" bigint DEFAULT 0,
	"last_processed_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "projects_name_key" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_descriptions" ADD CONSTRAINT "product_descriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coas" ADD CONSTRAINT "coas_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_project_id" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_assignee_id" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "fk_tickets_reporter_id" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_chemical_id_fkey" FOREIGN KEY ("chemical_id") REFERENCES "public"."chemicals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot_numbers" ADD CONSTRAINT "lot_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_submissions" ADD CONSTRAINT "rfq_submissions_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq_summaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_requests" ADD CONSTRAINT "order_status_requests_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_requests" ADD CONSTRAINT "rfq_requests_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coa_requests" ADD CONSTRAINT "coa_requests_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freight_files" ADD CONSTRAINT "fk_freight_files_deal_id" FOREIGN KEY ("deal_id") REFERENCES "public"."freight_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_chunks" ADD CONSTRAINT "email_chunks_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."boss_emails"("email_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "public"."rag_data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_photos" ADD CONSTRAINT "return_photos_return_item_id_fkey" FOREIGN KEY ("return_item_id") REFERENCES "public"."return_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_audit_logs" ADD CONSTRAINT "return_audit_logs_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_pricing_data" ADD CONSTRAINT "fk_po_pricing_data_product" FOREIGN KEY ("product_gid") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_parent_chunk_id_chunks_id_fk" FOREIGN KEY ("parent_chunk_id") REFERENCES "public"."chunks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "fk_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "fk_ticket" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "fk_ticket_comments_commenter_id" FOREIGN KEY ("commenter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_products_title_trgm" ON "products" USING gist ("title" gist_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_variants_product_id" ON "variants" USING btree ("product_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_variants_shopify_id" ON "variants" USING btree ("shopify_variant_id" text_ops) WHERE (shopify_variant_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_variants_shopify_variant_id" ON "variants" USING btree ("shopify_variant_id" text_ops) WHERE (shopify_variant_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_variants_sku" ON "variants" USING btree ("sku" text_ops) WHERE (sku IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_shipments_carrier_code" ON "shipments" USING btree ("carrier_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_carrier_service" ON "shipments" USING btree ("carrier_code" text_ops,"service_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_create_date" ON "shipments" USING btree ("create_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_date_carrier" ON "shipments" USING btree ("ship_date" text_ops,"carrier_code" date_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_insurance_options" ON "shipments" USING gin ("insurance_options" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_marketplace_notified" ON "shipments" USING btree ("marketplace_notified" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_order_id" ON "shipments" USING btree ("order_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_package_code" ON "shipments" USING btree ("package_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_service_code" ON "shipments" USING btree ("service_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_ship_date" ON "shipments" USING btree ("ship_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_ship_to" ON "shipments" USING gin ("ship_to" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_shipment_items" ON "shipments" USING gin ("shipment_items" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_user_id" ON "shipments" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_voided" ON "shipments" USING btree ("voided" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_warehouse_id" ON "shipments" USING btree ("warehouse_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_shipments_weight" ON "shipments" USING gin ("weight" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_tickets_assignee_id" ON "tickets" USING btree ("assignee_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_tickets_priority" ON "tickets" USING btree ("priority" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_tickets_project_id" ON "tickets" USING btree ("project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_tickets_reporter_id" ON "tickets" USING btree ("reporter_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_chemicals_current_stock" ON "chemicals" USING btree ("current_stock" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chemicals_hazard_type" ON "chemicals" USING btree ("hazard_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_chemical_id" ON "inventory_transactions" USING btree ("chemical_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "inventory_transactions" USING btree ("transaction_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_abandoned_cart_outreach_cart_id" ON "abandoned_cart_outreach" USING btree ("cart_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rfq_submissions_nsn" ON "rfq_submissions" USING btree ("nsn" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cache_expires_at" ON "cache" USING btree ("expires_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_dashboard_history_timestamp" ON "dashboard_history" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_order_status_status" ON "order_status_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_emails_category" ON "emails" USING btree ("category" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_emails_received_at" ON "emails" USING btree ("received_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_emails_status" ON "emails" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_rfq_status" ON "rfq_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_coa_status" ON "coa_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "coa_batch_number_idx" ON "coa_documents" USING btree ("batch_number" text_ops);--> statement-breakpoint
CREATE INDEX "coa_cas_number_idx" ON "coa_documents" USING btree ("cas_number" text_ops);--> statement-breakpoint
CREATE INDEX "coa_compound_name_idx" ON "coa_documents" USING btree ("compound_name" text_ops);--> statement-breakpoint
CREATE INDEX "coa_manufacturer_idx" ON "coa_documents" USING btree ("manufacturer" text_ops);--> statement-breakpoint
CREATE INDEX "coa_metadata_idx" ON "coa_documents" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "coa_test_results_idx" ON "coa_documents" USING gin ("test_results" jsonb_ops);--> statement-breakpoint
CREATE INDEX "coa_text_search_idx" ON "coa_documents" USING gin (to_tsvector('english'::regconfig, text_content) tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_freight_contacts_active" ON "freight_contacts" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_freight_contacts_email" ON "freight_contacts" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_freight_deals_files" ON "freight_deals" USING gin ("file_names" array_ops);--> statement-breakpoint
CREATE INDEX "idx_freight_files_deal_id" ON "freight_files" USING btree ("deal_id" int4_ops);--> statement-breakpoint
CREATE INDEX "email_chunks_email_id_idx" ON "email_chunks" USING btree ("email_id" text_ops);--> statement-breakpoint
CREATE INDEX "email_chunks_embedding_idx" ON "email_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "email_chunks_type_idx" ON "email_chunks" USING btree ("chunk_type" text_ops);--> statement-breakpoint
CREATE INDEX "boss_emails_categories_idx" ON "boss_emails" USING gin ("categories" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "boss_emails_embedding_idx" ON "boss_emails" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "boss_emails_key_entities_idx" ON "boss_emails" USING gin ("key_entities" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "boss_emails_sent_date_idx" ON "boss_emails" USING btree ("sent_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "boss_emails_topics_idx" ON "boss_emails" USING gin ("topics" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "rag_documents_datasource_fk_idx" ON "rag_documents" USING btree ("data_source_id" int4_ops);--> statement-breakpoint
CREATE INDEX "rag_chunks_document_fk_idx" ON "rag_chunks" USING btree ("document_id" int4_ops);--> statement-breakpoint
CREATE INDEX "rag_chunks_embedding_idx" ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_tagging_results_product_id" ON "product_tagging_results" USING btree ("product_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_followups_email" ON "customer_followups" USING btree ("customer_email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_followups_followup_date" ON "customer_followups" USING btree ("followup_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_followups_order_total" ON "customer_followups" USING btree ("order_total" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_followups_sent" ON "customer_followups" USING btree ("followup_sent" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_processed_emails_message_id" ON "product_tagging_processed_emails" USING btree ("message_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whale_followups_customer_email" ON "whale_followups" USING btree ("customer_email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_whale_followups_followup_date" ON "whale_followups" USING btree ("followup_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_whale_followups_followup_sent" ON "whale_followups" USING btree ("followup_sent" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_whale_followups_order_total" ON "whale_followups" USING btree ("order_total" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_whale_followups_purchase_date" ON "whale_followups" USING btree ("purchase_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_po_pricing_data_normalized_vendor" ON "po_pricing_data" USING btree ("normalized_vendor" text_ops);--> statement-breakpoint
CREATE INDEX "idx_po_pricing_data_po" ON "po_pricing_data" USING btree ("po_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_po_pricing_data_po_number" ON "po_pricing_data" USING btree ("po_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_po_pricing_data_upper_product_name" ON "po_pricing_data" USING btree (upper((product_name)::text) text_ops);--> statement-breakpoint
CREATE INDEX "idx_popd_po_date" ON "po_pricing_data" USING btree ("po_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_popd_po_number" ON "po_pricing_data" USING btree ("po_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_popd_product_name" ON "po_pricing_data" USING btree ("product_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_popd_vendor" ON "po_pricing_data" USING btree ("vendor" text_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_processing_status" ON "documents" USING btree ("processing_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_source_type" ON "documents" USING btree ("source_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_access_control_tags_gin" ON "chunks" USING gin ("access_control_tags" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_chunk_type" ON "chunks" USING btree ("chunk_type" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_confidence_score" ON "chunks" USING btree ("confidence_score" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_content_embedding_hnsw_cosine" ON "chunks" USING hnsw ("content_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_chunks_document_id" ON "chunks" USING btree ("document_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_last_modified" ON "chunks" USING btree ("chunk_last_modified" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_metadata_gin" ON "chunks" USING gin ("metadata" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_metadata_section_title" ON "chunks" USING btree (((metadata ->> 'sectionTitle'::text)) text_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_metadata_source_type" ON "chunks" USING btree (((metadata ->> 'sourceType'::text)) text_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_parent_chunk_id" ON "chunks" USING btree ("parent_chunk_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chunks_version" ON "chunks" USING btree ("chunk_version" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_created_at" ON "alerts" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_reference_id" ON "alerts" USING btree ("reference_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_severity" ON "alerts" USING btree ("severity" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_source" ON "alerts" USING btree ("source" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_status" ON "alerts" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_timestamp" ON "alerts" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_alerts_type" ON "alerts" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_products_handle" ON "shopify_sync_products" USING btree ("handle" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_products_id" ON "shopify_sync_products" USING btree ("product_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_products_updated_at" ON "shopify_sync_products" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_customers_email" ON "shopify_sync_customers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_customers_id" ON "shopify_sync_customers" USING btree ("customer_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_customers_updated_at" ON "shopify_sync_customers" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_orders_customer_id" ON "shopify_sync_orders" USING btree ("customer_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_orders_id" ON "shopify_sync_orders" USING btree ("order_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_orders_processed_at" ON "shopify_sync_orders" USING btree ("processed_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_orders_updated_at" ON "shopify_sync_orders" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_collections_handle" ON "shopify_sync_collections" USING btree ("handle" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_collections_updated_at" ON "shopify_sync_collections" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_blog_articles_handle" ON "shopify_sync_blog_articles" USING btree ("handle" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_blog_articles_published_at" ON "shopify_sync_blog_articles" USING btree ("published_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_blog_articles_updated_at" ON "shopify_sync_blog_articles" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_orders_modify_date" ON "shipstation_sync_orders" USING btree ("modify_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_orders_order_date" ON "shipstation_sync_orders" USING btree ("order_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_shipments_order_id" ON "shipstation_sync_shipments" USING btree ("order_id" int8_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_shipments_ship_date" ON "shipstation_sync_shipments" USING btree ("ship_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_shipments_tracking_number" ON "shipstation_sync_shipments" USING btree ("tracking_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_shipstation_shipments_user_id" ON "shipstation_sync_shipments" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ticket_comments_commenter_id" ON "ticket_comments" USING btree ("commenter_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ticket_comments_ticket_id" ON "ticket_comments" USING btree ("ticket_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_shopify_sync_state_status" ON "shopify_sync_state" USING btree ("status" text_ops);--> statement-breakpoint
CREATE VIEW "public"."low_stock_items" AS (SELECT id, name, current_stock, min_stock, max_stock, CASE WHEN current_stock < min_stock THEN 'critical'::stock_status WHEN current_stock::numeric < (min_stock::numeric * 1.2) THEN 'warning'::stock_status ELSE 'normal'::stock_status END AS stock_status FROM chemicals WHERE current_stock::numeric < (min_stock::numeric * 1.2));--> statement-breakpoint
CREATE VIEW "public"."sku_match_view" AS (SELECT amazon_pricing.seller_sku, amazon_pricing.item_name, amazon_pricing.price AS amazon_price, variants.product_title, variants.price AS variant_price, variants.sku FROM amazon_pricing JOIN variants ON amazon_pricing.seller_sku::text = variants.sku::text);--> statement-breakpoint
CREATE VIEW "public"."standardized_coa_names" AS (SELECT id, original_filename, concat(compound_name, '_', COALESCE(cas_number, 'noCAS'::character varying), '_', COALESCE(batch_number, 'noBatch'::character varying), '_', manufacturer, '_', to_char(issue_date, 'YYYYMMDD'::text)) AS standardized_filename FROM coa_documents);--> statement-breakpoint
CREATE VIEW "public"."view_verified_products" AS (SELECT gav.item_sku, ap.item_name AS amazon_item_name, g.sku AS gs1_sku, g.product_description AS gs1_description, g.brand_name, g.gtin, gav.reviewed_at AS verified_at, vim.shopify_id FROM gs1_amazon_verification gav JOIN amazon_pricing ap ON gav.item_sku = ap.seller_sku::text JOIN amazon_gtins ag ON ag.item_sku = gav.item_sku JOIN gs1 g ON g.gtin_12_upc::text = ag.external_product_id::text LEFT JOIN variant_id_mappings vim ON vim.sku::text = gav.item_sku WHERE gav.verified_match = true);--> statement-breakpoint
CREATE VIEW "public"."view_amazon_with_gs1" AS (SELECT a.item_sku, a.item_name AS amazon_item_name, a.external_product_id, a.external_product_id_type, g.sku AS gs1_sku, g.gtin, g.gtin_12_upc, g.brand_name, g.product_description, g.product_description_short, g.label_description, g.is_variable, g.is_purchasable, g.status_label, g.height, g.width, g.depth, g.dimension_measure, g.gross_weight, g.net_weight, g.weight_measure, g.global_product_classification, g.image_url, g.image_url_validation, g.target_markets, g.last_modified_date FROM amazon_gtins a JOIN gs1 g ON a.external_product_id::text = g.gtin_12_upc::text);--> statement-breakpoint
CREATE VIEW "public"."google_ads_customer_list" AS (SELECT DISTINCT ON ((lower(COALESCE(c.email, o.email)))) COALESCE(c.email, o.email) AS email, COALESCE(c.first_name, o.first_name) AS first_name, COALESCE(c.last_name, o.last_name) AS last_name, COALESCE(c.default_address ->> 'country'::text, o.shipping_address ->> 'country'::text) AS country, COALESCE(c.default_address ->> 'zip'::text, o.shipping_address ->> 'zip'::text) AS zip, COALESCE(o.email, c.email) AS email_repeat, COALESCE(o.shipping_address ->> 'zip'::text, c.default_address ->> 'zip'::text) AS zip_repeat, COALESCE(o.phone, c.phone) AS phone, COALESCE(c.phone, o.phone) AS phone_repeat FROM shopify_sync_orders o LEFT JOIN shopify_sync_customers c ON o.customer_id = c.customer_id WHERE COALESCE(c.email, o.email) IS NOT NULL ORDER BY (lower(COALESCE(c.email, o.email))), o.processed_at DESC);--> statement-breakpoint
CREATE VIEW "public"."google_ads_customer_export" AS (SELECT lower(TRIM(BOTH FROM email)) AS email, regexp_replace(TRIM(BOTH FROM COALESCE(phone, phone_repeat)), '[^0-9+]'::text, ''::text, 'g'::text) AS phone, initcap(TRIM(BOTH FROM first_name)) AS first_name, initcap(TRIM(BOTH FROM last_name)) AS last_name, upper(COALESCE(NULLIF(TRIM(BOTH FROM country), ''::text), 'US'::text)) AS country, TRIM(BOTH FROM zip) AS zip FROM google_ads_customer_list WHERE email IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL AND zip IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."remaining_blank_gtins" AS (SELECT action, gs1companyprefix, gtin, packaginglevel, description, desc1language, brandname, brand1language, status, industry, isvariable, ispurchasable, sku, certified, height, width, depth, dimensionmeasure, grossweight, netweight, weightmeasure, comments, childgtins, quantity, subbrandname, productdescriptionshort, labeldescription, netcontent1count, netcontent1unitofmeasure, netcontent2count, netcontent2unitofmeasure, netcontent3count, netcontent3unitofmeasure, brandname2, brand2language, description2, desc2language, globalproductclassification, imageurl, targetmarkets FROM temp_blank_gtin b WHERE NOT (EXISTS ( SELECT 1 FROM temp_gtin_filld f WHERE f.gtin = b.gtin)));
*/