-- ==============================================================================
-- Remote PostgreSQL Database Initialization Script for Users Table
-- Target Clouds: Neon / Supabase / AWS RDS / Render / Heroku Postgres
-- Product: Sales CRM - a product of SHAMIIT LLP
-- ==============================================================================

-- 1. Enable Cryptographic UUID Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Remote Users Table with Native UUID & JSONB
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'sales_rep',
    google_tokens JSONB DEFAULT NULL,
    google_connected_email VARCHAR(255) DEFAULT NULL,
    drive_folder_id VARCHAR(255) DEFAULT NULL,
    drive_sheet_file_id VARCHAR(255) DEFAULT NULL,
    drive_last_synced_at TIMESTAMPTZ DEFAULT NULL,
    sync_version INTEGER DEFAULT 1,
    synced_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. High Performance B-Tree & GIN Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_email ON users (google_connected_email);
CREATE INDEX IF NOT EXISTS idx_users_google_tokens ON users USING gin (google_tokens);

-- 4. Automated updated_at Timestamp Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Sample Verification Query:
-- SELECT id, name, email, google_tokens->>'access_token' AS token_snippet FROM users;
-- ==============================================================================
