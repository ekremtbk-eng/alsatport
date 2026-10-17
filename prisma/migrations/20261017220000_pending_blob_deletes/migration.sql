-- Durable queue for managed Blob deletes (KVKK stage 2A).
-- Additive only. No existing tables altered.
-- Rollback: DROP TABLE IF EXISTS "pending_blob_deletes";
CREATE TABLE IF NOT EXISTS "pending_blob_deletes" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error_code" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "pending_blob_deletes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pending_blob_deletes_storage_key_key" ON "pending_blob_deletes"("storage_key");
CREATE INDEX IF NOT EXISTS "pending_blob_deletes_poll_idx" ON "pending_blob_deletes"("status", "next_attempt_at");
