# Investigation Report: Student-Facing Member Count Issue
**Date:** 2025-12-26
**Investigator:** Debugger Agent
**Severity:** Medium
**Status:** Root Cause Identified

---

## Executive Summary

**Issue:** Student-facing components display incorrect member counts (showing only 1, the current logged-in user) while teacher dashboard shows correct counts for all class members.

**Root Cause:** Row Level Security (RLS) policy on `memberships` table restricts students to only see their own membership records. Count queries return 1 instead of total class membership.

**Impact:** Students cannot see accurate class size information, affecting transparency and social proof. Affects:
- `/student/classes/[classId]` - Class detail header (line 95)
- `BrowseClasses` component - Class cards (lines 80-84)
- `MembersTab` - Member list when viewed by students (lines 34-46)

**Recommended Fix Priority:** HIGH - Core UX issue affecting student enrollment decisions and class perception.

---

## Technical Analysis

### 1. Student Components Displaying Member Counts

#### Component: `/student/classes/[classId]/page.tsx`
**Location:** Lines 55-58
**Query Pattern:**
```typescript
const { count: memberCount } = await supabase
  .from('memberships')
  .select('*', { count: 'exact', head: true })
  .eq('class_id', classId)
```
**Current Behavior:** Returns `1` (only current user's membership)
**Expected:** Total members in class

---

#### Component: `BrowseClasses.tsx`
**Location:** Lines 80-84
**Query Pattern:**
```typescript
const { count: membersCount } = await supabase
  .from('memberships')
  .select('*', { count: 'exact', head: true })
  .eq('class_id', classItem.id)
```
**Impact:** Browse page shows all classes with member_count = 1, even classes with 100+ students
**Critical for:** Enrollment decisions - students choose classes based on popularity

---

#### Component: `MembersTab.tsx`
**Location:** Lines 34-46
**Query Pattern:**
```typescript
const { data, error } = await supabase
  .from('memberships')
  .select(`
    id,
    status,
    joined_at,
    profiles:user_id (full_name, email)
  `)
  .eq('class_id', classId)
```
**Current Behavior:** Student sees only themselves in member list
**Expected:** All members in class (for community transparency)

---

### 2. Teacher Components (Working Correctly)

#### Component: `/teacher/dashboard/page.tsx`
**Location:** Lines 32-35
**Query Pattern:** IDENTICAL to student queries
```typescript
const { count: memberCount } = await supabase
  .from('memberships')
  .select('*', { count: 'exact', head: true })
  .eq('class_id', classItem.id)
```
**Current Behavior:** Returns accurate total count
**Reason:** Teacher satisfies RLS policy exception

---

### 3. RLS Policy Analysis

#### Source: `supabase/001_FULL_SCHEMA.sql`

**Lines 393-399: Memberships SELECT Policy**
```sql
CREATE POLICY "Users can view memberships"
ON memberships FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM classes WHERE classes.id = memberships.class_id AND classes.teacher_id = auth.uid())
);
```

**Policy Logic:**
- **Condition 1:** `user_id = auth.uid()` → Student sees ONLY their own membership
- **Condition 2:** `EXISTS (... classes.teacher_id = auth.uid())` → Teacher sees ALL memberships for their classes

**Root Cause:** Count queries apply this policy filter, so students get count of rows they can see (1), not total rows.

---

### 4. Query Comparison: Student vs Teacher

| Aspect | Student Query | Teacher Query | Result |
|--------|--------------|---------------|---------|
| SQL Pattern | `.select('*', { count: 'exact' }).eq('class_id', X)` | Same | Same query structure |
| RLS Filter Applied | `WHERE user_id = {student_id}` | `WHERE class_id IN (teacher's classes)` | Different filters |
| Rows Visible | 1 (own membership) | All class memberships | Different result sets |
| Count Returned | 1 | Accurate total | Count mismatch |

**Evidence:** Teacher dashboard (lines 32-35) uses IDENTICAL query pattern but gets correct results due to second RLS condition.

---

### 5. Verification of Current State

**Modified Files (from git status):**
- ✅ `src/app/teacher/dashboard/page.tsx` - Uses count pattern, works correctly
- ⚠️ `src/components/student/StudentCourseViewer.tsx` - No member count display (unaffected)
- ⚠️ `src/app/student/classes/[classId]/page.tsx` - **AFFECTED** (line 95 displays wrong count)

---

## Impact Assessment

### Business Impact
- **Enrollment Conversion:** Students may avoid classes appearing "empty" (showing 1 member)
- **Social Proof:** Popular classes lose competitive advantage
- **Transparency:** Students cannot gauge class community size

### Technical Impact
- **Data Integrity:** ✅ No data corruption - counts are filtered, not wrong
- **Performance:** ✅ No performance issues - queries are efficient
- **Security:** ✅ RLS working as designed for privacy

---

## Solution Options

### Option 1: Add Public Member Count Column to Classes Table (RECOMMENDED)
**Approach:** Denormalized counter cached on `classes` table, updated via trigger

**Pros:**
- No RLS bypass needed
- Fast queries (no JOIN, no aggregate)
- Accurate for all users
- Follows Supabase best practices

**Cons:**
- Requires migration
- Slight complexity with triggers

**Implementation:**
```sql
-- Add column
ALTER TABLE classes ADD COLUMN member_count INTEGER DEFAULT 0;

-- Trigger function
CREATE OR REPLACE FUNCTION update_class_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE classes SET member_count = (
      SELECT COUNT(*) FROM memberships WHERE class_id = NEW.class_id
    ) WHERE id = NEW.class_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE classes SET member_count = (
      SELECT COUNT(*) FROM memberships WHERE class_id = OLD.class_id
    ) WHERE id = OLD.class_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_class_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON memberships
FOR EACH ROW EXECUTE FUNCTION update_class_member_count();
```

---

### Option 2: Modify RLS Policy to Allow Aggregate Queries
**Approach:** Allow SELECT on memberships for aggregate counts without exposing individual records

**Pros:**
- No schema changes
- Quick fix

**Cons:**
- Complex RLS logic (hard to maintain)
- Supabase doesn't natively support "count-only" RLS
- May expose membership existence

**Implementation:** NOT RECOMMENDED - RLS doesn't distinguish between SELECT for data vs SELECT for count

---

### Option 3: Create Database View with Public Counts
**Approach:** Public view `class_member_counts` that bypasses RLS

**Pros:**
- Clean separation
- No RLS modification

**Cons:**
- Extra object to maintain
- Stale counts unless materialized view refreshed

**Implementation:**
```sql
CREATE VIEW class_member_counts AS
SELECT class_id, COUNT(*) as member_count
FROM memberships
GROUP BY class_id;

GRANT SELECT ON class_member_counts TO authenticated;
```

---

### Option 4: Server-Side Count Function (Service Role)
**Approach:** Create PostgreSQL function that runs with elevated privileges

**Pros:**
- No RLS policy changes
- Accurate counts

**Cons:**
- Requires SECURITY DEFINER (elevated privileges risk)
- More complex than Option 1

---

## Recommended Solution

**Option 1: Add member_count column to classes table**

**Rationale:**
1. **Best Practice:** Denormalized counters are standard for aggregate displays (see: Twitter followers, YouTube subscribers)
2. **Performance:** No JOIN overhead, instant reads
3. **Security:** No RLS bypass needed
4. **Maintainability:** Trigger handles updates automatically
5. **Supabase Native:** Follows Supabase documentation patterns

**Migration Steps:**
1. Add `member_count` column to `classes` table
2. Backfill existing counts: `UPDATE classes SET member_count = (SELECT COUNT(*) FROM memberships WHERE class_id = classes.id)`
3. Create trigger function
4. Create trigger on INSERT/UPDATE/DELETE for `memberships`
5. Update student components to read `memberCount` from `classes` JOIN instead of counting `memberships`

---

## Verification Plan

**After Fix:**
1. Create test class with 5 students
2. Login as student #3
3. Check counts in:
   - Browse classes page (`BrowseClasses.tsx`)
   - Class detail header (`/student/classes/[classId]`)
   - Members tab (`MembersTab.tsx`)
4. Verify all show "5 members"
5. Add 6th student, verify count updates to 6

**Regression Tests:**
- Teacher dashboard still shows correct counts
- Adding/removing students updates count immediately
- Deleted classes don't leave orphan counts

---

## Supporting Evidence

### RLS Policy Source
**File:** `supabase/001_FULL_SCHEMA.sql`
**Lines:** 393-399

### Affected Components
1. **Student Class Detail:** `src/app/student/classes/[classId]/page.tsx` (line 55-58, 95)
2. **Browse Classes:** `src/components/student/BrowseClasses.tsx` (lines 80-84, 190)
3. **Members Tab:** `src/components/teacher/MembersTab.tsx` (lines 34-46, 93)
   - Note: MembersTab used by BOTH teachers and students (imported in student class page line 13)

### Teacher Working Example
**File:** `src/app/teacher/dashboard/page.tsx`
**Lines:** 32-35 (count query), 181 (display)

---

## Timeline to Resolution

**Immediate (0-1 hour):**
- Create migration file with Option 1 implementation
- Test in development environment

**Short-term (1-4 hours):**
- Update all affected components to use `member_count` from classes
- Deploy to staging
- Run verification plan

**Long-term Prevention:**
- Document RLS impact on aggregate queries in developer guide
- Add integration tests for student vs teacher count views
- Consider similar pattern for course counts, lesson counts

---

## Unresolved Questions

1. Should member_count include ONLY active memberships, or also expired/cancelled? (Currently filters none)
2. Do we want to expose member list to students, or just the count? (Privacy consideration for MembersTab)
3. Should counts display "100+" for large classes to avoid intimidation/bandwagon effect?

---

## Appendix: Related Files

**Schema/Migrations:**
- `supabase/001_FULL_SCHEMA.sql` (RLS policies)

**Student Components:**
- `src/app/student/dashboard/page.tsx` (enrolled count - own memberships)
- `src/app/student/classes/[classId]/page.tsx` (class member count display)
- `src/components/student/BrowseClasses.tsx` (member count in cards)
- `src/components/student/MyClasses.tsx` (no member count - unaffected)
- `src/components/student/StudentCourseViewer.tsx` (no member count - unaffected)

**Teacher Components (Reference):**
- `src/app/teacher/dashboard/page.tsx` (working correctly)

**Shared Components:**
- `src/components/teacher/MembersTab.tsx` (used by both roles)
