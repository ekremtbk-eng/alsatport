-- AlsatPort PostgreSQL schema — Prisma migration init
-- Requires PostgreSQL 14+.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('member', 'seller', 'admin');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'apple', 'facebook');
CREATE TYPE listing_status AS ENUM (
  'draft',
  'pending',
  'active',
  'passive',
  'expired',
  'rejected',
  'removed'
);
CREATE TYPE plan_id AS ENUM ('standart', 'profesyonel', 'vip');
CREATE TYPE shop_product AS ENUM ('profesyonel', 'vip', 'doping');
CREATE TYPE payment_provider AS ENUM ('paytr', 'iyzico', 'stripe', 'sandbox');
CREATE TYPE payment_status AS ENUM (
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'canceled',
  'refunded'
);
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'canceled');
CREATE TYPE report_target AS ENUM ('listing', 'user', 'message');
CREATE TYPE report_reason AS ENUM (
  'spam',
  'fraud',
  'inappropriate',
  'counterfeit',
  'wrong_category',
  'other'
);
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE promotion_kind AS ENUM ('featured', 'urgent', 'doping');

-- ---------------------------------------------------------------------------
-- 1. users & profiles
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  username        TEXT NOT NULL,
  password_hash   TEXT,
  provider        auth_provider NOT NULL DEFAULT 'email',
  provider_sub    TEXT,
  role            user_role NOT NULL DEFAULT 'member',
  email_verified_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  banned_at       TIMESTAMPTZ,
  banned_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_len CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT users_username_len CHECK (char_length(username) BETWEEN 2 AND 40),
  CONSTRAINT users_email_provider_hash CHECK (
    (provider = 'email' AND password_hash IS NOT NULL)
    OR (provider <> 'email')
  )
);

CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));
CREATE UNIQUE INDEX users_username_lower_uidx ON users (lower(username));
CREATE UNIQUE INDEX users_provider_sub_uidx
  ON users (provider, provider_sub)
  WHERE provider_sub IS NOT NULL;
CREATE INDEX users_role_idx ON users (role);
CREATE INDEX users_banned_idx ON users (banned_at)
  WHERE banned_at IS NOT NULL;

CREATE TABLE profiles (
  user_id               UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  full_name             TEXT,
  avatar_url            TEXT,
  phone                 TEXT,
  phone_verified_at     TIMESTAMPTZ,
  birth_date            DATE,
  national_id           TEXT,
  address               TEXT,
  city                  TEXT,
  verified              BOOLEAN NOT NULL DEFAULT false,
  profile_complete      BOOLEAN NOT NULL DEFAULT false,
  listings_posted       INTEGER NOT NULL DEFAULT 0,
  sales_count           INTEGER NOT NULL DEFAULT 0,
  stars                 INTEGER NOT NULL DEFAULT 0,
  followers             INTEGER NOT NULL DEFAULT 0,
  following             INTEGER NOT NULL DEFAULT 0,
  free_listing_quota    INTEGER NOT NULL DEFAULT 3,
  plan_listing_allowance INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT profiles_quota_nonneg CHECK (
    listings_posted >= 0
    AND sales_count >= 0
    AND stars >= 0
    AND followers >= 0
    AND following >= 0
    AND free_listing_quota >= 0
    AND plan_listing_allowance >= 0
  )
);

CREATE UNIQUE INDEX profiles_phone_uidx
  ON profiles (phone)
  WHERE phone IS NOT NULL AND phone <> '';
CREATE UNIQUE INDEX profiles_national_id_uidx
  ON profiles (national_id)
  WHERE national_id IS NOT NULL AND national_id <> '';
CREATE INDEX profiles_city_idx ON profiles (city);
CREATE INDEX profiles_verified_idx ON profiles (verified)
  WHERE verified = true;

