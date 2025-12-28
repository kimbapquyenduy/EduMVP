-- Migration: Fix RLS policy recursion in conversation_participants
-- Purpose: Resolve self-referential queries causing infinite recursion
-- Date: 2025-12-28

-- ============================================================================
-- STEP 0: Drop ALL existing policies on conversation_participants to start fresh
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON conversation_participants', pol.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 1: Create helper functions (SECURITY DEFINER bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION get_conversation_participant_count(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM conversation_participants
  WHERE conversation_id = p_conversation_id;
$$;

-- ============================================================================
-- STEP 2: Create simple, non-recursive policies
-- ============================================================================

-- SELECT: User can see participants of conversations they're in
CREATE POLICY "cp_select_policy"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

-- INSERT: Allow first 2 participants OR existing participant can add
CREATE POLICY "cp_insert_policy"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  get_conversation_participant_count(conversation_id) < 2
  OR is_conversation_participant(conversation_id, auth.uid())
);

-- ============================================================================
-- STEP 3: Also fix messages policies (they query conversation_participants)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

CREATE POLICY "messages_select_policy"
ON messages FOR SELECT
TO authenticated
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "messages_insert_policy"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "messages_update_policy"
ON messages FOR UPDATE
TO authenticated
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

-- ============================================================================
-- STEP 4: Create atomic DM creation function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_dm_conversation(
  p_class_id UUID,
  p_target_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  -- Validate caller is class member
  IF NOT EXISTS (
    SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = v_caller_id AND status = 'ACTIVE'
  ) AND NOT EXISTS (
    SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this class';
  END IF;

  -- Validate target is class member
  IF NOT EXISTS (
    SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = p_target_user_id AND status = 'ACTIVE'
  ) AND NOT EXISTS (
    SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: target user is not a member of this class';
  END IF;

  -- Prevent self-DM
  IF v_caller_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Check for existing DM
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.class_id = p_class_id
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = v_caller_id)
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_target_user_id)
  AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (class_id) VALUES (p_class_id) RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_caller_id), (v_conversation_id, p_target_user_id);

  RETURN v_conversation_id;
END;
$$;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

SELECT 'RLS FIX COMPLETE - All policies updated!' as status;
