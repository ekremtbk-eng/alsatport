# Rollback plan — 20261007090000_listing_lifecycle_notifications

Nothing here is executed automatically. Every write step needs explicit owner approval.

## 0. Before deploy (recommended)
1. Neon console → create a branch (point-in-time snapshot) of the production branch, name `pre-lifecycle-20261007`.
   This is the full-data safety net; restoring it reverts everything in one step.
2. Optional, inside production (write — needs approval): keep the exact pre-backfill dates.
   ```sql
   CREATE TABLE IF NOT EXISTS listings_expires_backup_20261007 AS
   SELECT l.id, l.expires_at, now() AS captured_at
   FROM listings l
   WHERE l.status = 'active' AND l.deleted_at IS NULL
     AND (l.expires_at IS NULL OR l.expires_at > now() + interval '15 days')
     AND l.listing_no NOT LIKE 'APD-%'
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = l.seller_id AND u.email ILIKE '%@demo.alsatport.com');
   ```

## 1. Migration fails during the Vercel build
- Prisma runs the file as one implicit transaction: on error every statement (enum value, columns, table, backfill) is rolled back. No data changes.
- The build fails, so Vercel does not promote the deployment; the current production deployment keeps serving.
- Before retrying, mark it rolled back: `npx prisma migrate resolve --rolled-back 20261007090000_listing_lifecycle_notifications`.

## 2. Migration succeeded but the release must be reverted
1. Vercel → Instant Rollback to the previous production deployment (`vercel rollback`).
2. The old Prisma client does not know `status = 'sold'`; convert those rows first (write — needs approval):
   ```sql
   UPDATE listings SET status = 'passive' WHERE status = 'sold';
   ```
3. Restore original expiry dates if wanted (requires step 0.2):
   ```sql
   UPDATE listings l SET expires_at = b.expires_at
   FROM listings_expires_backup_20261007 b WHERE l.id = b.id;
   ```
4. The additive objects (`sold_at`, `notification_prefs`, `notifications`, the indexes, the `sold` enum value) are ignored by the old code and can stay. Remove them only if required, after steps 2–3:
   ```sql
   DROP TABLE IF EXISTS notifications;
   ALTER TABLE profiles DROP COLUMN IF EXISTS notification_prefs;
   DROP INDEX IF EXISTS listings_status_expires_idx;
   ALTER TABLE listings DROP COLUMN IF EXISTS sold_at;
   DELETE FROM _prisma_migrations WHERE migration_name = '20261007090000_listing_lifecycle_notifications';
   ```
   The `sold` enum value cannot be dropped in place; leaving it is harmless.

## 3. Last resort
Restore the Neon branch from step 0.1 (or Neon point-in-time restore to just before the deploy). Data written after that moment is lost, so prefer section 2.
