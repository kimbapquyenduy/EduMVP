-- Migration: Add member_count and course_count to classes table
-- Purpose: Fix RLS visibility issue where students can only see their own membership
-- Date: 2025-12-26

-- ============================================================================
-- 1. Add denormalized count columns to classes table
-- ============================================================================

ALTER TABLE classes ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS course_count INTEGER DEFAULT 0;

-- ============================================================================
-- 2. Create trigger function for member count
-- ============================================================================

-- Note: member_count includes teacher (+1) plus all active students
CREATE OR REPLACE FUNCTION update_class_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE classes SET member_count = (
      SELECT COUNT(*) + 1 FROM memberships WHERE class_id = NEW.class_id AND status = 'ACTIVE'
    ) WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle class_id change or status change
    IF OLD.class_id IS DISTINCT FROM NEW.class_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE classes SET member_count = (
        SELECT COUNT(*) + 1 FROM memberships WHERE class_id = OLD.class_id AND status = 'ACTIVE'
      ) WHERE id = OLD.class_id;
      UPDATE classes SET member_count = (
        SELECT COUNT(*) + 1 FROM memberships WHERE class_id = NEW.class_id AND status = 'ACTIVE'
      ) WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes SET member_count = (
      SELECT COUNT(*) + 1 FROM memberships WHERE class_id = OLD.class_id AND status = 'ACTIVE'
    ) WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Create trigger function for course count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_class_course_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE classes SET course_count = (
      SELECT COUNT(*) FROM courses WHERE class_id = NEW.class_id
    ) WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle class_id change
    IF OLD.class_id IS DISTINCT FROM NEW.class_id THEN
      UPDATE classes SET course_count = (
        SELECT COUNT(*) FROM courses WHERE class_id = OLD.class_id
      ) WHERE id = OLD.class_id;
      UPDATE classes SET course_count = (
        SELECT COUNT(*) FROM courses WHERE class_id = NEW.class_id
      ) WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes SET course_count = (
      SELECT COUNT(*) FROM courses WHERE class_id = OLD.class_id
    ) WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Create triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_class_member_count_trigger ON memberships;
CREATE TRIGGER update_class_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON memberships
FOR EACH ROW EXECUTE FUNCTION update_class_member_count();

DROP TRIGGER IF EXISTS update_class_course_count_trigger ON courses;
CREATE TRIGGER update_class_course_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON courses
FOR EACH ROW EXECUTE FUNCTION update_class_course_count();

-- ============================================================================
-- 5. Backfill existing counts (includes teacher as +1 member)
-- ============================================================================

UPDATE classes SET member_count = (
  SELECT COUNT(*) + 1 FROM memberships WHERE memberships.class_id = classes.id AND memberships.status = 'ACTIVE'
);

UPDATE classes SET course_count = (
  SELECT COUNT(*) FROM courses WHERE courses.class_id = classes.id
);

-- ============================================================================
-- 6. Add indexes for performance (optional but recommended)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_classes_member_count ON classes(member_count);
CREATE INDEX IF NOT EXISTS idx_classes_course_count ON classes(course_count);
