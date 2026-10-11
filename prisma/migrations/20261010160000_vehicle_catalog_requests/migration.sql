-- Missing-vehicle requests from users, reviewed by admins. Additive only: one new table, no existing data touched.
-- Rollback: DROP TABLE "vehicle_catalog_requests"; (no other object depends on it)
CREATE TABLE IF NOT EXISTS "vehicle_catalog_requests" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "segment" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "series" TEXT NOT NULL DEFAULT '',
  "engine" TEXT NOT NULL DEFAULT '',
  "year_from" INTEGER,
  "year_to" INTEGER,
  "note" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reject_reason" TEXT,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "vehicle_catalog_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_catalog_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "vehicle_catalog_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "vehicle_catalog_requests_status_idx" ON "vehicle_catalog_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "vehicle_catalog_requests_user_idx" ON "vehicle_catalog_requests"("user_id", "created_at");
