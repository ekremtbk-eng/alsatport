-- 15-day listing period, sold state, server-side notifications and per-user notification preferences.
-- Additive only: no rows are deleted; the only data change is the expires_at backfill at the end.

ALTER TYPE "listing_status" ADD VALUE IF NOT EXISTS 'sold';

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "sold_at" TIMESTAMPTZ(6);
CREATE INDEX IF NOT EXISTS "listings_status_expires_idx" ON "listings" ("status", "expires_at");

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "listing_id" UUID,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL DEFAULT '',
  "event_key" TEXT NOT NULL,
  "in_app" BOOLEAN NOT NULL DEFAULT true,
  "emailed_at" TIMESTAMPTZ(6),
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_event_key_uidx" ON "notifications" ("event_key");
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications" ("user_id", "created_at");

-- Existing live listings move onto the 15-day rule starting at deploy time.
-- Listings that would already end sooner keep their date; demo listings (APD- numbers or demo sellers) are untouched.
UPDATE "listings" AS l
SET "expires_at" = CURRENT_TIMESTAMP + INTERVAL '15 days'
WHERE l."status" = 'active'
  AND l."deleted_at" IS NULL
  AND (l."expires_at" IS NULL OR l."expires_at" > CURRENT_TIMESTAMP + INTERVAL '15 days')
  AND l."listing_no" NOT LIKE 'APD-%'
  AND NOT EXISTS (
    SELECT 1 FROM "users" AS u
    WHERE u."id" = l."seller_id" AND u."email" ILIKE '%@demo.alsatport.com'
  );
