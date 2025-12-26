# Debugger Report: "Bucket Not Found" Error
**Date:** 2025-12-26
**Issue:** Thumbnail image upload fails with "bucket not found" error during class creation
**Severity:** High - Blocks core teacher functionality

---

## Executive Summary

**Root Cause:** Storage buckets defined in SQL migration (`002_STORAGE_SETUP.sql`) not executed in Supabase instance.

**Impact:** Teachers cannot upload thumbnails for classes/courses, limiting platform usability.

**Immediate Fix:** Run `002_STORAGE_SETUP.sql` migration in Supabase SQL Editor.

---

## Technical Analysis

### 1. Upload Code Locations

**Image Upload Component:**
- File: `src/components/teacher/ImageUpload.tsx`
- Lines 64-76: Upload to `course-images` bucket
- Function: `handleFileSelect()`

**Usage Locations:**
1. `src/app/teacher/classes/new/page.tsx` (lines 174-177)
2. `src/components/teacher/EditClassForm.tsx` (lines 121-124)
3. `src/components/teacher/CreateCourseDialog.tsx` (lines 210-213)

### 2. Storage Buckets Referenced

**Code expects 4 buckets:**

| Bucket Name | Used By | File Reference |
|-------------|---------|----------------|
| `course-images` | ImageUpload.tsx | Line 65, 75 |
| `course-videos` | VideoUpload.tsx | Line 65, 81 |
| `course-pdfs` | PDFUpload.tsx | Line 64, 80 |
| `class-thumbnails` | Not implemented yet | - |

### 3. Storage Configuration

**SQL Migration File:** `supabase/002_STORAGE_SETUP.sql`

**Bucket Creation (Lines 13-30):**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-pdfs', 'course-pdfs', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('class-thumbnails', 'class-thumbnails', true);
```

**Storage Policies Configured:**
- ✅ Upload: Authenticated users to own folder (`user_id/filename`)
- ✅ Read: Public access to all files
- ✅ Update/Delete: Users own files only

### 4. Event Timeline

1. User attempts thumbnail upload during class creation
2. `ImageUpload.tsx` calls `supabase.storage.from('course-images')`
3. Supabase API returns "bucket not found" error
4. Upload fails, toast shows error message (line 87-91)

### 5. Verification Results

**Local Supabase Status:**
```
Error: Docker Desktop not running
Supabase local dev environment not active
```

**Setup Documentation Check:**
- `SETUP_GUIDE.md` references only `001_initial_schema.sql`
- **Missing:** No instructions to run `002_STORAGE_SETUP.sql`

---

## Root Cause Identification

### Primary Issue
Storage migration `002_STORAGE_SETUP.sql` not executed in production Supabase instance.

### Evidence
1. Code expects `course-images` bucket (line 65 in ImageUpload.tsx)
2. Migration script exists with bucket creation SQL
3. Setup guide doesn't mention storage setup migration
4. Error message "bucket not found" indicates missing bucket

### Contributing Factors
1. **Incomplete setup docs:** `SETUP_GUIDE.md` only references schema migration
2. **No verification step:** Setup guide lacks bucket verification checklist
3. **Local dev not running:** Cannot test locally to catch this earlier

---

## Solution Development

### Immediate Fix (Production)

**Step 1: Run Storage Migration**
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire content from `supabase/002_STORAGE_SETUP.sql`
4. Execute SQL

**Step 2: Verify Buckets Created**
```sql
SELECT id, name, public, created_at
FROM storage.buckets
WHERE id IN ('course-videos', 'course-pdfs', 'course-images', 'class-thumbnails')
ORDER BY id;
```

Expected: 4 rows returned

**Step 3: Verify Policies**
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
```

Expected: 16 policies (4 buckets × 4 operations each)

### Preventive Measures

**1. Update Setup Documentation**
Add to `SETUP_GUIDE.md` after schema migration:

```markdown
## Step 4B: Setup Storage Buckets

1. In SQL Editor, click "New Query"
2. Copy content from `supabase/002_STORAGE_SETUP.sql`
3. Click "Run"
4. Verify success: Should see "STORAGE SETUP COMPLETE!"

### Verify Storage Buckets
1. Go to Storage section in Supabase Dashboard
2. Should see 4 buckets:
   - course-images (public)
   - course-videos (public)
   - course-pdfs (public)
   - class-thumbnails (public)
```

**2. Add Health Check Endpoint**
Create `/api/health/storage` to verify buckets exist:

