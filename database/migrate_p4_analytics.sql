-- Phase 4: Analytics Migration

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_resolved BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS csat_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  score           INT CHECK (score BETWEEN 1 AND 5),
  sent_at         TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_resolved ON conversations(resolved_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csat_agent ON csat_responses(agent_id);
