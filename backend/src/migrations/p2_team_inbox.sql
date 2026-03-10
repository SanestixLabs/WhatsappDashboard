-- P2 Migration: Team Inbox & Handoff

-- Table 1: Internal Notes
CREATE TABLE IF NOT EXISTS conversation_notes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id     UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id        UUID        NOT NULL REFERENCES users(id),
  content          TEXT        NOT NULL,
  mentioned_users  UUID[]      DEFAULT '{}',
  created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_conversation ON conversation_notes(conversation_id);

-- Table 2: Canned Responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  shortcut      VARCHAR(50)  NOT NULL,
  content       TEXT         NOT NULL,
  created_by    UUID         NOT NULL REFERENCES users(id),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, shortcut)
);
CREATE INDEX IF NOT EXISTS idx_canned_workspace ON canned_responses(workspace_id);

-- Alter conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS transfer_note    TEXT,
  ADD COLUMN IF NOT EXISTS transferred_at  TIMESTAMP;
