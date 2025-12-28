-- ============================================
-- FIX: Complete RLS Policies for Subscription System
-- Run this in Supabase SQL Editor
-- Fixes: subscription_tiers, tier_purchases
-- ============================================

-- ============================================
-- PART 0: GRANT TABLE PERMISSIONS
-- This is required BEFORE RLS policies will work
-- ============================================

-- Grant permissions on subscription_tiers
GRANT SELECT, INSERT, UPDATE ON subscription_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscription_tiers TO anon;

-- Grant permissions on tier_purchases
GRANT SELECT, INSERT, UPDATE ON tier_purchases TO authenticated;

-- ============================================
-- PART 1: subscription_tiers
-- ============================================

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including new names)
DROP POLICY IF EXISTS "tiers_viewable_by_all" ON subscription_tiers;
DROP POLICY IF EXISTS "teacher_update_own_class_tiers" ON subscription_tiers;
DROP POLICY IF EXISTS "allow_tier_insert" ON subscription_tiers;
DROP POLICY IF EXISTS "Anyone can view tiers" ON subscription_tiers;
DROP POLICY IF EXISTS "tiers_select_authenticated" ON subscription_tiers;
DROP POLICY IF EXISTS "tiers_insert_authenticated" ON subscription_tiers;
DROP POLICY IF EXISTS "tiers_update_teacher_only" ON subscription_tiers;
DROP POLICY IF EXISTS "subscription_tiers_select" ON subscription_tiers;
DROP POLICY IF EXISTS "subscription_tiers_insert" ON subscription_tiers;
DROP POLICY IF EXISTS "subscription_tiers_update" ON subscription_tiers;

-- Create fresh policies
-- 1. SELECT: Anyone authenticated can view tiers (for pricing display)
CREATE POLICY "subscription_tiers_select" ON subscription_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT: Allow tier creation (for auto-create on old classes)
CREATE POLICY "subscription_tiers_insert" ON subscription_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE: Only teachers can update their class tiers
CREATE POLICY "subscription_tiers_update" ON subscription_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = subscription_tiers.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ============================================
-- PART 2: tier_purchases
-- ============================================

-- Enable RLS
ALTER TABLE tier_purchases ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including new names)
DROP POLICY IF EXISTS "users_view_own_purchases" ON tier_purchases;
DROP POLICY IF EXISTS "teachers_view_class_purchases" ON tier_purchases;
DROP POLICY IF EXISTS "tier_purchases_select" ON tier_purchases;
DROP POLICY IF EXISTS "tier_purchases_insert" ON tier_purchases;
DROP POLICY IF EXISTS "tier_purchases_select_own" ON tier_purchases;
DROP POLICY IF EXISTS "tier_purchases_select_teacher" ON tier_purchases;
DROP POLICY IF EXISTS "tier_purchases_update_own" ON tier_purchases;

-- Create fresh policies
-- 1. SELECT: Users can view their own purchases
CREATE POLICY "tier_purchases_select_own" ON tier_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. SELECT: Teachers can view purchases for their classes
CREATE POLICY "tier_purchases_select_teacher" ON tier_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = tier_purchases.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- 3. INSERT: Allow inserting purchases (for payment processing)
CREATE POLICY "tier_purchases_insert" ON tier_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. UPDATE: Users can update their own purchases (for tier upgrades)
CREATE POLICY "tier_purchases_update_own" ON tier_purchases
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VERIFICATION
-- ============================================

-- Check subscription_tiers policies
SELECT 'subscription_tiers' as table_name, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'subscription_tiers';

-- Check tier_purchases policies
SELECT 'tier_purchases' as table_name, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'tier_purchases';
