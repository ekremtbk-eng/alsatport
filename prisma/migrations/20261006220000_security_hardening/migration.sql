ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "security_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'password',
  "device_hash" TEXT,
  "user_agent" TEXT,
  "ip_masked" TEXT,
  "mfa_at" TIMESTAMPTZ(6),
  "step_up_at" TIMESTAMPTZ(6),
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "revoked_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx" ON "user_sessions"("user_id", "revoked_at");
CREATE INDEX IF NOT EXISTS "user_sessions_device_idx" ON "user_sessions"("user_id", "device_hash");
CREATE INDEX IF NOT EXISTS "user_sessions_expires_idx" ON "user_sessions"("expires_at");

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_idx" ON "rate_limit_buckets"("reset_at");
