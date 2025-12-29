-- Migration: Implement Tier Hierarchy System
-- Date: 2025-12-28
-- Description: Simplify tier system to pure hierarchy (tier N unlocks all content 0 to N)
-- Changes:
-- 1. Add required_tier_level to courses table
-- 2. Add description column to subscription_tiers
-- 3. Remove lesson_unlock_count (no longer used)
-- 4. Migrate existing data

-- ============================================
-- STEP 1: Add required_tier_level to courses
-- ============================================
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS required_tier_level INTEGER NOT NULL DEFAULT 0;

-- Add constraint for valid tier values (0-3)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courses_required_tier_level_check'
    ) THEN
        ALTER TABLE courses
        ADD CONSTRAINT courses_required_tier_level_check
        CHECK (required_tier_level IN (0, 1, 2, 3));
    END IF;
END $$;

-- Migrate existing tier values: FREE -> 0, PREMIUM -> 3
UPDATE courses SET required_tier_level = 0 WHERE tier = 'FREE';
UPDATE courses SET required_tier_level = 3 WHERE tier = 'PREMIUM';

-- Add comment explaining the column
COMMENT ON COLUMN courses.required_tier_level IS
'Required tier level to access this course. 0=Free, 1=Basic, 2=Standard, 3=Premium. Users with tier >= required_tier_level can access.';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_courses_required_tier_level
ON courses(required_tier_level);

-- ============================================
-- STEP 2: Add description to subscription_tiers
-- ============================================
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Update existing tiers with default descriptions
UPDATE subscription_tiers SET description = 'Truy cập nội dung miễn phí' WHERE tier_level = 0 AND description IS NULL;
UPDATE subscription_tiers SET description = 'Mở khóa nội dung cơ bản' WHERE tier_level = 1 AND description IS NULL;
UPDATE subscription_tiers SET description = 'Mở khóa nội dung tiêu chuẩn' WHERE tier_level = 2 AND description IS NULL;
UPDATE subscription_tiers SET description = 'Truy cập toàn bộ nội dung' WHERE tier_level = 3 AND description IS NULL;

COMMENT ON COLUMN subscription_tiers.description IS
'Teacher-configurable description shown to students when selecting tiers';

-- ============================================
-- STEP 3: Remove lesson_unlock_count column
-- ============================================
-- First drop any constraints that reference it
ALTER TABLE subscription_tiers
DROP COLUMN IF EXISTS lesson_unlock_count;

-- ============================================
-- STEP 4: Update trigger for creating default tiers
-- ============================================
CREATE OR REPLACE FUNCTION create_default_tiers()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default tiers for the new class
  INSERT INTO subscription_tiers (class_id, tier_level, name, description, price, is_enabled)
  VALUES
    (NEW.id, 0, 'Miễn phí', 'Truy cập nội dung miễn phí', 0, true),
    (NEW.id, 1, 'Cơ bản', 'Mở khóa nội dung cơ bản', 50000, true),
    (NEW.id, 2, 'Tiêu chuẩn', 'Mở khóa nội dung tiêu chuẩn', 100000, true),
    (NEW.id, 3, 'Trọn bộ', 'Truy cập toàn bộ nội dung', 200000, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Update lessons table comment
-- ============================================
COMMENT ON COLUMN lessons.required_tier_level IS
'Override tier requirement for this lesson. NULL = inherit from course. 0=Free, 1=Basic, 2=Standard, 3=Premium';
