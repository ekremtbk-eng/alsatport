-- Persist email/phone OTP so serverless instances share the same challenge.
CREATE TABLE "verification_otps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_otps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_otps_user_kind_uidx" ON "verification_otps"("user_id", "kind");
CREATE INDEX "verification_otps_expires_idx" ON "verification_otps"("expires_at");
