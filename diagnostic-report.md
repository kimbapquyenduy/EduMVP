# Unlock Popup Debug Analysis

## Investigation Progress

### 1. Code Logic Verification ✅
**Test Results:**
- Logic test shows correct behavior
- Scenario 1 (No purchase, 0 free): hasLockedLessons = true ✅
- All access calculation functions working correctly ✅

### 2. Component Structure ✅
**StudentCourseViewer.tsx (Line 210, 242):**
```typescript
const hasLockedLessons = accessibleCount < lessons.length

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
✅ Conditional rendering is correct

**UnlockPrompt.tsx (Line 29-31):**
```typescript
const isFullAccess = accessibleCount >= totalCount

if (isFullAccess) {
  return ( /* Green "Full Access" card */ )
}
```
✅ Shows appropriate UI based on access level

### 3. Data Flow Analysis

**Page Component (page.tsx):**
- Line 55-60: Fetches tierPurchase ✅
- Line 63-68: Fetches freeTier with tier_level=0 ✅
- Line 70: `freeTierLessonCount = freeTier?.lesson_unlock_count ?? 0` ✅
- Line 100-101: Passes both props to StudentCourseViewer ✅

**Props Passed:**
```typescript
<StudentCourseViewer
  tierPurchase={tierPurchase}
  freeTierLessonCount={freeTierLessonCount}
/>
```

### 4. Potential Issues Identified

#### Issue A: Database Migration Status ⚠️
**Finding:** Cannot verify if tier_level=0 rows exist in subscription_tiers table
- Migration 008_TEACHER_CONFIGURABLE_TIERS.sql adds free tier
- Migration creates free tier for existing classes (lines 42-57)
- **Need to verify:** Are migrations applied to production database?

#### Issue B: Sidebar Visibility 🔍
**Finding:** UnlockPrompt renders inside collapsible sidebar
```typescript
<div className={`${sidebarCollapsed ? 'w-0' : 'w-80 lg:w-96'} ... overflow-hidden`}>
  {hasLockedLessons && <UnlockPrompt ... />}
</div>
```
- If `sidebarCollapsed=true`, sidebar width becomes 0
- `overflow-hidden` would hide content
- **Likely on mobile:** Toggle button is `lg:hidden` (line 490)

#### Issue C: Props Not Updating After Purchase ⚠️
**Finding:** `currentTierPurchase` state may not sync with server state
- Line 51: `useState<TierPurchaseWithTier | null>(tierPurchase)`
- Line 195-207: Updates state after successful purchase
- **However:** Initial `tierPurchase` from server may be stale
- No revalidation trigger on mount

#### Issue D: Lessons Array Empty State 🔍
**Finding:** If `lessons.length === 0`, hasLockedLessons would be false
```typescript
const hasLockedLessons = accessibleCount < lessons.length
// If lessons.length = 0 and accessibleCount = 0:
// 0 < 0 = false
```
- UnlockPrompt wouldn't show
- Check line 325-332: Empty state is shown instead

### 5. Most Likely Root Causes

**Primary Suspect:** Issue A - Free tier (tier_level=0) not in database
- If migration not applied, freeTier query returns null
- `freeTierLessonCount = 0` (fallback)
- But `tierPurchase = null` for non-paying student
- `accessibleCount = Math.min(0, totalLessons) = 0` ✅
- `hasLockedLessons = 0 < totalLessons` ✅
- **Should still work!**

**Secondary Suspect:** Issue B - Sidebar collapsed on mobile
- User may be testing on mobile device
- Sidebar collapsed by default on small screens
- Content exists but is hidden (width: 0, overflow: hidden)

**Tertiary Suspect:** Issue D - No lessons in course
- If course has 0 lessons, no prompt needed
- Check if test course has lessons

## Next Steps Required

1. **Verify database state:**
   - Check if free tier exists: `SELECT * FROM subscription_tiers WHERE tier_level = 0`
   - Check if test class has lessons: `SELECT COUNT(*) FROM lessons WHERE course_id = ?`

2. **Test responsive behavior:**
   - Check if sidebar is visible on user's device
   - Test `sidebarCollapsed` state

3. **Add debug logging:**
   - Log `hasLockedLessons`, `accessibleCount`, `lessons.length`
   - Log `tierPurchase`, `freeTierLessonCount`
   - Verify values at runtime

4. **Browser DevTools:**
   - Check if UnlockPrompt DOM element exists
   - Check computed CSS (display, width, overflow)
   - Check React component tree

## Questions for User

1. What device/screen size are you testing on?
2. Does the course have lessons created?
3. Can you see the lessons list in the sidebar?
4. Have you run migrations on your database?
