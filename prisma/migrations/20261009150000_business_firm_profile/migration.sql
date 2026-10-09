-- Owner-entered service profile for verified businesses (working hours, service districts, price list,
-- announcements, FAQ). Additive only: new nullable / defaulted columns, existing rows keep their data.
ALTER TABLE "business_accounts"
  ADD COLUMN IF NOT EXISTS "working_hours" JSONB,
  ADD COLUMN IF NOT EXISTS "service_districts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "price_list" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "announcements" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "faq" JSONB NOT NULL DEFAULT '[]';
