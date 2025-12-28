-- ============================================
-- MIGRATION: Teacher Configurable Tier Lesson Counts
-- ============================================
-- - Adds Free tier (tier_level = 0) to subscription_tiers
-- - Teachers can now set lesson counts for all tiers including free
-- - Removes dependency on hardcoded FREE_LESSON_COUNT
-- ============================================

-- 1. Allow tier_level = 0 (Free tier)
ALTER TABLE subscription_tiers
DROP CONSTRAINT IF EXISTS subscription_tiers_tier_level_check;

ALTER TABLE subscription_tiers
ADD CONSTRAINT subscription_tiers_tier_level_check
CHECK (tier_level IN (0, 1, 2, 3));

-- 2. Update trigger to create Free tier as well
CREATE OR REPLACE FUNCTION create_default_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Free tier: 0 lessons by default (mission-based unlock)
  INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
  VALUES (NEW.id, 0, 'Miễn phí', 0, 0);

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

-- 3. Add Free tier to existing classes
DO $$
DECLARE
  class_record RECORD;
BEGIN
  FOR class_record IN
    SELECT c.id FROM classes c
    WHERE NOT EXISTS (
      SELECT 1 FROM subscription_tiers st
      WHERE st.class_id = c.id AND st.tier_level = 0
    )
  LOOP
    INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
    VALUES (class_record.id, 0, 'Miễn phí', 0, 0)
    ON CONFLICT (class_id, tier_level) DO NOTHING;
  END LOOP;
END $$;

-- 4. Function to get user's lesson unlock count for a class
CREATE OR REPLACE FUNCTION get_unlocked_lesson_count(p_user_id UUID, p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tier_purchase RECORD;
  v_free_tier_count INTEGER;
BEGIN
  -- Check if user has a tier purchase
  SELECT tp.*, st.lesson_unlock_count
  INTO v_tier_purchase
  FROM tier_purchases tp
  JOIN subscription_tiers st ON st.id = tp.tier_id
  WHERE tp.user_id = p_user_id AND tp.class_id = p_class_id;

  IF FOUND THEN
    -- NULL means unlimited
    RETURN COALESCE(v_tier_purchase.lesson_unlock_count, 999999);
  END IF;

  -- No tier purchase - return free tier lesson count
  SELECT lesson_unlock_count INTO v_free_tier_count
  FROM subscription_tiers
  WHERE class_id = p_class_id AND tier_level = 0;

  RETURN COALESCE(v_free_tier_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update SubscriptionTier type comment
COMMENT ON TABLE subscription_tiers IS
'Subscription tiers for classes. tier_level: 0=Free, 1=Basic, 2=Standard, 3=Premium.
lesson_unlock_count: Number of lessons unlocked (NULL = unlimited).
Teachers can configure both price and lesson_unlock_count for all tiers.';
