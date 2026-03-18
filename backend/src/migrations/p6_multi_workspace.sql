-- ============================================
-- P6 Migration: Multi-Workspace Isolation
-- ============================================

-- 1. Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255)  NOT NULL,
  slug            VARCHAR(100)  NOT NULL UNIQUE,
  phone_number    VARCHAR(30),
  wa_phone_id     VARCHAR(100),
  wa_access_token TEXT,
  logo_url        TEXT,
  custom_domain   VARCHAR(255),
  is_active       BOOLEAN       DEFAULT true,
  plan            VARCHAR(50)   DEFAULT 'trial',
  trial_ends_at   TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default workspace (for all existing data)
INSERT INTO workspaces (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Workspace', 'default', 'trial')
ON CONFLICT DO NOTHING;

-- 3. Add workspace_id to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE users SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 4. Add workspace_id to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE contacts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
-- Drop old unique constraint and add workspace-scoped one
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;
ALTER TABLE contacts ADD CONSTRAINT contacts_phone_workspace_unique UNIQUE(phone_number, workspace_id);

-- 5. Add workspace_id to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE conversations SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 6. Add workspace_id to broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE broadcasts SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 7. Add workspace_id to segments
ALTER TABLE segments
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE segments SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 8. Add workspace_id to message_templates
ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE message_templates SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 9. Add workspace_id to ai_settings
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE ai_settings SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 10. Add workspace_id to invites
ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
UPDATE invites SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 11. Fix workspace_members (add workspace_id + role)
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'agent';
UPDATE workspace_members SET workspace_id = '00000000-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 12. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_workspace ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_workspace ON broadcasts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_segments_workspace ON segments(workspace_id);

-- 13. Updated_at trigger for workspaces
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

