ALTER TABLE "profiles" ADD COLUMN "open_access_until" TIMESTAMPTZ(6);

UPDATE "profiles"
SET
  "open_access_until" = NOW() + INTERVAL '90 days',
  "plan" = 'vip',
  "plan_listing_allowance" = GREATEST("plan_listing_allowance", 10000),
  "plan_until" = GREATEST(COALESCE("plan_until", NOW()), NOW() + INTERVAL '90 days'),
  "doping_until" = GREATEST(COALESCE("doping_until", NOW()), NOW() + INTERVAL '90 days')
WHERE "open_access_until" IS NULL;
