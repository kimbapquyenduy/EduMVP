-- ============================================
-- FIX: Subscription Tiers RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- First, check if RLS is enabled and reset policies
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "tiers_viewable_by_all" ON subscription_tiers;
DROP POLICY IF EXISTS "teacher_update_own_class_tiers" ON subscription_tiers;
DROP POLICY IF EXISTS "allow_tier_insert" ON subscription_tiers;
DROP POLICY IF EXISTS "Anyone can view tiers" ON subscription_tiers;

-- Create fresh policies

-- 1. SELECT: Anyone authenticated can view tiers (for pricing display)
CREATE POLICY "tiers_select_authenticated" ON subscription_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Allow tier creation (for auto-create on old classes)
CREATE POLICY "tiers_insert_authenticated" ON subscription_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE: Only teachers can update their class tiers
CREATE POLICY "tiers_update_teacher_only" ON subscription_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = subscription_tiers.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'subscription_tiers';
