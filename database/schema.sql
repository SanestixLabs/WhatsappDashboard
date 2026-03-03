-- ============================================================
-- Sanestix Flow — Database Schema (MVP + SaaS-ready)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (internal agents / dashboard users)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('owner', 'manager', 'agent')),
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
  -- Future SaaS: tenant_id UUID REFERENCES tenants(id)
);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number    VARCHAR(30) UNIQUE NOT NULL,
  name            VARCHAR(255),
  profile_pic_url TEXT,
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
  -- Future SaaS: tenant_id UUID REFERENCES tenants(id)
);

CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_last_message ON contacts(last_message_at DESC);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id         UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to        UUID REFERENCES users(id) ON DELETE SET NULL,
  status             VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  automation_enabled BOOLEAN DEFAULT true,
  session_expires_at TIMESTAMPTZ, -- WhatsApp 24-hour session window
  unread_count       INTEGER DEFAULT 0,
  last_message_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
  -- Future SaaS: tenant_id UUID REFERENCES tenants(id)
);

CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  wa_message_id   VARCHAR(255) UNIQUE, -- WhatsApp message ID for status updates
  direction       VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  type            VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'template', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'interactive')),
  content         TEXT,
  media_url       TEXT,
  media_mime_type VARCHAR(100),
  template_name   VARCHAR(255),
  template_vars   JSONB,
  status          VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_data      JSONB,
  sent_by         UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = automation/n8n
  metadata        JSONB DEFAULT '{}',
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
  -- Future SaaS: tenant_id UUID REFERENCES tenants(id)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_wa_id ON messages(wa_message_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_status ON messages(status);

-- ============================================================
-- N8N WORKFLOW LOGS
-- ============================================================
CREATE TABLE n8n_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  workflow_url    TEXT,
  request_payload JSONB,
  response_data   JSONB,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
  duration_ms     INTEGER,
  error_message   TEXT,
  triggered_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_n8n_logs_conversation ON n8n_logs(conversation_id);

-- ============================================================
-- WEBHOOK EVENTS (raw log for debugging)
-- ============================================================
CREATE TABLE webhook_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type   VARCHAR(100),
  raw_payload  JSONB NOT NULL,
  processed    BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  received_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_received ON webhook_events(received_at DESC);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update conversation last_message_at & unread_count
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.timestamp,
    unread_count = CASE
      WHEN NEW.direction = 'incoming' THEN unread_count + 1
      ELSE 0
    END,
    session_expires_at = CASE
      WHEN NEW.direction = 'incoming' THEN NOW() + INTERVAL '24 hours'
      ELSE session_expires_at
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  UPDATE contacts SET last_message_at = NEW.timestamp WHERE id = (
    SELECT contact_id FROM conversations WHERE id = NEW.conversation_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- SEED: Default admin user (password: admin123 — change immediately)
-- ============================================================
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@sanestix.com',
  crypt('admin123', gen_salt('bf', 12)),
  'Admin',
  'owner'
);
