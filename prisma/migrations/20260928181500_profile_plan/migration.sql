-- Entitlement fields used by auth + listing quota
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan plan_id NOT NULL DEFAULT 'standart',
  ADD COLUMN IF NOT EXISTS doping_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_until TIMESTAMPTZ;
