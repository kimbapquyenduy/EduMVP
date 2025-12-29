-- ============================================
-- EDU PLATFORM MVP - COMPLETE DATABASE SCHEMA
-- ============================================
-- Consolidated schema including all tables, functions, triggers, and RLS policies
-- Run this file FIRST to set up the complete database
-- Last updated: 2025-12-29
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING OBJECTS (Clean Slate)
-- ============================================
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS comment_reactions CASCADE;
DROP TABLE IF EXISTS post_reactions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS tier_purchases CASCADE;
DROP TABLE IF EXISTS class_subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscription_tiers CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS post_category CASCADE;
DROP TYPE IF EXISTS course_tier CASCADE;
DROP TYPE IF EXISTS membership_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_course_completion(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_class_member_count() CASCADE;
DROP FUNCTION IF EXISTS update_class_course_count() CASCADE;
DROP FUNCTION IF EXISTS is_class_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS find_existing_dm(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_default_tiers() CASCADE;
DROP FUNCTION IF EXISTS record_tier_purchase() CASCADE;
DROP FUNCTION IF EXISTS update_subscription_tiers_updated_at() CASCADE;
DROP FUNCTION IF EXISTS has_active_subscription(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS can_access_class(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unlocked_lesson_count(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS enforce_free_tier_enabled() CASCADE;
DROP FUNCTION IF EXISTS is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_conversation_participant_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_dm_conversation(UUID, UUID) CASCADE;

-- ============================================
-- STEP 2: EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 3: ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('TEACHER', 'STUDENT');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE course_tier AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE post_category AS ENUM ('DISCUSSION', 'ANNOUNCEMENT', 'QUESTION', 'UPDATE');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- STEP 4: TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'STUDENT',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes (learning spaces created by teachers)
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0.00,
  subscription_price INTEGER DEFAULT 0 CHECK (subscription_price >= 0),
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  course_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Tiers (per-class tier definitions)
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (0, 1, 2, 3)),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, tier_level)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status payment_status NOT NULL DEFAULT 'pending',
  test_mode BOOLEAN NOT NULL DEFAULT true,
  card_last_four TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tier Purchases (user tier ownership per class)
CREATE TABLE tier_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

-- Memberships (students joining classes)
CREATE TABLE memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status membership_status DEFAULT 'ACTIVE',
  subscription_paid BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMPTZ,
  last_payment_id UUID REFERENCES payments(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(class_id, user_id)
);

-- Class Subscriptions (payment history)
CREATE TABLE class_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tier course_tier DEFAULT 'FREE',
  required_tier_level INTEGER NOT NULL DEFAULT 0 CHECK (required_tier_level IN (0, 1, 2, 3)),
  order_index INTEGER DEFAULT 0,
  promo_video_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons
CREATE TABLE lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  pdf_url TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  required_tier_level INTEGER DEFAULT NULL CHECK (required_tier_level IS NULL OR required_tier_level IN (0, 1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Progress
CREATE TABLE lesson_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- Posts (community feature)
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category post_category DEFAULT 'DISCUSSION',
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Reactions
CREATE TABLE post_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comment Reactions
CREATE TABLE comment_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Conversations (messaging with class restriction)
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 5: FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get course completion percentage
CREATE OR REPLACE FUNCTION get_course_completion(p_course_id UUID, p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons FROM lessons WHERE course_id = p_course_id;
  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = p_course_id)
  AND user_id = p_user_id AND is_completed = true;

  IF total_lessons = 0 THEN RETURN 0;
  ELSE RETURN ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE
  new_role user_role;
BEGIN
  new_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'TEACHER' THEN 'TEACHER'::user_role
    WHEN NEW.raw_user_meta_data->>'role' = 'STUDENT' THEN 'STUDENT'::user_role
    ELSE 'STUDENT'::user_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), new_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for user %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Update class member count
CREATE OR REPLACE FUNCTION update_class_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE classes SET member_count = (SELECT COUNT(*) + 1 FROM memberships WHERE class_id = NEW.class_id AND status = 'ACTIVE') WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.class_id IS DISTINCT FROM NEW.class_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE classes SET member_count = (SELECT COUNT(*) + 1 FROM memberships WHERE class_id = OLD.class_id AND status = 'ACTIVE') WHERE id = OLD.class_id;
      UPDATE classes SET member_count = (SELECT COUNT(*) + 1 FROM memberships WHERE class_id = NEW.class_id AND status = 'ACTIVE') WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes SET member_count = (SELECT COUNT(*) + 1 FROM memberships WHERE class_id = OLD.class_id AND status = 'ACTIVE') WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update class course count
CREATE OR REPLACE FUNCTION update_class_course_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE classes SET course_count = (SELECT COUNT(*) FROM courses WHERE class_id = NEW.class_id) WHERE id = NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.class_id IS DISTINCT FROM NEW.class_id THEN
      UPDATE classes SET course_count = (SELECT COUNT(*) FROM courses WHERE class_id = OLD.class_id) WHERE id = OLD.class_id;
      UPDATE classes SET course_count = (SELECT COUNT(*) FROM courses WHERE class_id = NEW.class_id) WHERE id = NEW.class_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes SET course_count = (SELECT COUNT(*) FROM courses WHERE class_id = OLD.class_id) WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check class membership (helper for RLS)
CREATE OR REPLACE FUNCTION is_class_member(check_class_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM memberships WHERE class_id = check_class_id AND user_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create default tiers for new class
CREATE OR REPLACE FUNCTION create_default_tiers()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscription_tiers (class_id, tier_level, name, description, price, is_enabled)
  VALUES
    (NEW.id, 0, 'Miễn phí', 'Truy cập nội dung miễn phí', 0, true),
    (NEW.id, 1, 'Cơ bản', 'Mở khóa nội dung cơ bản', 50000, true),
    (NEW.id, 2, 'Tiêu chuẩn', 'Mở khóa nội dung tiêu chuẩn', 100000, true),
    (NEW.id, 3, 'Trọn bộ', 'Truy cập toàn bộ nội dung', 200000, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record tier purchase on payment success
CREATE OR REPLACE FUNCTION record_tier_purchase()
RETURNS TRIGGER AS $$
DECLARE
  tier_id_from_metadata UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    tier_id_from_metadata := (NEW.metadata->>'tier_id')::UUID;
    IF tier_id_from_metadata IS NOT NULL THEN
      INSERT INTO tier_purchases (user_id, class_id, tier_id, payment_id, purchased_at)
      VALUES (NEW.user_id, NEW.class_id, tier_id_from_metadata, NEW.id, NOW())
      ON CONFLICT (user_id, class_id) DO UPDATE SET tier_id = EXCLUDED.tier_id, payment_id = EXCLUDED.payment_id, purchased_at = EXCLUDED.purchased_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription tiers timestamp
CREATE OR REPLACE FUNCTION update_subscription_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enforce free tier always enabled
CREATE OR REPLACE FUNCTION enforce_free_tier_enabled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier_level = 0 AND NEW.is_enabled = false THEN
    RAISE EXCEPTION 'Free tier (tier_level = 0) cannot be disabled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND subscription_price = 0) THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM class_subscriptions WHERE user_id = p_user_id AND class_id = p_class_id AND status = 'active' AND expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access class
CREATE OR REPLACE FUNCTION can_access_class(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_member BOOLEAN;
  v_is_free BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = p_user_id) INTO v_is_teacher;
  IF v_is_teacher THEN RETURN true; END IF;

  SELECT EXISTS (SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = p_user_id AND status = 'ACTIVE') INTO v_is_member;
  IF NOT v_is_member THEN RETURN false; END IF;

  SELECT subscription_price = 0 INTO v_is_free FROM classes WHERE id = p_class_id;
  IF v_is_free THEN RETURN true; END IF;

  RETURN has_active_subscription(p_user_id, p_class_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functions for conversation RLS
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = p_conversation_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION get_conversation_participant_count(p_conversation_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM conversation_participants WHERE conversation_id = p_conversation_id;
$$;

-- Find existing DM
CREATE OR REPLACE FUNCTION find_existing_dm(p_class_id UUID, p_user1_id UUID, p_user2_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = auth.uid() AND status = 'ACTIVE')
     AND NOT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this class';
  END IF;

  SELECT c.id INTO v_conversation_id FROM conversations c
  WHERE c.class_id = p_class_id
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_user1_id)
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_user2_id)
    AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create DM conversation atomically
CREATE OR REPLACE FUNCTION create_dm_conversation(p_class_id UUID, p_target_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_conversation_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = v_caller_id AND status = 'ACTIVE')
     AND NOT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: caller is not a member of this class';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM memberships WHERE class_id = p_class_id AND user_id = p_target_user_id AND status = 'ACTIVE')
     AND NOT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = p_target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: target user is not a member of this class';
  END IF;

  IF v_caller_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  SELECT c.id INTO v_conversation_id FROM conversations c
  WHERE c.class_id = p_class_id
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = v_caller_id)
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = p_target_user_id)
    AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN RETURN v_conversation_id; END IF;

  INSERT INTO conversations (class_id) VALUES (p_class_id) RETURNING id INTO v_conversation_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conversation_id, v_caller_id), (v_conversation_id, p_target_user_id);
  RETURN v_conversation_id;
END;
$$;

-- ============================================
-- STEP 6: TRIGGERS
-- ============================================

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_member_count_trigger AFTER INSERT OR UPDATE OR DELETE ON memberships FOR EACH ROW EXECUTE FUNCTION update_class_member_count();
CREATE TRIGGER update_class_course_count_trigger AFTER INSERT OR UPDATE OR DELETE ON courses FOR EACH ROW EXECUTE FUNCTION update_class_course_count();

CREATE TRIGGER on_class_created_create_tiers AFTER INSERT ON classes FOR EACH ROW EXECUTE FUNCTION create_default_tiers();
CREATE TRIGGER on_payment_completed AFTER INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION record_tier_purchase();
CREATE TRIGGER on_subscription_tiers_update BEFORE UPDATE ON subscription_tiers FOR EACH ROW EXECUTE FUNCTION update_subscription_tiers_updated_at();
CREATE TRIGGER tr_enforce_free_tier_enabled BEFORE INSERT OR UPDATE ON subscription_tiers FOR EACH ROW EXECUTE FUNCTION enforce_free_tier_enabled();

-- ============================================
-- STEP 7: INDEXES
-- ============================================
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_member_count ON classes(member_count);
CREATE INDEX idx_classes_course_count ON classes(course_count);
CREATE INDEX idx_memberships_class_id ON memberships(class_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_courses_class_id ON courses(class_id);
CREATE INDEX idx_courses_required_tier_level ON courses(required_tier_level);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_required_tier_level ON lessons(required_tier_level) WHERE required_tier_level IS NOT NULL;
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_posts_class_id ON posts(class_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_class_id ON conversations(class_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_subscription_tiers_class_id ON subscription_tiers(class_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_class_id ON payments(class_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_tier_purchases_user_id ON tier_purchases(user_id);
CREATE INDEX idx_tier_purchases_class_id ON tier_purchases(class_id);
CREATE INDEX idx_tier_purchases_tier_id ON tier_purchases(tier_id);
CREATE INDEX idx_class_subscriptions_user ON class_subscriptions(user_id);
CREATE INDEX idx_class_subscriptions_class ON class_subscriptions(class_id);
CREATE INDEX idx_class_subscriptions_status ON class_subscriptions(status);
CREATE INDEX idx_class_subscriptions_expires ON class_subscriptions(expires_at);

-- ============================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 9: RLS POLICIES - PROFILES
-- ============================================
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- STEP 10: RLS POLICIES - CLASSES
-- ============================================
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create classes" ON classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own classes" ON classes FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classes" ON classes FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

-- ============================================
-- STEP 11: RLS POLICIES - MEMBERSHIPS
-- ============================================
CREATE POLICY "Users can view memberships" ON memberships FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM classes WHERE classes.id = memberships.class_id AND classes.teacher_id = auth.uid()) OR is_class_member(class_id, auth.uid()));
CREATE POLICY "Users can create memberships" ON memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memberships" ON memberships FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STEP 12: RLS POLICIES - COURSES
-- ============================================
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create courses" ON courses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Teachers can update own courses" ON courses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Teachers can delete own courses" ON courses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid()));

-- ============================================
-- STEP 13: RLS POLICIES - LESSONS
-- ============================================
CREATE POLICY "Anyone can view lessons" ON lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create lessons" ON lessons FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM courses c JOIN classes cl ON cl.id = c.class_id WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()));
CREATE POLICY "Teachers can update own lessons" ON lessons FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM courses c JOIN classes cl ON cl.id = c.class_id WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()));
CREATE POLICY "Teachers can delete own lessons" ON lessons FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM courses c JOIN classes cl ON cl.id = c.class_id WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()));

-- ============================================
-- STEP 14: RLS POLICIES - LESSON PROGRESS
-- ============================================
CREATE POLICY "Users can view own progress" ON lesson_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teachers can view student progress" ON lesson_progress FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id JOIN classes cl ON cl.id = c.class_id WHERE l.id = lesson_progress.lesson_id AND cl.teacher_id = auth.uid()));
CREATE POLICY "Users can create own progress" ON lesson_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON lesson_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON lesson_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STEP 15: RLS POLICIES - POSTS
-- ============================================
CREATE POLICY "Users can view posts in their classes" ON posts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM memberships WHERE memberships.class_id = posts.class_id AND memberships.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM classes WHERE classes.id = posts.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "Users can create posts in their classes" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND (EXISTS (SELECT 1 FROM memberships WHERE memberships.class_id = posts.class_id AND memberships.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM classes WHERE classes.id = posts.class_id AND classes.teacher_id = auth.uid())));
CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors and teachers can delete posts" ON posts FOR DELETE TO authenticated USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM classes WHERE classes.id = posts.class_id AND classes.teacher_id = auth.uid()));

-- ============================================
-- STEP 16: RLS POLICIES - COMMENTS
-- ============================================
CREATE POLICY "Users can view comments on accessible posts" ON comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM posts p JOIN classes c ON c.id = p.class_id WHERE p.id = comments.post_id AND (EXISTS (SELECT 1 FROM memberships WHERE class_id = c.id AND user_id = auth.uid()) OR c.teacher_id = auth.uid())));
CREATE POLICY "Users can create comments on accessible posts" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM posts p JOIN classes c ON c.id = p.class_id WHERE p.id = comments.post_id AND (EXISTS (SELECT 1 FROM memberships WHERE class_id = c.id AND user_id = auth.uid()) OR c.teacher_id = auth.uid())));
CREATE POLICY "Authors can update own comments" ON comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete own comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ============================================
-- STEP 17: RLS POLICIES - REACTIONS
-- ============================================
CREATE POLICY "Users can view post reactions" ON post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create post reactions" ON post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own post reactions" ON post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view comment reactions" ON comment_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comment reactions" ON comment_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment reactions" ON comment_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STEP 18: RLS POLICIES - CONVERSATIONS
-- ============================================
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_participants.conversation_id = conversations.id AND conversation_participants.user_id = auth.uid()));
CREATE POLICY "Class members can create conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (class_id IS NOT NULL AND (EXISTS (SELECT 1 FROM memberships m WHERE m.class_id = conversations.class_id AND m.user_id = auth.uid() AND m.status = 'ACTIVE') OR EXISTS (SELECT 1 FROM classes c WHERE c.id = conversations.class_id AND c.teacher_id = auth.uid())));

