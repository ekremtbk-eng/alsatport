-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "listing_id" UUID,
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_reviews_seller_author_uidx" ON "seller_reviews"("seller_id", "author_id");
CREATE INDEX "seller_reviews_seller_created_idx" ON "seller_reviews"("seller_id", "created_at");

ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
