ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "two_factor_method" TEXT NOT NULL DEFAULT 'email';
