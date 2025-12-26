-- ============================================
-- EDU PLATFORM MVP - STORAGE SETUP
-- ============================================
-- Run this file AFTER 001_FULL_SCHEMA.sql
-- This sets up storage buckets and policies for file uploads
-- ============================================

-- ============================================
-- STEP 1: CREATE STORAGE BUCKETS
-- ============================================

-- Course videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Course PDFs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-pdfs', 'course-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Course/class images bucket (thumbnails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Class thumbnails bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-thumbnails', 'class-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================
-- STEP 2: DROP EXISTING STORAGE POLICIES (Clean Slate)
-- ============================================

-- Videos policies
DROP POLICY IF EXISTS "Allow authenticated users to upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;

-- PDFs policies
DROP POLICY IF EXISTS "Allow authenticated users to upload pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view pdfs" ON storage.objects;

-- Images policies
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own images" ON storage.objects;

-- Class thumbnails policies
DROP POLICY IF EXISTS "Teachers can upload class thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update class thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete class thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view class thumbnails" ON storage.objects;

-- ============================================
-- STEP 3: STORAGE POLICIES - COURSE VIDEOS
-- ============================================

-- Allow authenticated users to upload videos (organized by user folder)
CREATE POLICY "Allow authenticated users to upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view videos
CREATE POLICY "Allow public to view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-videos');

-- Allow users to update their own videos
CREATE POLICY "Allow users to update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own videos
CREATE POLICY "Allow users to delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- STEP 4: STORAGE POLICIES - COURSE PDFS
-- ============================================

-- Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view PDFs
CREATE POLICY "Allow public to view pdfs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-pdfs');

-- Allow users to update their own PDFs
CREATE POLICY "Allow users to update own pdfs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own PDFs
CREATE POLICY "Allow users to delete own pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- STEP 5: STORAGE POLICIES - COURSE IMAGES
-- ============================================

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view images
CREATE POLICY "Allow public to view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-images');

-- Allow users to update their own images
CREATE POLICY "Allow users to update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- STEP 6: STORAGE POLICIES - CLASS THUMBNAILS
-- ============================================

-- Allow authenticated users to upload class thumbnails
CREATE POLICY "Allow authenticated users to upload class thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'class-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to view class thumbnails
CREATE POLICY "Allow public to view class thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'class-thumbnails');

-- Allow users to update their own class thumbnails
CREATE POLICY "Allow users to update own class thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'class-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own class thumbnails
CREATE POLICY "Allow users to delete own class thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'class-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check buckets were created
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('course-videos', 'course-pdfs', 'course-images', 'class-thumbnails');

-- Check policies were created
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

SELECT 'STORAGE SETUP COMPLETE!' as status;
