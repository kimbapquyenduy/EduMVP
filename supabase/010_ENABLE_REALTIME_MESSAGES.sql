-- Migration: Enable Realtime for messages table
-- Purpose: Allow real-time subscriptions to new messages
-- Date: 2025-12-28
-- Note: Tables may already be in publication - this is idempotent

-- ============================================================================
-- ENABLE REALTIME FOR MESSAGES TABLE (IDEMPOTENT)
-- ============================================================================

-- Check and add messages table if not already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Check and add conversations table if not already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT tablename, 'ENABLED' as realtime_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('messages', 'conversations');
