# Debug Report: Unlock Popup Not Showing

**Date:** 2025-12-28
**Issue:** UnlockPrompt component not visible to students accessing premium lessons
**Status:** Root causes identified, verification needed

---

## Executive Summary

Investigated why UnlockPrompt not showing for students. Code logic verified correct via unit testing. Identified 3 potential root causes: (1) sidebar collapsed on mobile hiding content, (2) course contains zero lessons, (3) database free tier not created. Most likely: **sidebar visibility issue on small screens**.

---

## Technical Analysis

### Data Flow Verification

**Page Component (page.tsx:54-70)** ✅
```typescript
// Fetches tier purchase
const { data: tierPurchase } = await supabase
  .from('tier_purchases')
  .select('*, tier:subscription_tiers(*)')
  .eq('user_id', user.id)
  .eq('class_id', classId)
  .single()

// Fetches free tier lesson count
const { data: freeTier } = await supabase
  .from('subscription_tiers')
  .select('lesson_unlock_count')
  .eq('class_id', classId)
  .eq('tier_level', 0)
  .single()

const freeTierLessonCount = freeTier?.lesson_unlock_count ?? 0
```
Props correctly passed to StudentCourseViewer (line 100-101).

**Access Calculation (StudentCourseViewer.tsx:174-183)** ✅
```typescript
const accessibleCount = useMemo(() => {
  return getAccessibleLessonCount(lessons.length, currentTierPurchase, false, freeTierLessonCount)
}, [lessons.length, currentTierPurchase, freeTierLessonCount])

const hasLockedLessons = accessibleCount < lessons.length
```

**Conditional Rendering (StudentCourseViewer.tsx:242-250)** ✅
```typescript
{hasLockedLessons && (
  <UnlockPrompt
    classId={classId}
    currentTier={currentTierPurchase}
    accessibleCount={accessibleCount}
    totalCount={lessons.length}
    onUpgrade={() => setIsUpgradeModalOpen(true)}
  />
)}
```

### Logic Test Results

Created test harness, verified calculations:
- No purchase, 0 free, 10 total → accessible=0, hasLockedLessons=true ✅
- No purchase, 3 free, 10 total → accessible=3, hasLockedLessons=true ✅
- Tier 1 (5 lessons), 10 total → accessible=5, hasLockedLessons=true ✅
- Tier 3 (unlimited), 10 total → accessible=10, hasLockedLessons=false ✅

All logic correct. Issue is runtime/environment.

---

## Root Cause Candidates

### 1. Sidebar Collapsed (High Probability)

**Evidence:**
```typescript
// Line 239
<div className={`${sidebarCollapsed ? 'w-0' : 'w-80 lg:w-96'} transition-all duration-300 border-r bg-background overflow-hidden flex-shrink-0`}>
  {hasLockedLessons && <UnlockPrompt ... />}
</div>
```

**Issue:**
- When `sidebarCollapsed=true`, sidebar width → 0
- `overflow-hidden` clips content
- UnlockPrompt exists in DOM but invisible

**Toggle Button (line 488-493):**
```typescript
<button
  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
  className="fixed bottom-4 left-4 z-50 lg:hidden bg-primary ..."
>
```
- Only visible on mobile (`lg:hidden`)
- If user on mobile with collapsed sidebar → content hidden
- Default state: `useState(false)` - should be visible initially

**Likelihood:** Medium-High if testing on mobile/tablet

### 2. No Lessons in Course (Medium Probability)

**Logic:**
```typescript
const hasLockedLessons = accessibleCount < lessons.length
// If lessons.length = 0:
// 0 < 0 = false → UnlockPrompt hidden
```

**Empty State (line 325-332):**
```typescript
{lessons.length === 0 && (
  <div className="text-center py-12 text-muted-foreground">
    <div className="h-16 w-16 rounded-full bg-primary/10 ...">
      <PlayCircle className="h-8 w-8 text-primary" />
    </div>
    <p className="text-sm">No lessons yet</p>
  </div>
)}
```

