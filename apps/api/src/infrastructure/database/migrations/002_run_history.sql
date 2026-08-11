CREATE TABLE IF NOT EXISTS forecast_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_type VARCHAR(30) NOT NULL CHECK (run_type IN ('route_forecast', 'mission_evaluate', 'scenario_compare')),
  name VARCHAR(255),
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  verdict VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_runs_owner ON forecast_runs(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  route_input JSONB NOT NULL,
  departure_hours JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_scenarios_owner ON saved_scenarios(owner_id);
