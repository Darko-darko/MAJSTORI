-- ============================================
-- Team Conversations + Messages
-- Run in Supabase SQL Editor
-- ============================================

-- Conversations (threads)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES majstors(id),
  worker_id UUID NOT NULL REFERENCES majstors(id),
  started_by UUID NOT NULL REFERENCES majstors(id),
  title TEXT,
  location TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'deleted')),
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_owner ON conversations(owner_id, status);
CREATE INDEX idx_conversations_worker ON conversations(worker_id, status);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

-- Messages (within conversations)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES majstors(id),
  text TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can see their own conversations
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (owner_id = auth.uid() OR worker_id = auth.uid());

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR worker_id = auth.uid());

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE USING (owner_id = auth.uid());

-- Messages: participants of the conversation can see/create
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE owner_id = auth.uid() OR worker_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations WHERE owner_id = auth.uid() OR worker_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
