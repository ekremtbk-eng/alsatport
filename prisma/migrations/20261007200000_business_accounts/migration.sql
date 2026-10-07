-- Corporate applications / public stores. Additive only: no existing table or row is modified.

-- CreateEnum
CREATE TYPE "business_status" AS ENUM ('pending', 'approved', 'rejected', 'revoked');

-- CreateEnum
CREATE TYPE "business_company_type" AS ENUM ('sahis', 'limited', 'anonim', 'diger');

-- CreateTable
CREATE TABLE "business_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "business_status" NOT NULL DEFAULT 'pending',
    "name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "company_type" "business_company_type" NOT NULL,
    "tax_office" TEXT NOT NULL,
    "tax_number" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "website" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "logo_url" TEXT,
    "cover_url" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "tier_until" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_accounts_user_uidx" ON "business_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_accounts_slug_uidx" ON "business_accounts"("slug");

-- CreateIndex
CREATE INDEX "business_accounts_status_submitted_idx" ON "business_accounts"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "business_accounts_status_city_idx" ON "business_accounts"("status", "city", "district");

-- CreateIndex
CREATE INDEX "business_accounts_status_category_idx" ON "business_accounts"("status", "category_id");

-- AddForeignKey
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
