CREATE TABLE "special_days" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "year" INTEGER,
    "duration_days" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "theme" TEXT NOT NULL DEFAULT 'milli',
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "closing" TEXT NOT NULL,
    "cta" TEXT NOT NULL DEFAULT 'Teşekkürler',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "special_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "special_days_slug_key" ON "special_days"("slug");
CREATE INDEX "special_days_active_md_idx" ON "special_days"("active", "month", "day");
