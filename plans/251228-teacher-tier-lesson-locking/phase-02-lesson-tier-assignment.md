# Phase 2: Per-Lesson Tier Assignment

## Context
- Parent: [plan.md](plan.md)
- Dependencies: Phase 1 (optional - can be done in parallel)
- Docs: Extends lessons table with tier requirement

## Overview
| Field | Value |
|-------|-------|
| Date | 2025-12-28 |
| Priority | High |
| Implementation | Not Started |
| Review | Not Started |

## Key Insights
- Current lessons table has no tier column
- Teachers need per-lesson control (not just "first N")
- Default: null = use legacy lesson_unlock_count behavior
- Explicit tier: 0-3 overrides lesson position logic

## Requirements
1. Add `required_tier_level` column to lessons table
2. Create UI for teacher to set tier per lesson
3. Maintain backward compatibility with existing approach

## Architecture

### Database Change
```sql
-- New column on lessons table
ALTER TABLE lessons
ADD COLUMN required_tier_level INTEGER DEFAULT NULL
CHECK (required_tier_level IS NULL OR required_tier_level IN (0, 1, 2, 3));

COMMENT ON COLUMN lessons.required_tier_level IS
'Override tier requirement for this lesson. NULL = use class lesson_unlock_count logic.
0=Free, 1=Basic, 2=Standard, 3=Premium';
```

### Access Logic Update
```
IF lesson.required_tier_level IS NOT NULL:
  → Use explicit tier requirement
ELSE:
  → Use legacy lesson_unlock_count (first N lessons)
```

## Related Code Files
- `supabase/012_LESSON_TIER_REQUIREMENTS.sql` (new)
- `src/lib/types/database.types.ts` (update Lesson type)
- `src/components/teacher/LessonsManagement.tsx` (add tier selector)
- `src/components/teacher/LessonTierSelector.tsx` (new component)

## Implementation Steps

### Step 1: Database Migration
Create `supabase/012_LESSON_TIER_REQUIREMENTS.sql`:
- Add `required_tier_level` column
- Add constraint for valid values (0-3 or NULL)
- No data migration needed (NULL = use old behavior)

### Step 2: Update Types
```typescript
// database.types.ts
export interface Lesson {
  // ... existing fields
  required_tier_level: 0 | 1 | 2 | 3 | null // NEW
}
```

### Step 3: Create LessonTierSelector Component
Simple dropdown/badge selector:
- Shows current tier (or "Auto" for NULL)
- Options: Auto, Free(0), Tier 1, Tier 2, Tier 3
- Calls API to update lesson

### Step 4: Integrate into LessonsManagement
- Add tier badge to lesson card
- Click badge opens tier selector
- Show tier icons (Gift, Star, Sparkles, Crown)

### Step 5: Update Lesson CRUD
- Include required_tier_level in create/update
- Allow NULL (auto) as default

## UI Design

### Lesson Card (Teacher View)
```
┌────────────────────────────────────────────┐
│ 1. Introduction to React                   │
│    Duration: 30m | Video | PDF             │
│    [🎁 Free] ◄─ Click to change tier       │
└────────────────────────────────────────────┘

Tier Selector Dropdown:
┌─────────────────┐
│ ○ Auto (use default)
│ ● 🎁 Free
│ ○ ⭐ Tier 1
│ ○ ✨ Tier 2
│ ○ 👑 Tier 3 (Premium)
└─────────────────┘
```

## Todo List
- [ ] Create migration 012_LESSON_TIER_REQUIREMENTS.sql
- [ ] Update Lesson type in database.types.ts
- [ ] Create LessonTierSelector component
- [ ] Update LessonsManagement to show/edit tier
- [ ] Update lesson create/update handlers

## Success Criteria
- [x] Teacher can set tier for any lesson
- [x] "Auto" option preserves legacy behavior
- [x] Tier badge visible on lesson cards
- [x] Changes persist after save

## Risk Assessment
- **Medium Risk**: DB schema change
- Backward compatible (NULL = old behavior)
- No data migration required

## Security Considerations
- Only class teacher can modify lesson tier
- RLS policy on lessons already enforces ownership

## Next Steps
Phase 3: Enforce tier-based access for students