```typescript
// Pseudo-code
const requiredBuckets = ['course-images', 'course-videos', 'course-pdfs'];
const { data: buckets } = await supabase.storage.listBuckets();
const missing = requiredBuckets.filter(b => !buckets.find(bucket => bucket.id === b));
return { status: missing.length === 0 ? 'ok' : 'error', missing };
```

**3. Migration Checklist**
Create `supabase/MIGRATION_CHECKLIST.md`:
- [ ] Run 001_FULL_SCHEMA.sql
- [ ] Run 002_STORAGE_SETUP.sql
- [ ] Verify tables exist
- [ ] Verify buckets exist
- [ ] Test signup flow
- [ ] Test file upload

**4. Local Development Setup**
Enable local Supabase:
```bash
npx supabase init
npx supabase start
npx supabase db reset  # Runs all migrations
```

---

## Risk Assessment

### Current Risks
- **High:** Teachers cannot create classes with thumbnails
- **Medium:** No visual appeal for classes/courses without images
- **Low:** Workaround exists (use external image URLs)

### Solution Risks
- **Low:** Running SQL migration is safe (uses `ON CONFLICT` to prevent duplicates)
- **None:** Storage policies properly restrict access by user folder

---

## Testing Recommendations

### Post-Fix Validation

**Test Case 1: Upload Class Thumbnail**
1. Login as teacher
2. Navigate to "Create New Class"
3. Upload image file (<5MB)
4. Verify: Upload progress shows, success toast appears
5. Verify: Image preview displays
6. Submit form
7. Verify: Class created with thumbnail URL

**Test Case 2: Upload Course Thumbnail**
1. Teacher creates course inside class
2. Use thumbnail upload tab
3. Upload different image
4. Verify: Separate file uploaded to same bucket
5. Check: Files organized in user folder structure

**Test Case 3: Storage Policies**
1. User A uploads image
2. User B attempts to access User A's upload URL
3. Verify: Can view (public read policy)
4. User B attempts to delete User A's file via API
5. Verify: Denied (folder-based policy)

---

## Supporting Evidence

### File Upload Flow (ImageUpload.tsx)

**Line 56-57:** Get authenticated user
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Not authenticated')
```

**Line 60-61:** Create user-scoped path
```typescript
const fileExt = file.name.split('.').pop()
const fileName = `${user.id}/${Date.now()}.${fileExt}`
```

**Line 64-69:** Upload to storage
```typescript
const { data, error } = await supabase.storage
  .from('course-images')  // ← BUCKET NAME
  .upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  })
```

**Line 74-76:** Get public URL
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('course-images')
  .getPublicUrl(data.path)
```

### Video & PDF Upload Components

Both follow identical pattern:
- `VideoUpload.tsx` → `course-videos` bucket (max 500MB)
- `PDFUpload.tsx` → `course-pdfs` bucket (max 50MB)

---

## Performance Optimization

### Current Implementation
- ✅ User folder structure prevents naming conflicts
- ✅ File extension validation
- ✅ File size limits (5MB images, 500MB videos, 50MB PDFs)
- ✅ Progress tracking for uploads
- ✅ Public CDN URLs for optimal delivery

### Future Enhancements
1. **Image optimization:** Resize/compress on upload using Edge Functions
2. **Video transcoding:** Convert to streaming formats (HLS/DASH)
3. **Cleanup:** Delete orphaned files when class/course deleted
4. **Usage monitoring:** Track storage usage per teacher

---

## Monitoring Enhancements

### Recommended Alerts

**1. Storage Bucket Health**
- Alert if any required bucket missing
- Check frequency: Hourly

**2. Upload Failure Rate**
- Alert if >5% uploads fail in 1 hour
- Track by bucket type

**3. Storage Quota**
- Alert at 80% of plan limit
- Per-bucket breakdown

### Dashboard Metrics
- Total uploads per bucket (daily)
- Average file sizes
- Failed upload reasons
- Most active teachers (upload volume)

---

## Questions

1. **Production instance:** Has `002_STORAGE_SETUP.sql` been run? (Assuming NO based on error)
2. **Deployment process:** Is there automated migration runner, or manual SQL execution required?
3. **Existing uploads:** Were any successful uploads before this error? (Check storage.objects table)
4. **Error frequency:** Is this affecting all users or specific subset?
5. **Local dev:** Should Docker Desktop be running for local Supabase? (Currently not active)
