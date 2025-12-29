-- Migration: Add per-lesson tier requirements
-- Date: 2025-12-28
-- Description: Allows teachers to set specific tier requirements for individual lessons
-- NULL = use legacy lesson_unlock_count behavior
-- 0 = Free, 1 = Basic, 2 = Standard, 3 = Premium

-- Add required_tier_level column to lessons table
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS required_tier_level INTEGER DEFAULT NULL;

-- Add constraint for valid tier values (0-3 or NULL)
ALTER TABLE lessons
ADD CONSTRAINT lessons_required_tier_level_check
CHECK (required_tier_level IS NULL OR required_tier_level IN (0, 1, 2, 3));

-- Add comment explaining the column
COMMENT ON COLUMN lessons.required_tier_level IS
'Override tier requirement for this lesson. NULL = use class lesson_unlock_count logic. 0=Free, 1=Basic, 2=Standard, 3=Premium';

-- Create index for efficient filtering by tier level
CREATE INDEX IF NOT EXISTS idx_lessons_required_tier_level
ON lessons(required_tier_level)
WHERE required_tier_level IS NOT NULL;
