-- Migration 0001: Create tournaments table for D1 persistence
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  admin_token_hash TEXT NOT NULL UNIQUE,
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournaments_admin_hash ON tournaments(admin_token_hash);
CREATE INDEX IF NOT EXISTS idx_tournaments_public_id ON tournaments(public_id);
