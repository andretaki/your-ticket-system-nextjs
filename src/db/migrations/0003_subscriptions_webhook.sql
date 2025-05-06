-- Migration for Microsoft Graph webhook subscriptions

-- Drop the existing table if it exists with the older schema
DROP TABLE IF EXISTS "ticketing_prod"."subscriptions";

-- Create the updated subscriptions table
CREATE TABLE "ticketing_prod"."subscriptions" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "subscription_id" TEXT NOT NULL UNIQUE,
    "resource" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "notification_url" TEXT NOT NULL,
    "expiration_datetime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "client_state" TEXT,
    "creator_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index on expiration_datetime to improve renewal queries
CREATE INDEX "idx_subscription_expiration" ON "ticketing_prod"."subscriptions" ("expiration_datetime");

-- Add index on is_active for filtering active subscriptions
CREATE INDEX "idx_subscription_active" ON "ticketing_prod"."subscriptions" ("is_active"); 