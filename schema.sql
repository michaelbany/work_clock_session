-- Run this in Neon SQL editor to create the table
CREATE TABLE IF NOT EXISTS work_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  intervals   JSONB NOT NULL DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL DEFAULT 'running',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
