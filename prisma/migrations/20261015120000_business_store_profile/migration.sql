-- Store profile display choices and team list. Additive only: new columns with defaults, no existing data changed.
-- Rollback: ALTER TABLE "business_accounts" DROP COLUMN "show_contact_name", DROP COLUMN "show_phone", DROP COLUMN "show_email", DROP COLUMN "team";
ALTER TABLE "business_accounts" ADD COLUMN IF NOT EXISTS "show_contact_name" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_accounts" ADD COLUMN IF NOT EXISTS "show_phone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_accounts" ADD COLUMN IF NOT EXISTS "show_email" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "business_accounts" ADD COLUMN IF NOT EXISTS "team" JSONB NOT NULL DEFAULT '[]';