-- ---------------------------------------------------------------------------
-- 2. categories (self-tree; ids match src/data/categories.ts)
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES categories (id) ON DELETE RESTRICT,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  nav_hidden  BOOLEAN NOT NULL DEFAULT false,
  filter_key  TEXT,
  aliases     TEXT[] NOT NULL DEFAULT '{}',
  brands      TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_no_self_parent CHECK (parent_id IS DISTINCT FROM id),
  CONSTRAINT categories_slug_len CHECK (char_length(slug) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX categories_slug_uidx ON categories (slug);
CREATE INDEX categories_parent_sort_idx ON categories (parent_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3. listings & listing_images
-- ---------------------------------------------------------------------------

CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_no      TEXT NOT NULL,
  seller_id       UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  category_id     TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  price           NUMERIC(14, 2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'TRY',
  city            TEXT NOT NULL,
  district        TEXT NOT NULL DEFAULT '',
  neighborhood    TEXT NOT NULL DEFAULT '',
  status          listing_status NOT NULL DEFAULT 'draft',
  featured        BOOLEAN NOT NULL DEFAULT false,
  vip             BOOLEAN NOT NULL DEFAULT false,
  urgent          BOOLEAN NOT NULL DEFAULT false,
  refurbished     BOOLEAN NOT NULL DEFAULT false,
  views           INTEGER NOT NULL DEFAULT 0,
  specs           JSONB NOT NULL DEFAULT '[]'::jsonb,
  features        JSONB NOT NULL DEFAULT '[]'::jsonb,
  chassis         JSONB,
  posted_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT listings_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT listings_price_nonneg CHECK (price >= 0),
  CONSTRAINT listings_views_nonneg CHECK (views >= 0),
  CONSTRAINT listings_currency_len CHECK (char_length(currency) = 3)
);

CREATE UNIQUE INDEX listings_listing_no_uidx ON listings (listing_no);
CREATE INDEX listings_seller_status_idx ON listings (seller_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX listings_category_status_posted_idx
  ON listings (category_id, status, posted_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX listings_city_district_idx ON listings (city, district)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX listings_price_idx ON listings (price)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX listings_posted_idx ON listings (posted_at DESC)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX listings_featured_idx ON listings (featured, vip)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX listings_urgent_idx ON listings (urgent)
  WHERE deleted_at IS NULL AND status = 'active' AND urgent = true;
CREATE INDEX listings_expires_idx ON listings (expires_at)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX listings_title_trgm_idx ON listings USING gin (title gin_trgm_ops);
CREATE INDEX listings_description_trgm_idx ON listings USING gin (description gin_trgm_ops);

CREATE TABLE listing_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  storage_key  TEXT NOT NULL,
  url          TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_cover     BOOLEAN NOT NULL DEFAULT false,
  width        INTEGER,
  height       INTEGER,
  mime         TEXT,
  byte_size    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_images_sort_nonneg CHECK (sort_order >= 0),
  CONSTRAINT listing_images_size_nonneg CHECK (byte_size IS NULL OR byte_size > 0)
);

CREATE UNIQUE INDEX listing_images_listing_sort_uidx
  ON listing_images (listing_id, sort_order);
CREATE UNIQUE INDEX listing_images_one_cover_uidx
  ON listing_images (listing_id)
  WHERE is_cover = true;
CREATE INDEX listing_images_listing_idx ON listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- 4. favorites
-- ---------------------------------------------------------------------------

CREATE TABLE favorites (
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX favorites_listing_idx ON favorites (listing_id);
CREATE INDEX favorites_user_created_idx ON favorites (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. conversations & messages
-- ---------------------------------------------------------------------------

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES listings (id) ON DELETE SET NULL,
  buyer_id        UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  seller_id       UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  last_message_at TIMESTAMPTZ,
  last_message    TEXT,
  buyer_archived_at  TIMESTAMPTZ,
  seller_archived_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_parties CHECK (buyer_id <> seller_id)
);

CREATE UNIQUE INDEX conversations_listing_buyer_seller_uidx
  ON conversations (listing_id, buyer_id, seller_id)
  WHERE listing_id IS NOT NULL;
CREATE INDEX conversations_buyer_last_idx ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX conversations_seller_last_idx ON conversations (seller_id, last_message_at DESC);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  body             TEXT NOT NULL,
  read_at          TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_len CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX messages_conversation_created_idx
  ON messages (conversation_id, created_at);
CREATE INDEX messages_unread_idx
  ON messages (conversation_id, created_at)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- Read-state per participant (authorization + unread counts)
CREATE TABLE conversation_reads (
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 6. payments, subscriptions, listing promotions
-- ---------------------------------------------------------------------------

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  listing_id       UUID REFERENCES listings (id) ON DELETE SET NULL,
  product          shop_product NOT NULL,
  provider         payment_provider NOT NULL,
  provider_ref     TEXT,
  amount           NUMERIC(12, 2) NOT NULL,
  currency         CHAR(3) NOT NULL DEFAULT 'TRY',
  status           payment_status NOT NULL DEFAULT 'pending',
  idempotency_key  TEXT NOT NULL,
  failure_code     TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_nonneg CHECK (amount >= 0)
);

CREATE UNIQUE INDEX payments_idempotency_uidx ON payments (idempotency_key);
CREATE UNIQUE INDEX payments_provider_ref_uidx
  ON payments (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;
CREATE INDEX payments_user_created_idx ON payments (user_id, created_at DESC);
CREATE INDEX payments_status_idx ON payments (status);

CREATE TABLE subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan         plan_id NOT NULL,
  status       subscription_status NOT NULL DEFAULT 'active',
  payment_id   UUID REFERENCES payments (id) ON DELETE SET NULL,
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_window CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX subscriptions_user_status_idx ON subscriptions (user_id, status, ends_at);
CREATE UNIQUE INDEX subscriptions_one_active_paid_uidx
  ON subscriptions (user_id)
  WHERE status = 'active' AND plan IN ('profesyonel', 'vip');

CREATE TABLE listing_promotions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  payment_id   UUID REFERENCES payments (id) ON DELETE SET NULL,
  kind         promotion_kind NOT NULL,
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_promotions_window CHECK (ends_at > starts_at)
);

CREATE INDEX listing_promotions_active_idx
  ON listing_promotions (listing_id, kind, ends_at);

-- ---------------------------------------------------------------------------
-- 7. reports & audit_logs
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id        UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  target_type        report_target NOT NULL,
  listing_id         UUID REFERENCES listings (id) ON DELETE SET NULL,
  reported_user_id   UUID REFERENCES users (id) ON DELETE SET NULL,
  message_id         UUID REFERENCES messages (id) ON DELETE SET NULL,
  reason             report_reason NOT NULL,
  details            TEXT,
  status             report_status NOT NULL DEFAULT 'open',
  assigned_admin_id  UUID REFERENCES users (id) ON DELETE SET NULL,
  resolution         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_target_shape CHECK (
    (target_type = 'listing' AND listing_id IS NOT NULL)
    OR (target_type = 'user' AND reported_user_id IS NOT NULL)
    OR (target_type = 'message' AND message_id IS NOT NULL)
  )
);

CREATE INDEX reports_status_created_idx ON reports (status, created_at DESC);
CREATE INDEX reports_listing_idx ON reports (listing_id)
  WHERE listing_id IS NOT NULL;
CREATE INDEX reports_reported_user_idx ON reports (reported_user_id)
  WHERE reported_user_id IS NOT NULL;
CREATE UNIQUE INDEX reports_open_listing_uidx
  ON reports (reporter_id, listing_id, reason)
  WHERE status IN ('open', 'reviewing') AND listing_id IS NOT NULL;

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users (id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,
  ip           INET,
  user_agent   TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_len CHECK (char_length(action) BETWEEN 1 AND 80)
);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_id, created_at DESC);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Authorization helpers (row-level; enable later in app migrations)
-- ---------------------------------------------------------------------------

-- Conversation participant check used by API:
--   user_id IN (buyer_id, seller_id)
-- Listing mutate:
--   seller_id = auth.uid() OR role = 'admin'
-- Favorites:
--   user_id = auth.uid()
