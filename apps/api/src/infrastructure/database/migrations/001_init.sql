CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aircraft_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  cruise_speed_kmh NUMERIC(8, 2) NOT NULL DEFAULT 80,
  max_duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 4,
  thresholds JSONB NOT NULL DEFAULT '{}',
  fusion_source_ids JSONB NOT NULL DEFAULT '[]',
  fusion_weights JSONB NOT NULL DEFAULT '[]',
  ai_model_id VARCHAR(100),
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES aircraft_profiles(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  waypoints JSONB NOT NULL DEFAULT '[]',
  planned_duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_owner ON aircraft_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_missions_owner ON missions(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