-- ============================================
-- STEP 19: RLS POLICIES - CONVERSATION PARTICIPANTS
-- ============================================
CREATE POLICY "cp_select_policy" ON conversation_participants FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "cp_insert_policy" ON conversation_participants FOR INSERT TO authenticated WITH CHECK (get_conversation_participant_count(conversation_id) < 2 OR is_conversation_participant(conversation_id, auth.uid()));

-- ============================================
-- STEP 20: RLS POLICIES - MESSAGES
-- ============================================
CREATE POLICY "messages_select_policy" ON messages FOR SELECT TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_insert_policy" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "messages_update_policy" ON messages FOR UPDATE TO authenticated USING (is_conversation_participant(conversation_id, auth.uid()));

-- ============================================
-- STEP 21: RLS POLICIES - SUBSCRIPTION TIERS
-- ============================================
CREATE POLICY "subscription_tiers_select" ON subscription_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "subscription_tiers_insert" ON subscription_tiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "subscription_tiers_update" ON subscription_tiers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = subscription_tiers.class_id AND classes.teacher_id = auth.uid()));

-- ============================================
-- STEP 22: RLS POLICIES - PAYMENTS
-- ============================================
CREATE POLICY "users_view_own_payments" ON payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_create_own_payments" ON payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "teachers_view_class_payments" ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = payments.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "payments_update_own" ON payments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 23: RLS POLICIES - TIER PURCHASES
-- ============================================
CREATE POLICY "tier_purchases_select_own" ON tier_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tier_purchases_select_teacher" ON tier_purchases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = tier_purchases.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "tier_purchases_insert" ON tier_purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tier_purchases_update_own" ON tier_purchases FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- STEP 24: RLS POLICIES - CLASS SUBSCRIPTIONS
-- ============================================
CREATE POLICY "Users can read own subscriptions" ON class_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can read class subscriptions" ON class_subscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM classes WHERE classes.id = class_subscriptions.class_id AND classes.teacher_id = auth.uid()));
CREATE POLICY "System can manage subscriptions" ON class_subscriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- STEP 25: GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role, anon, authenticator;
GRANT SELECT, INSERT, UPDATE ON subscription_tiers TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON tier_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'SCHEMA SETUP COMPLETE!' as status;
