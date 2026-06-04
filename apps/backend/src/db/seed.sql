-- Karachi Courier — seed data
-- Run after schema: psql $DATABASE_URL -f apps/backend/src/db/seed.sql
--
-- Test admin (change in production):
--   phone: +923001234567
--   email: admin@karachicourier.pk
--   password: admin123

-- ---------------------------------------------------------------------------
-- Karachi delivery zones
-- ---------------------------------------------------------------------------

INSERT INTO zones (id, name, is_active) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'DHA', TRUE),
  ('a1000001-0000-4000-8000-000000000002', 'Clifton', TRUE),
  ('a1000001-0000-4000-8000-000000000003', 'Gulshan', TRUE),
  ('a1000001-0000-4000-8000-000000000004', 'Saddar', TRUE),
  ('a1000001-0000-4000-8000-000000000005', 'SITE', TRUE),
  ('a1000001-0000-4000-8000-000000000006', 'Korangi', TRUE),
  ('a1000001-0000-4000-8000-000000000007', 'North Karachi', TRUE),
  ('a1000001-0000-4000-8000-000000000008', 'Malir', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Test admin user (bcryptjs)
-- ---------------------------------------------------------------------------

INSERT INTO users (id, name, phone, email, password_hash, role)
SELECT
  'b2000001-0000-4000-8000-000000000001',
  'System Admin',
  '+923001234567',
  'admin@karachicourier.pk',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'::user_role
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE phone = '+923001234567'
);

UPDATE users
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE phone = '+923001234567';
