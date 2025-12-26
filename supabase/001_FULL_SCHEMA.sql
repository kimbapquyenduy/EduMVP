-- ============================================
-- EDU PLATFORM MVP - COMPLETE DATABASE SCHEMA
-- ============================================
-- Run this file FIRST to set up the complete database
-- This consolidates all schema, RLS policies, and permissions
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
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS post_category CASCADE;
DROP TYPE IF EXISTS course_tier CASCADE;
DROP TYPE IF EXISTS membership_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_course_completion(UUID, UUID) CASCADE;

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
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships (students joining classes)
CREATE TABLE memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status membership_status DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(class_id, user_id)
);

-- Courses (contains promotional content only)
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tier course_tier DEFAULT 'FREE',
  order_index INTEGER DEFAULT 0,
  promo_video_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons (actual learning content)
CREATE TABLE lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  pdf_url TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Progress (track student progress)
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

-- Post Reactions (likes)
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

-- Conversations (messaging)
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
CREATE OR REPLACE FUNCTION get_course_completion(
  p_course_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM lessons WHERE course_id = p_course_id;

  SELECT COUNT(*) INTO completed_lessons
  FROM lesson_progress
  WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = p_course_id)
  AND user_id = p_user_id
  AND is_completed = true;

  IF total_lessons = 0 THEN
    RETURN 0;
  ELSE
    RETURN ROUND((completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_role user_role;
BEGIN
  new_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'TEACHER' THEN 'TEACHER'::user_role
    WHEN NEW.raw_user_meta_data->>'role' = 'STUDENT' THEN 'STUDENT'::user_role
    ELSE 'STUDENT'::user_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    new_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for user %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 6: TRIGGERS
-- ============================================

-- Auto-create profile trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: INDEXES
-- ============================================
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_memberships_class_id ON memberships(class_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_courses_class_id ON courses(class_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
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
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

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

-- ============================================
-- STEP 9: RLS POLICIES - PROFILES
-- ============================================
CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 10: RLS POLICIES - CLASSES
-- ============================================
CREATE POLICY "Anyone can view classes"
ON classes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can create classes"
ON classes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classes"
ON classes FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes"
ON classes FOR DELETE
TO authenticated
USING (auth.uid() = teacher_id);

-- ============================================
-- STEP 11: RLS POLICIES - MEMBERSHIPS
-- ============================================
CREATE POLICY "Users can view memberships"
ON memberships FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = memberships.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Users can create memberships"
ON memberships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memberships"
ON memberships FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- STEP 12: RLS POLICIES - COURSES
-- ============================================
CREATE POLICY "Anyone can view courses"
ON courses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can create courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Teachers can update own courses"
ON courses FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid())
);

CREATE POLICY "Teachers can delete own courses"
ON courses FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM classes WHERE classes.id = courses.class_id AND classes.teacher_id = auth.uid())
);

-- ============================================
-- STEP 13: RLS POLICIES - LESSONS
-- ============================================
CREATE POLICY "Anyone can view lessons"
ON lessons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can create lessons"
ON lessons FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update own lessons"
ON lessons FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete own lessons"
ON lessons FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.id = lessons.course_id AND cl.teacher_id = auth.uid()
  )
);

-- ============================================
-- STEP 14: RLS POLICIES - LESSON PROGRESS
-- ============================================
CREATE POLICY "Users can view own progress"
ON lesson_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Teachers can view student progress"
ON lesson_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    JOIN classes cl ON cl.id = c.class_id
    WHERE l.id = lesson_progress.lesson_id
    AND cl.teacher_id = auth.uid()
  )
);

CREATE POLICY "Users can create own progress"
ON lesson_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON lesson_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON lesson_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- STEP 15: RLS POLICIES - POSTS
-- ============================================
CREATE POLICY "Users can view posts in their classes"
ON posts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.class_id = posts.class_id
    AND memberships.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = posts.class_id
    AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Users can create posts in their classes"
ON posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.class_id = posts.class_id
      AND memberships.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = posts.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Authors can update own posts"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors and teachers can delete posts"
ON posts FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = posts.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- ============================================
-- STEP 16: RLS POLICIES - COMMENTS
-- ============================================
CREATE POLICY "Users can view comments on accessible posts"
ON comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN classes c ON c.id = p.class_id
    WHERE p.id = comments.post_id
    AND (
      EXISTS (SELECT 1 FROM memberships WHERE class_id = c.id AND user_id = auth.uid())
      OR c.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create comments on accessible posts"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM posts p
    JOIN classes c ON c.id = p.class_id
    WHERE p.id = comments.post_id
    AND (
      EXISTS (SELECT 1 FROM memberships WHERE class_id = c.id AND user_id = auth.uid())
      OR c.teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "Authors can update own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own comments"
ON comments FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- ============================================
-- STEP 17: RLS POLICIES - REACTIONS
-- ============================================
CREATE POLICY "Users can view post reactions"
ON post_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create post reactions"
ON post_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post reactions"
ON post_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view comment reactions"
ON comment_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create comment reactions"
ON comment_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment reactions"
ON comment_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- STEP 18: RLS POLICIES - CONVERSATIONS
-- ============================================
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- STEP 19: RLS POLICIES - CONVERSATION PARTICIPANTS
-- ============================================
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- STEP 20: RLS POLICIES - MESSAGES
-- ============================================
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- ============================================
-- STEP 21: GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role, anon, authenticator;

GRANT ALL ON profiles TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON classes TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON memberships TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON courses TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON lessons TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON lesson_progress TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON posts TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON comments TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON post_reactions TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON comment_reactions TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON conversations TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON conversation_participants TO postgres, authenticated, service_role, anon, authenticator;
GRANT ALL ON messages TO postgres, authenticated, service_role, anon, authenticator;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'SCHEMA SETUP COMPLETE!' as status;
