-- Private profile place and commercial-message consent ledger.
-- Nullable columns: existing accounts keep working with empty place and no consent rows.
-- Not applied to production by this change.

ALTER TABLE "profiles" ADD COLUMN "district" TEXT;
ALTER TABLE "profiles" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "profiles" ADD COLUMN "kvkk_notified_at" TIMESTAMPTZ(6);
ALTER TABLE "profiles" ADD COLUMN "terms_accepted_at" TIMESTAMPTZ(6);

CREATE TABLE "marketing_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "text_version" TEXT NOT NULL,
    "iys_status" TEXT NOT NULL DEFAULT 'not_submitted',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketing_consents_user_channel_idx" ON "marketing_consents"("user_id", "channel", "created_at");

ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
