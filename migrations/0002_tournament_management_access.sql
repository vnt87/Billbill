-- Migration 0002: Add passphrase-gated management credentials.
ALTER TABLE tournaments ADD COLUMN management_passphrase_hash TEXT;
ALTER TABLE tournaments ADD COLUMN management_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournaments_management_hash ON tournaments(management_token_hash);