**If course has 0 lessons:**
- hasLockedLessons = false
- Empty state shows instead
- No unlock prompt needed (correct behavior)

**Verification needed:** Check test course has lessons

### 3. Free Tier Missing from Database (Low-Medium Probability)

**Migration Status:**
- 008_TEACHER_CONFIGURABLE_TIERS.sql creates tier_level=0
- Backfills existing classes (lines 42-57)

**If migration not applied:**
- `freeTier` query returns null
- `freeTierLessonCount = 0` (fallback)
- For student without purchase: `accessibleCount = 0`
- **Result:** `hasLockedLessons = 0 < lessons.length = true` ✅
- **UnlockPrompt should still show!**

**Conclusion:** Even if free tier missing, logic works correctly. Not blocking issue.

---

## Supporting Evidence

### Database Schema

**subscription_tiers table:**
```sql
-- Migration 008 (line 14-15)
ALTER TABLE subscription_tiers
ADD CONSTRAINT subscription_tiers_tier_level_check
CHECK (tier_level IN (0, 1, 2, 3));

-- Auto-creates free tier for new classes (line 22-23)
INSERT INTO subscription_tiers (class_id, tier_level, name, price, lesson_unlock_count)
VALUES (NEW.id, 0, 'Miễn phí', 0, 0);
```

Free tier creation confirmed in migrations.

### lesson-access.ts Functions

**getLessonAccessStatus (line 18-40):**
```typescript
// Teachers → unlocked
if (isTeacher) return 'unlocked'

// Free lessons → unlocked
if (lessonIndex < freeTierLessonCount) return 'unlocked'

// No purchase → locked
if (!tierPurchase) return 'locked'

// Unlimited tier → unlocked
if (tierPurchase.tier.lesson_unlock_count === null) return 'unlocked'

// Within tier limit → unlocked
if (lessonIndex < tierPurchase.tier.lesson_unlock_count) return 'unlocked'

return 'locked'
```
Verified correct via testing.

**getAccessibleLessonCount (line 81-98):**
```typescript
if (isTeacher) return totalLessons
if (!tierPurchase) return Math.min(freeTierLessonCount, totalLessons)
if (tierPurchase.tier.lesson_unlock_count === null) return totalLessons
return Math.min(tierPurchase.tier.lesson_unlock_count, totalLessons)
```
Verified correct via testing.

---

## Actionable Recommendations

### Immediate Fixes

**1. Add Debug Console Logs (Priority: High)**

Insert in StudentCourseViewer.tsx after line 210:
```typescript
const hasLockedLessons = accessibleCount < lessons.length

// DEBUG
useEffect(() => {
  console.log('🔍 UnlockPrompt Debug:', {
    hasLockedLessons,
    accessibleCount,
    totalLessons: lessons.length,
    tierPurchase: currentTierPurchase,
    freeTierLessonCount,
    sidebarCollapsed
  })
}, [hasLockedLessons, accessibleCount, lessons.length, currentTierPurchase, freeTierLessonCount, sidebarCollapsed])
```

**Expected output if working:**
```
hasLockedLessons: true
accessibleCount: 0 (or 3, depending on free tier)
totalLessons: 10 (non-zero)
tierPurchase: null
freeTierLessonCount: 0 (or configured value)
sidebarCollapsed: false
```

**2. Check Browser DevTools (Priority: High)**

Steps:
1. Open course page as student
2. Open DevTools → Elements
3. Search for `UnlockPrompt` or class `border-amber-200`
4. Check if element exists
5. Check computed styles (width, display, overflow)

**If element exists but hidden:**
- Sidebar likely collapsed
- Check parent div width

**If element doesn't exist:**
- `hasLockedLessons = false`
- Check lessons.length value

**3. Verify Database State (Priority: Medium)**

