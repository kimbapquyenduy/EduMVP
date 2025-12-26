-- Migration: Add class-restricted direct messaging support
-- Purpose: Users can only DM members of classes they belong to
-- Date: 2025-12-26

-- ============================================================================
-- 1. ADD class_id COLUMN TO conversations (nullable for backward compat)
-- ============================================================================

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- ============================================================================
-- 2. ADD INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_class_id ON conversations(class_id);

-- ============================================================================
-- 3. UPDATE CONVERSATION RLS POLICIES
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;

-- New policy: Only class members can create conversations
CREATE POLICY "Class members can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  class_id IS NOT NULL AND
  (
    -- User is a student member with active status
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.class_id = conversations.class_id
      AND m.user_id = auth.uid()
      AND m.status = 'ACTIVE'
    )
    OR
    -- User is the teacher of the class
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = conversations.class_id
      AND c.teacher_id = auth.uid()
    )
  )
);

-- Policy: View conversations user participates in
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. UPDATE CONVERSATION PARTICIPANT RLS POLICIES
-- ============================================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- New policy: Only classmates can be added as participants (with inserter validation)
CREATE POLICY "Only classmates can be added as participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- SECURITY: Inserter must be existing participant OR adding themselves as first 2 participants
  (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR
    -- Allow first 2 participants (conversation creator + target)
    (SELECT COUNT(*) FROM conversation_participants cp
     WHERE cp.conversation_id = conversation_participants.conversation_id) < 2
  )
  AND
  -- Target user must be class member (student or teacher)
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND (
      -- Target is student member with active status
      EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.class_id = c.class_id
        AND m.user_id = conversation_participants.user_id
        AND m.status = 'ACTIVE'
      )
      OR
      -- Target is teacher of the class
      EXISTS (
        SELECT 1 FROM classes cls
        WHERE cls.id = c.class_id
        AND cls.teacher_id = conversation_participants.user_id
      )
    )
  )
);

-- ============================================================================
-- 5. ADD DUPLICATE CONVERSATION PREVENTION FUNCTION
-- ============================================================================

-- Function to find existing 1-on-1 DM between two users in a class
-- Returns conversation ID if found, NULL if no existing DM
CREATE OR REPLACE FUNCTION find_existing_dm(
  p_class_id UUID,
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- SECURITY: Verify caller is class member (student or teacher)
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.class_id = p_class_id
    AND m.user_id = auth.uid()
    AND m.status = 'ACTIVE'
  ) AND NOT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = p_class_id
    AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this class';
  END IF;

  -- Find existing DM
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.class_id = p_class_id
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
  )
  -- Ensure it's a 1-on-1 conversation (exactly 2 participants)
  AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

SELECT 'CLASS DM SUPPORT MIGRATION COMPLETE!' as status;
