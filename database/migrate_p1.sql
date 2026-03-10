-- ============================================================
-- Sanestix Flow — Phase 1 Migration
-- Multi-User & Roles
-- ============================================================

-- 1. Update users table: new role values + missing columns
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'agent', 'viewer'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline' 
  CHECK (status IN ('online', 'away', 'offline'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(100) NOT NULL,
  role         VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'agent', 'viewer')),
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- 3. Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(255) NOT NULL,
  role         VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'agent', 'viewer')),
  token        TEXT UNIQUE NOT NULL,
  workspace_id VARCHAR(100) NOT NULL,
  invited_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(100) NOT NULL,
  target     VARCHAR(255),
  metadata   JSONB,
  ip         VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