Run queries:
```sql
-- Check free tier exists
SELECT id, class_id, tier_level, lesson_unlock_count, is_enabled
FROM subscription_tiers
WHERE tier_level = 0 AND class_id = '<test-class-id>';

-- Check course has lessons
SELECT COUNT(*) FROM lessons WHERE course_id = '<test-course-id>';

-- Check student tier purchase
SELECT tp.*, st.tier_level, st.lesson_unlock_count
FROM tier_purchases tp
JOIN subscription_tiers st ON st.id = tp.tier_id
WHERE tp.user_id = '<student-id>' AND tp.class_id = '<test-class-id>';
```

**Expected results:**
- Free tier: 1 row, lesson_unlock_count = 0 or configured value
- Lessons: count > 0
- Tier purchase: 0 rows (for testing non-premium student)

### Long-term Improvements

**1. Make UnlockPrompt More Visible on Mobile**

Move outside collapsible sidebar or add fixed position variant:
```typescript
{/* Desktop: in sidebar */}
<div className="hidden lg:block">
  {hasLockedLessons && <UnlockPrompt ... />}
</div>

{/* Mobile: fixed bottom banner */}
<div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
  {hasLockedLessons && <UnlockPrompt ... />}
</div>
```

**2. Add Visual Indicator on Locked Lesson Click**

Currently clicking locked lesson opens modal (line 187-188). Consider adding toast notification:
```typescript
const handleLessonSelect = (lesson: Lesson, index: number) => {
  if (lessonAccessMap[index] === 'locked') {
    toast.info('Bài học này đã bị khóa. Nâng cấp để mở khóa!')
    setIsUpgradeModalOpen(true)
  } else {
    setSelectedLesson(lesson)
  }
}
```

**3. Persist Sidebar State**

Save sidebar state to localStorage:
```typescript
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  }
  return false
})

useEffect(() => {
  localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed))
}, [sidebarCollapsed])
```

**4. Add Loading State Verification**

Ensure prompt shows after lessons load:
```typescript
if (loading) {
  return <div>Loading lessons...</div>
}

// Only compute after lessons loaded
const hasLockedLessons = lessons.length > 0 && accessibleCount < lessons.length
```

---

## Unresolved Questions

1. **What device/screen size is user testing on?**
   - Desktop (>1024px): sidebar always visible
   - Tablet/Mobile: sidebar may be collapsed
   - Check `sidebarCollapsed` state

2. **Does test course contain lessons?**
   - If lessons.length = 0, no prompt shown (expected)
   - Verify via database or UI

3. **Is sidebar visible when testing?**
   - Check parent div width in DevTools
   - Try clicking toggle button (if on mobile)

4. **Have all migrations been applied?**
   - Especially 008_TEACHER_CONFIGURABLE_TIERS.sql
   - Check subscription_tiers has tier_level=0 rows

5. **What browser/version?**
   - Check CSS compatibility
   - Test in Chrome DevTools mobile emulation

---

## Test Verification Script

Created: `test-unlock-logic.js`

Run: `node test-unlock-logic.js`

All tests passed ✅

---

## Files Examined

1. `src/app/student/classes/[classId]/courses/[courseId]/page.tsx` (lines 54-70, 94-102)
2. `src/components/student/StudentCourseViewer.tsx` (lines 140-210, 242-250)
3. `src/lib/utils/lesson-access.ts` (lines 18-98)
4. `src/components/shared/UnlockPrompt.tsx` (full component)
5. `src/components/checkout/TierPurchaseModal.tsx` (modal behavior)
6. `supabase/008_TEACHER_CONFIGURABLE_TIERS.sql` (free tier creation)
7. `supabase/006_SUBSCRIPTION_TIERS_SCHEMA.sql` (schema definition)

---

## Conclusion

**Root cause: Most likely sidebar visibility issue on mobile devices.**

Code logic verified correct. UnlockPrompt should render when:
- `lessons.length > 0` (course has lessons)
- `accessibleCount < lessons.length` (has locked lessons)

If not visible, check:
1. Sidebar not collapsed (sidebarCollapsed=false)
2. Course has lessons (lessons.length > 0)
3. Browser DevTools for DOM/CSS issues

**Next action:** Add debug console.log, test in browser DevTools, verify database state.
