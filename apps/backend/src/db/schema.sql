-- Karachi Courier — PostgreSQL schema
-- Run: psql $DATABASE_URL -f apps/backend/src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('client', 'rider', 'admin');

CREATE TYPE shipment_status AS ENUM (
  'pending',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'failed',
  'cancelled'
);

CREATE TYPE payment_method AS ENUM ('cod', 'jazzcash', 'easypaisa', 'prepaid');

CREATE TYPE shift_status AS ENUM ('active', 'ended');

-- ---------------------------------------------------------------------------
-- Tracking number sequence (KHI-XXXXXX)
-- ---------------------------------------------------------------------------

CREATE SEQUENCE shipment_tracking_seq
  START WITH 100001
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('shipment_tracking_seq');
  RETURN 'KHI-' || lpad(seq_val::TEXT, 6, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_unique UNIQUE (phone),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_created_at ON users (created_at);

-- ---------------------------------------------------------------------------
-- 2. clients
-- ---------------------------------------------------------------------------

CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  address       TEXT NOT NULL,
  area          TEXT NOT NULL,
  city          TEXT NOT NULL DEFAULT 'Karachi',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients (user_id);
CREATE INDEX idx_clients_area ON clients (area);
CREATE INDEX idx_clients_is_active ON clients (is_active);

-- ---------------------------------------------------------------------------
-- 3. zones
-- ---------------------------------------------------------------------------

CREATE TABLE zones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_zones_is_active ON zones (is_active);

-- ---------------------------------------------------------------------------
-- 4. riders
-- ---------------------------------------------------------------------------

CREATE TABLE riders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  cnic         TEXT NOT NULL,
  bike_number  TEXT NOT NULL,
  is_on_shift  BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat  DOUBLE PRECISION,
  current_lng  DOUBLE PRECISION,
  zone         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT riders_cnic_unique UNIQUE (cnic),
  CONSTRAINT riders_bike_number_unique UNIQUE (bike_number)
);

CREATE INDEX idx_riders_user_id ON riders (user_id);
CREATE INDEX idx_riders_zone ON riders (zone);
CREATE INDEX idx_riders_is_on_shift ON riders (is_on_shift);

-- ---------------------------------------------------------------------------
-- 5. shipments
-- ---------------------------------------------------------------------------

CREATE TABLE shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number   TEXT NOT NULL UNIQUE DEFAULT generate_tracking_number(),
  client_id         UUID NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  rider_id          UUID REFERENCES riders (id) ON DELETE SET NULL,
  pickup_address    TEXT NOT NULL,
  pickup_lat        DOUBLE PRECISION,
  pickup_lng        DOUBLE PRECISION,
  pickup_area       TEXT NOT NULL,
  delivery_address  TEXT NOT NULL,
  delivery_lat      DOUBLE PRECISION,
  delivery_lng      DOUBLE PRECISION,
  delivery_area     TEXT NOT NULL,
  recipient_name    TEXT NOT NULL,
  recipient_phone   TEXT NOT NULL,
  status            shipment_status NOT NULL DEFAULT 'pending',
  payment_method    payment_method NOT NULL,
  cod_amount        NUMERIC(12, 2),
  weight_kg         NUMERIC(8, 3) NOT NULL DEFAULT 0.5,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shipments_cod_amount_check CHECK (
    cod_amount IS NULL OR cod_amount >= 0
  ),
  CONSTRAINT shipments_weight_check CHECK (weight_kg > 0)
);

CREATE TRIGGER shipments_set_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

CREATE INDEX idx_shipments_tracking_number ON shipments (tracking_number);
CREATE INDEX idx_shipments_client_id ON shipments (client_id);
CREATE INDEX idx_shipments_rider_id ON shipments (rider_id);
CREATE INDEX idx_shipments_status ON shipments (status);
CREATE INDEX idx_shipments_created_at ON shipments (created_at DESC);
CREATE INDEX idx_shipments_client_status ON shipments (client_id, status);
CREATE INDEX idx_shipments_rider_status ON shipments (rider_id, status)
  WHERE rider_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. shipment_status_log
-- ---------------------------------------------------------------------------

CREATE TABLE shipment_status_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id  UUID NOT NULL REFERENCES shipments (id) ON DELETE CASCADE,
  status       shipment_status NOT NULL,
  changed_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipment_status_log_shipment_id ON shipment_status_log (shipment_id);
CREATE INDEX idx_shipment_status_log_created_at ON shipment_status_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. cod_ledger
-- ---------------------------------------------------------------------------

CREATE TABLE cod_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id        UUID NOT NULL REFERENCES riders (id) ON DELETE RESTRICT,
  shipment_id     UUID NOT NULL UNIQUE REFERENCES shipments (id) ON DELETE RESTRICT,
  amount          NUMERIC(12, 2) NOT NULL,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reconciled      BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at   TIMESTAMPTZ,
  reconciled_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT cod_ledger_amount_check CHECK (amount >= 0),
  CONSTRAINT cod_ledger_reconciled_check CHECK (
    (reconciled = FALSE AND reconciled_at IS NULL)
    OR (reconciled = TRUE AND reconciled_at IS NOT NULL)
  )
);

CREATE INDEX idx_cod_ledger_rider_id ON cod_ledger (rider_id);
CREATE INDEX idx_cod_ledger_shipment_id ON cod_ledger (shipment_id);
CREATE INDEX idx_cod_ledger_reconciled ON cod_ledger (reconciled);
CREATE INDEX idx_cod_ledger_collected_at ON cod_ledger (collected_at DESC);

-- ---------------------------------------------------------------------------
-- 8. proof_of_delivery
-- ---------------------------------------------------------------------------

CREATE TABLE proof_of_delivery (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id    UUID NOT NULL UNIQUE REFERENCES shipments (id) ON DELETE CASCADE,
  photo_url      TEXT,
  signature_url  TEXT,
  delivery_lat   DOUBLE PRECISION,
  delivery_lng   DOUBLE PRECISION,
  delivered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT
);

CREATE INDEX idx_proof_of_delivery_shipment_id ON proof_of_delivery (shipment_id);
CREATE INDEX idx_proof_of_delivery_delivered_at ON proof_of_delivery (delivered_at DESC);

-- ---------------------------------------------------------------------------
-- 9. shifts
-- ---------------------------------------------------------------------------

CREATE TABLE shifts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id            UUID NOT NULL REFERENCES riders (id) ON DELETE CASCADE,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  total_cod_collected NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_deliveries    INTEGER NOT NULL DEFAULT 0,
  status              shift_status NOT NULL DEFAULT 'active',
  CONSTRAINT shifts_totals_check CHECK (
    total_cod_collected >= 0 AND total_deliveries >= 0
  ),
  CONSTRAINT shifts_ended_check CHECK (
    (status = 'active' AND ended_at IS NULL)
    OR (status = 'ended' AND ended_at IS NOT NULL)
  )
);

CREATE INDEX idx_shifts_rider_id ON shifts (rider_id);
CREATE INDEX idx_shifts_status ON shifts (status);
CREATE INDEX idx_shifts_started_at ON shifts (started_at DESC);

-- ---------------------------------------------------------------------------
-- 10. notifications
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
