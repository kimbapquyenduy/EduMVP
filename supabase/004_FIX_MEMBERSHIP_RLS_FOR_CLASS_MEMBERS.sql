-- Migration: Fix RLS policy to allow class members to see each other
-- Purpose: Students can view other students in classes they belong to
-- Date: 2025-12-26

-- ============================================================================
-- 1. Create helper function to check class membership (avoids RLS recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_class_member(check_class_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE class_id = check_class_id
    AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. Drop existing policy and recreate with helper function
-- ============================================================================

DROP POLICY IF EXISTS "Users can view memberships" ON memberships;

CREATE POLICY "Users can view memberships"
ON memberships FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- Teacher can see all memberships for their classes
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = memberships.class_id
    AND classes.teacher_id = auth.uid()
  )
  OR
  -- Class members can see other members (uses SECURITY DEFINER function to avoid recursion)
  is_class_member(class_id, auth.uid())
);
