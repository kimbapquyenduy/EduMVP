# Migration Guide: Schools → Classes

## ✅ Completed Updates

### 1. Database Schema
- ✅ Created consolidated schema ([001_complete_schema.sql](supabase/migrations/001_complete_schema.sql))
- ✅ Renamed `schools` table → `classes` table
- ✅ Added `lessons` table (multiple lessons per course)
- ✅ Added `lesson_progress` table for tracking completion
- ✅ Added messaging system (`conversations`, `messages`)
- ✅ Added community features (`posts`, `comments`, `reactions`)

### 2. TypeScript Types
- ✅ Updated [database.types.ts](src/lib/types/database.types.ts)
- ✅ Renamed `School` interface → `Class` interface
- ✅ Added `Lesson`, `LessonProgress`, `Post`, `Comment`, `Message` types

### 3. Component Files Updated
- ✅ Created [DeleteClassButton.tsx](src/components/teacher/DeleteClassButton.tsx) (renamed from DeleteSchoolButton)
- ✅ Created [EditClassForm.tsx](src/components/teacher/EditClassForm.tsx) (renamed from EditSchoolForm)
- ✅ Updated [CreateCourseDialog.tsx](src/components/teacher/CreateCourseDialog.tsx) - `schoolId` → `classId`
- ✅ Updated [CoursesTab.tsx](src/components/teacher/CoursesTab.tsx) - `schoolId` → `classId`
- ✅ Updated [MembersTab.tsx](src/components/teacher/MembersTab.tsx) - `schoolId` → `classId`

## 🚧 Remaining Updates Needed

### 1. Page Files & Routes
These files still need to be updated and routes renamed:

**Teacher Dashboard:**
- [ ] `src/app/teacher/dashboard/page.tsx` - Update table reference from `schools` to `classes`

**Class Management Pages (need to rename folder from `/schools/` to `/classes/`):**
- [ ] `src/app/teacher/schools/[schoolId]/page.tsx` → `src/app/teacher/classes/[classId]/page.tsx`
- [ ] `src/app/teacher/schools/[schoolId]/settings/page.tsx` → `src/app/teacher/classes/[classId]/settings/page.tsx`
- [ ] `src/app/teacher/schools/[schoolId]/courses/[courseId]/page.tsx` → `src/app/teacher/classes/[classId]/courses/[courseId]/page.tsx`
- [ ] `src/app/teacher/schools/new/page.tsx` → `src/app/teacher/classes/new/page.tsx`

### 2. Folder Structure
Need to rename directory:
```
src/app/teacher/schools/ → src/app/teacher/classes/
```

### 3. Update OLD Component Files
These old component files should be deleted after verifying new ones work:
- [ ] Delete `src/components/teacher/DeleteSchoolButton.tsx`
- [ ] Delete `src/components/teacher/EditSchoolForm.tsx`

## 📝 Next Steps

1. **Test the database migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the reset script (if needed)
   - Run [001_complete_schema.sql](supabase/migrations/001_complete_schema.sql)

2. **Update all page files** - Change all references from:
   - `schools` table → `classes` table
   - `school_id` column → `class_id` column
   - `schoolId` variable → `classId` variable
   - `/teacher/schools/` routes → `/teacher/classes/` routes

3. **Rename folder structure:**
   - Move `src/app/teacher/schools/` → `src/app/teacher/classes/`

4. **Update all UI text:**
   - "School" → "Class"
   - "school" → "class"

5. **Delete old component files** after verification

## 🎯 New Features to Build

After migration is complete, build these new features:

1. **Class Navigation Tabs** (Community, Classroom, Members, About)
2. **Community Feed System** (posts, comments, likes)
3. **Lessons UI** (manage lessons within courses)
4. **Progress Tracking UI** (show course completion %)
5. **Messaging System UI** (DMs between students and teacher)
6. **Student Dashboard** (join classes, view content)

## ⚠️ Important Notes

- **Database change is breaking**: You need to reset your Supabase database or migrate existing data
- **All routes change**: `/teacher/schools/*` becomes `/teacher/classes/*`
- **Test thoroughly** after each update to ensure nothing breaks
