-- ============================================
-- MIGRATION: Teacher-Configurable Tier Count
-- ============================================
-- Teachers can choose how many tiers to offer (max 3 paid tiers)
-- - Tier 0 (Free) is always enabled
-- - Tiers 1, 2, 3 can be enabled/disabled by teacher
-- ============================================

-- 1. Add is_enabled column to subscription_tiers
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- 2. Ensure Free tier (tier_level = 0) is always enabled
-- This constraint prevents disabling the free tier
CREATE OR REPLACE FUNCTION enforce_free_tier_enabled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier_level = 0 AND NEW.is_enabled = false THEN
    RAISE EXCEPTION 'Free tier (tier_level = 0) cannot be disabled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_enforce_free_tier_enabled ON subscription_tiers;
CREATE TRIGGER tr_enforce_free_tier_enabled
BEFORE INSERT OR UPDATE ON subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION enforce_free_tier_enabled();

-- 3. Update create_default_tiers to set is_enabled
CREATE OR REPLACE FUNCTION create_default_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Free tier: always enabled, 0 lessons by default
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count, is_enabled)
  VALUES (NEW.id, 0, 'Miễn phí', 0, 0, true);

  -- Tier 1: Basic - enabled by default
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count, is_enabled)
  VALUES (NEW.id, 1, 'Cơ bản', 50000, 5, true);

  -- Tier 2: Standard - enabled by default
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count, is_enabled)
  VALUES (NEW.id, 2, 'Tiêu chuẩn', 100000, 10, true);

  -- Tier 3: Premium - enabled by default
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count, is_enabled)
  VALUES (NEW.id, 3, 'Trọn bộ', 200000, NULL, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Set all existing tiers to enabled
UPDATE subscription_tiers SET is_enabled = true WHERE is_enabled IS NULL;

-- 5. Add comment
COMMENT ON COLUMN subscription_tiers.is_enabled IS
'Whether this tier is available for purchase. Tier 0 (Free) is always enabled.';
