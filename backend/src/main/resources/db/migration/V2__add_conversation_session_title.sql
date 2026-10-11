ALTER TABLE ai_conversation_sessions
    ADD COLUMN IF NOT EXISTS title VARCHAR(180) NOT NULL DEFAULT 'New scan';
