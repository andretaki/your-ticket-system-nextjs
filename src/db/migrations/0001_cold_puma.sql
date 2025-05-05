ALTER TABLE "tickets" ALTER COLUMN "reporter_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_mailgun_message_id_key" UNIQUE("external_message_id");--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_mailgun_message_id_key" UNIQUE("external_message_id");