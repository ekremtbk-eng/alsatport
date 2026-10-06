ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "recovery_email" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "recovery_email_verified_at" TIMESTAMPTZ(6);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "read_receipts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "marketing_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "marketing_sms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "marketing_push" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "marketing_updated_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" UUID NOT NULL,
  "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_blocks_blocker_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_blocks_blocked_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_pair_uidx" ON "user_blocks"("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks"("blocked_id");

CREATE TABLE IF NOT EXISTS "qr_tokens" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "secret_hash" TEXT,
  "user_id" UUID,
  "listing_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requester_agent" TEXT,
  "uploads" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "approved_at" TIMESTAMPTZ(6),
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "qr_tokens_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "qr_tokens_listing_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "qr_tokens_token_hash_uidx" ON "qr_tokens"("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "qr_tokens_secret_hash_uidx" ON "qr_tokens"("secret_hash");
CREATE INDEX IF NOT EXISTS "qr_tokens_expires_idx" ON "qr_tokens"("expires_at");
