# Course Creation Cache Invalidation Bug

**Issue**: Newly created courses don't render immediately; only appear after tab switching.

**Date**: 2025-12-28
**Severity**: Medium
**Impact**: Poor UX - users must manually refresh or switch tabs to see new courses

---

## Root Cause Analysis

### Problem
**Cache invalidation mismatch between Next.js Server/Client paradigms**

`CreateCourseDialog` creates course → calls `router.refresh()` → expects UI update
BUT: `CoursesTab` uses client-side state loaded once on mount → doesn't re-fetch

### Technical Flow

1. **Course Creation** (`CreateCourseDialog.tsx:64-84`)
   - User submits form
   - Inserts course via Supabase client
   - Calls `router.refresh()` (line 80)
   - Closes dialog, resets state

2. **Expected Behavior**
   - `router.refresh()` invalidates Next.js server component cache
   - Page re-renders with fresh data

3. **Actual Behavior**
   - `router.refresh()` only affects server components
   - `CoursesTab` is client component (`'use client'` line 1)
   - Uses `useState` + `useEffect` (lines 24-31)
   - Effect dependency: `[classId]` only
   - **classId doesn't change → no re-fetch**

4. **Why Tab Switching Works**
   - Radix UI Tabs unmount inactive content
   - Switching away unmounts `CoursesTab`
   - Switching back remounts component
   - `useEffect` runs again → fresh data loaded

---

## Evidence

### File: `src/components/teacher/CreateCourseDialog.tsx`
**Lines 64-84** - Course creation handler:
```typescript
const { error } = await supabase.from('courses').insert(courseData)

if (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' })
} else {
  toast({ title: 'Success', description: 'Course created successfully' })
  setOpen(false)
  setPromoVideoUrl('')
  setThumbnailImageUrl('')
  router.refresh()  // ← Only refreshes server components
}
```

### File: `src/components/teacher/CoursesTab.tsx`
**Lines 23-31** - State management:
```typescript
const [courses, setCourses] = useState<CourseWithLessonCount[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  loadCourses()
}, [classId])  // ← Only re-runs if classId changes
```

**Lines 33-62** - Data fetching:
```typescript
const loadCourses = async () => {
  const supabase = createClient()
  const { data: coursesData } = await supabase
    .from('courses')
    .select('*')
    .eq('class_id', classId)
    .order('order_index', { ascending: true })
  // ... gets lesson counts, updates state
}
```

### File: `src/app/teacher/classes/[classId]/page.tsx`
**Lines 104-118** - Tab structure:
```typescript
<Tabs defaultValue="community" className="w-full">
  <TabsContent value="classroom">
    <CoursesTab classId={classId} />  // ← Client component in tabs
  </TabsContent>
</Tabs>
```

---

## Recommended Fixes

### Option 1: Callback Pattern (Simplest)
**Pass reload callback from parent → child**

Modify `CoursesTab` to expose `loadCourses`:
```typescript
// CoursesTab.tsx
export function CoursesTab({ classId }: CoursesTabProps) {
  // ... existing code ...

  return (
    <div>
      <CreateCourseDialog classId={classId} onCourseCreated={loadCourses} />
    </div>
  )
}
```

Update `CreateCourseDialog`:
```typescript
interface CreateCourseDialogProps {
  classId: string
  onCourseCreated?: () => void  // ← Add callback
}

// In handleSubmit after successful creation:
} else {
  toast({ title: 'Success', description: 'Course created successfully' })
  setOpen(false)
  onCourseCreated?.()  // ← Trigger parent refresh
  router.refresh()
}
```

**Pros**: Simple, no new dependencies
**Cons**: Tight coupling between components

---

### Option 2: Realtime Subscriptions (Robust)
**Use Supabase realtime to auto-update on changes**

```typescript
// CoursesTab.tsx
useEffect(() => {
  loadCourses()

  // Subscribe to course changes
  const supabase = createClient()
  const channel = supabase
    .channel('courses_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'courses', filter: `class_id=eq.${classId}` },
      () => loadCourses()  // Auto-reload on any change
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [classId])
```

**Pros**: Real-time updates, works across tabs/devices
**Cons**: More complex, requires Supabase realtime enabled

---

### Option 3: TanStack Query (Scalable)
**Add proper cache management library**

Install: `npm install @tanstack/react-query`

Setup provider in layout, then:
```typescript
// CoursesTab.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'

const { data: courses, isLoading } = useQuery({
  queryKey: ['courses', classId],
  queryFn: () => loadCourses()
})

// In CreateCourseDialog after creation:
const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: ['courses', classId] })
```

**Pros**: Industry standard, handles caching, deduplication, background refetch
**Cons**: New dependency, migration effort across app

---

## Immediate Action

**Recommend Option 1** for quick fix, consider Option 3 for long-term architecture.

### Implementation Steps (Option 1)
1. Update `CreateCourseDialog` interface to accept `onCourseCreated` callback
2. Update `CreateCourseDialog` to call callback after successful insert
3. Update `CoursesTab` to pass `loadCourses` as `onCourseCreated` prop
4. Test: Create course → should appear immediately without tab switch

---

## Prevention

**Pattern to avoid**:
- `router.refresh()` alone when client components hold state
- `useEffect` dependencies that miss data changes

**Better patterns**:
- Use callbacks for parent-child updates
- Use realtime subscriptions for data sync
- Use proper cache management (TanStack Query, SWR)
- Server components for data fetching when possible

---

## Similar Bugs to Check

### Other Files Using `router.refresh()`
```
src/components/shared/AppHeader.tsx
src/components/student/BrowseClasses.tsx
src/components/teacher/CreateCourseDialog.tsx ← Current bug
src/components/teacher/DeleteClassButton.tsx
src/components/teacher/EditClassForm.tsx
```

### Other Tab Components with Same Pattern
**Potentially affected**:
- `CommunityTab.tsx` - Uses `useState` + `useEffect([classId, filterCategory])`
- `MembersTab.tsx` - Uses `useState` + `useEffect`
- Any lesson management components

**Pattern check**:
```typescript
// Bad: Won't update when data changes externally
useEffect(() => { loadData() }, [classId])

// Good: Includes dependencies that trigger on data changes
// OR uses realtime subscriptions
// OR uses cache invalidation library
```

### High-Risk Areas
1. **DeleteClassButton + EditClassForm**: Likely call `router.refresh()` expecting parent list to update
2. **Student BrowseClasses**: May have similar cache staleness
3. **Lesson creation/deletion**: If exists, probably has same issue

---

## Unresolved Questions
- Is Supabase realtime enabled on this project?
- Do DeleteClassButton/EditClassForm have similar refresh issues?
- Are there lesson creation/deletion flows with same pattern?
- Performance impact of realtime subscriptions at scale?
