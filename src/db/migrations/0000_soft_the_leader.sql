-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "ticketing_prod";
--> statement-breakpoint
CREATE TYPE "ticketing_prod"."ticket_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "ticketing_prod"."ticket_status_enum" AS ENUM('new', 'open', 'in_progress', 'pending_customer', 'closed');--> statement-breakpoint
CREATE TYPE "ticketing_prod"."ticket_type_ecommerce_enum" AS ENUM('Return', 'Shipping Issue', 'Order Issue', 'New Order', 'Credit Request', 'COA Request', 'COC Request', 'SDS Request', 'Quote Request', 'General Inquiry', 'Test Entry');--> statement-breakpoint
CREATE TYPE "ticketing_prod"."ticketing_role_enum" AS ENUM('Admin', 'Project Manager', 'Developer', 'Submitter', 'Viewer', 'Other');--> statement-breakpoint
CREATE TYPE "ticketing_prod"."user_role" AS ENUM('admin', 'manager', 'user');--> statement-breakpoint
CREATE TABLE "ticketing_prod"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "ticketing_prod"."ticket_status_enum" DEFAULT 'new' NOT NULL,
	"priority" "ticketing_prod"."ticket_priority_enum" DEFAULT 'medium' NOT NULL,
	"type" "ticketing_prod"."ticket_type_ecommerce_enum",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assignee_id" text,
	"reporter_id" text NOT NULL,
	"order_number" varchar(255),
	"tracking_number" varchar(255),
	"sender_email" varchar(255),
	"sender_name" varchar(255),
	"external_message_id" varchar(255),
	CONSTRAINT "tickets_external_message_id_unique" UNIQUE("external_message_id"),
	CONSTRAINT "tickets_mailgun_message_id_key" UNIQUE("external_message_id")
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"comment_text" text NOT NULL,
	"commenter_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_from_customer" boolean DEFAULT false NOT NULL,
	"is_internal_note" boolean DEFAULT false NOT NULL,
	"is_outgoing_reply" boolean DEFAULT false NOT NULL,
	"external_message_id" varchar(255),
	CONSTRAINT "ticket_comments_external_message_id_unique" UNIQUE("external_message_id"),
	CONSTRAINT "ticket_comments_mailgun_message_id_key" UNIQUE("external_message_id")
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"name" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"role" "ticketing_prod"."user_role" DEFAULT 'user' NOT NULL,
	"email_verified" timestamp,
	"reset_token" varchar(255),
	"reset_token_expiry" timestamp,
	"ticketing_role" "ticketing_prod"."ticketing_role_enum",
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"resource" text NOT NULL,
	"change_type" text NOT NULL,
	"notification_url" text NOT NULL,
	"expiration_datetime" timestamp with time zone NOT NULL,
	"client_state" text,
	"creator_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"renewal_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_subscription_id_unique" UNIQUE("subscription_id")
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "ticketing_prod"."accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "ticketing_prod"."tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "ticketing_prod"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticketing_prod"."tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "ticketing_prod"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticketing_prod"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "ticketing_prod"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticketing_prod"."ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "ticketing_prod"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticketing_prod"."ticket_comments" ADD CONSTRAINT "ticket_comments_commenter_id_users_id_fk" FOREIGN KEY ("commenter_id") REFERENCES "ticketing_prod"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticketing_prod"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "ticketing_prod"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_subscription_active" ON "ticketing_prod"."subscriptions" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_subscription_expiration" ON "ticketing_prod"."subscriptions" USING btree ("expiration_datetime" timestamptz_ops);
*/