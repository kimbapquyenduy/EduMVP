-- ============================================
-- EDU PLATFORM MVP - REALTIME CONFIGURATION
-- ============================================
-- Run this file AFTER 001_FULL_SCHEMA.sql and 002_STORAGE_SETUP.sql
-- Enables realtime subscriptions for messaging
-- ============================================

-- Enable Realtime for messages table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Enable Realtime for conversations table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- Verification
SELECT tablename, 'ENABLED' as realtime_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'conversations');
