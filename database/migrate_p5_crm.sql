-- ============================================================
-- Phase 5: CRM + Broadcast Campaigns Migration
-- ============================================================

-- Add custom_fields to contacts if not exists
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- ============================================================
-- SEGMENTS (saved filter groups)
-- ============================================================
CREATE TABLE IF NOT EXISTS segments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  filter_type VARCHAR(20) DEFAULT 'tag' CHECK (filter_type IN ('tag', 'all', 'custom')),
  filter_tags TEXT[] DEFAULT '{}',
  filter_sql  TEXT,
  contact_count INTEGER DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_segments_updated_at BEFORE UPDATE ON segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BROADCASTS
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255) NOT NULL,
  template_name    VARCHAR(255) NOT NULL,
  template_lang    VARCHAR(20) DEFAULT 'en',
  template_vars    JSONB DEFAULT '[]',
  segment_id       UUID REFERENCES segments(id) ON DELETE SET NULL,
  target_tags      TEXT[] DEFAULT '{}',
  target_all       BOOLEAN DEFAULT false,
  status           VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count       INTEGER DEFAULT 0,
  delivered_count  INTEGER DEFAULT 0,
  read_count       INTEGER DEFAULT 0,
  failed_count     INTEGER DEFAULT 0,
  reply_count      INTEGER DEFAULT 0,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts(scheduled_at);
CREATE TRIGGER trg_broadcasts_updated_at BEFORE UPDATE ON broadcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BROADCAST RECIPIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id  UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  phone_number  VARCHAR(30) NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed','replied')),
  wa_message_id VARCHAR(255),
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_br_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_br_contact ON broadcast_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_br_status ON broadcast_recipients(status);

