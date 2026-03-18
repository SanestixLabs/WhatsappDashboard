-- ============================================
-- Phase 8: No-Code Chatbot Builder
-- Migration: migrate_p8_flows.sql
-- ============================================

-- Table 1: flows
CREATE TABLE IF NOT EXISTS flows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  trigger_type    VARCHAR(50) NOT NULL DEFAULT 'keyword',
  trigger_value   TEXT,
  is_active       BOOLEAN DEFAULT false,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: flow_nodes
CREATE TABLE IF NOT EXISTS flow_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id       UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  node_type     VARCHAR(50) NOT NULL,
  node_config   JSONB NOT NULL DEFAULT '{}',
  position_x    FLOAT DEFAULT 0,
  position_y    FLOAT DEFAULT 0,
  next_node_id  UUID REFERENCES flow_nodes(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: flow_sessions
CREATE TABLE IF NOT EXISTS flow_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  flow_id          UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  current_node_id  UUID REFERENCES flow_nodes(id) ON DELETE SET NULL,
  variables        JSONB DEFAULT '{}',
  status           VARCHAR(20) DEFAULT 'active',
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flows_workspace      ON flows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flows_active         ON flows(is_active);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow      ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_contact ON flow_sessions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status  ON flow_sessions(status);

-- Auto-update updated_at on flows
CREATE TRIGGER trg_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

