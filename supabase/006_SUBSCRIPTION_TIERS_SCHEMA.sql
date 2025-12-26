-- ============================================
-- SUBSCRIPTION TIERS & PAYMENTS SCHEMA
-- Migration: 005_SUBSCRIPTION_TIERS_SCHEMA.sql
-- Date: 2025-12-26
-- Description: Per-class subscription tiers with mock payment support
-- ============================================

-- ============================================
-- 1. PAYMENT STATUS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. SUBSCRIPTION TIERS TABLE
-- Per-class tier definitions (3 tiers per class)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), -- VND, no decimals
  lesson_unlock_count INTEGER, -- NULL = unlimited (Tier 3)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One tier per level per class
  UNIQUE(class_id, tier_level)
);

-- ============================================
-- 3. PAYMENTS TABLE
-- Track all payment attempts
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- VND
  currency TEXT NOT NULL DEFAULT 'VND',
  status payment_status NOT NULL DEFAULT 'pending',
  test_mode BOOLEAN NOT NULL DEFAULT true,
  card_last_four TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- stores tier_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 4. TIER PURCHASES TABLE
-- Track user tier ownership per class
-- ============================================
CREATE TABLE IF NOT EXISTS tier_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active tier per class per user (upgrades replace)
  UNIQUE(user_id, class_id)
);

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_class_id
  ON subscription_tiers(class_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_class_id
  ON payments(class_id);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tier_purchases_user_id
  ON tier_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_purchases_class_id
  ON tier_purchases(class_id);
CREATE INDEX IF NOT EXISTS idx_tier_purchases_tier_id
  ON tier_purchases(tier_id);

-- ============================================
-- 6. FUNCTION: Create default tiers for new class
-- ============================================
CREATE OR REPLACE FUNCTION create_default_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Tier 1: Basic - 5 lessons
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
  VALUES (NEW.id, 1, 'Cơ bản', 50000, 5);

  -- Tier 2: Standard - 10 lessons
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
  VALUES (NEW.id, 2, 'Tiêu chuẩn', 100000, 10);

  -- Tier 3: Premium - ALL lessons (NULL = unlimited)
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
  VALUES (NEW.id, 3, 'Trọn bộ', 200000, NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create tiers when class is created
DROP TRIGGER IF EXISTS on_class_created_create_tiers ON classes;
CREATE TRIGGER on_class_created_create_tiers
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tiers();

-- ============================================
-- 7. FUNCTION: Record tier purchase on payment success
-- ============================================
CREATE OR REPLACE FUNCTION record_tier_purchase()
RETURNS TRIGGER AS $$
DECLARE
  tier_id_from_metadata UUID;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Extract tier_id from payment metadata
    tier_id_from_metadata := (NEW.metadata->>'tier_id')::UUID;

    IF tier_id_from_metadata IS NOT NULL THEN
      -- Insert or update tier purchase (handles upgrades)
      INSERT INTO tier_purchases (user_id, class_id, tier_id, payment_id, purchased_at)
      VALUES (NEW.user_id, NEW.class_id, tier_id_from_metadata, NEW.id, NOW())
      ON CONFLICT (user_id, class_id) DO UPDATE
      SET tier_id = EXCLUDED.tier_id,
          payment_id = EXCLUDED.payment_id,
          purchased_at = EXCLUDED.purchased_at;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-create purchase when payment succeeds
DROP TRIGGER IF EXISTS on_payment_completed ON payments;
CREATE TRIGGER on_payment_completed
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION record_tier_purchase();

-- ============================================
-- 8. FUNCTION: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_subscription_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_subscription_tiers_update ON subscription_tiers;
CREATE TRIGGER on_subscription_tiers_update
  BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_tiers_updated_at();

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_purchases ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- SUBSCRIPTION_TIERS POLICIES
-- ----------------------------------------

-- Anyone can view tiers (for pricing display)
DROP POLICY IF EXISTS "tiers_viewable_by_all" ON subscription_tiers;
CREATE POLICY "tiers_viewable_by_all" ON subscription_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Teacher can update tier prices for their classes
DROP POLICY IF EXISTS "teacher_update_own_class_tiers" ON subscription_tiers;
CREATE POLICY "teacher_update_own_class_tiers" ON subscription_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = subscription_tiers.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = subscription_tiers.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ----------------------------------------
-- PAYMENTS POLICIES
-- ----------------------------------------

-- Users can view their own payments
DROP POLICY IF EXISTS "users_view_own_payments" ON payments;
CREATE POLICY "users_view_own_payments" ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own payments
DROP POLICY IF EXISTS "users_create_own_payments" ON payments;
CREATE POLICY "users_create_own_payments" ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Teachers can view payments for their classes (for earnings)
DROP POLICY IF EXISTS "teachers_view_class_payments" ON payments;
CREATE POLICY "teachers_view_class_payments" ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = payments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ----------------------------------------
-- TIER_PURCHASES POLICIES
-- ----------------------------------------

-- Users can view their own purchases
DROP POLICY IF EXISTS "users_view_own_purchases" ON tier_purchases;
CREATE POLICY "users_view_own_purchases" ON tier_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Teachers can view purchases for their classes
DROP POLICY IF EXISTS "teachers_view_class_purchases" ON tier_purchases;
CREATE POLICY "teachers_view_class_purchases" ON tier_purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = tier_purchases.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 10. CREATE DEFAULT TIERS FOR EXISTING CLASSES
-- (Run once for existing data)
-- ============================================
DO $$
DECLARE
  class_record RECORD;
BEGIN
  FOR class_record IN SELECT id FROM classes WHERE id NOT IN (SELECT DISTINCT class_id FROM subscription_tiers)
  LOOP
    -- Tier 1
    INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
    VALUES (class_record.id, 1, 'Cơ bản', 50000, 5)
    ON CONFLICT (class_id, tier_level) DO NOTHING;

    -- Tier 2
    INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
    VALUES (class_record.id, 2, 'Tiêu chuẩn', 100000, 10)
    ON CONFLICT (class_id, tier_level) DO NOTHING;

    -- Tier 3
    INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
    VALUES (class_record.id, 3, 'Trọn bộ', 200000, NULL)
    ON CONFLICT (class_id, tier_level) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
