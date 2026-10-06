ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "business_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "business_verified_at" TIMESTAMPTZ(6);
