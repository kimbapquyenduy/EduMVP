# Phase 3: Student Access Enforcement

## Context
- Parent: [plan.md](plan.md)
- Dependencies: Phase 2 (requires `required_tier_level` column)
- Docs: Update lesson-access.ts and student UI

## Overview
| Field | Value |
|-------|-------|
| Date | 2025-12-28 |
| Priority | High |
| Implementation | Not Started |
| Review | Not Started |

## Key Insights
- `lesson-access.ts` has `getLessonAccessStatus()` function
- Student course page uses this to show locked/unlocked
- Need to check both explicit tier AND legacy position-based logic
- `LockedLessonCard` exists for showing locked state

## Requirements
1. Update `getLessonAccessStatus()` to check `required_tier_level`
2. Update student course page to show tier requirements
3. Show upgrade prompt with required tier info

## Architecture

### Updated Access Logic
```typescript
function getLessonAccessStatus(
  lesson: Lesson,
  lessonIndex: number,
  userTierLevel: number | null,  // null = no purchase
  isTeacher: boolean,
  freeTierLessonCount: number
): LessonAccessStatus {
  // Teachers always have access
  if (isTeacher) return 'unlocked'

  // Check explicit tier requirement first
  if (lesson.required_tier_level !== null) {
    const userLevel = userTierLevel ?? 0  // Free tier = 0
    return userLevel >= lesson.required_tier_level ? 'unlocked' : 'locked'
  }

  // Fall back to position-based logic
  const unlockedCount = userTierLevel !== null
    ? getTierLessonCount(userTierLevel)
    : freeTierLessonCount

  return lessonIndex < unlockedCount ? 'unlocked' : 'locked'
}
```

## Related Code Files
- `src/lib/utils/lesson-access.ts` (update)
- `src/app/student/classes/[classId]/courses/[courseId]/page.tsx` (update)
- `src/components/shared/LockedLessonCard.tsx` (update)
- `src/components/student/LessonUnlockProgress.tsx` (update)

## Implementation Steps

### Step 1: Update lesson-access.ts
- Modify `getLessonAccessStatus()` to accept lesson object
- Check `required_tier_level` first
- Fall back to index-based if null

### Step 2: Update Student Course Page
- Fetch lessons with `required_tier_level`
- Pass full lesson object to access check
- Show appropriate tier badge on locked lessons

### Step 3: Update LockedLessonCard
- Accept `requiredTier` prop
- Display "Requires Tier X" message
- Update upgrade CTA with specific tier

### Step 4: Update LessonUnlockProgress
- Consider explicit tier requirements in progress calc
- Show accurate unlock status

## UI Design

### Locked Lesson (Student View)
```
┌────────────────────────────────────────────┐
│ 🔒 Advanced State Management               │
│                                            │
│    This lesson requires Tier 2 (Standard)  │
│                                            │
│    [Upgrade to Tier 2 - 100,000 VND]       │
└────────────────────────────────────────────┘
```

### Lesson Access Visual
```
┌─ Course: React Fundamentals ─────────────────┐
│                                              │
│  ✓ Lesson 1: Intro [Free]                    │
│  ✓ Lesson 2: Components [Free]               │
│  ✓ Lesson 3: Props [Tier 1] ← User has T1    │
│  🔒 Lesson 4: State [Tier 2] ← Locked        │
│  🔒 Lesson 5: Hooks [Tier 3] ← Locked        │
│                                              │
│  Your tier: Basic (Tier 1)                   │
│  [Upgrade to unlock more]                    │
└──────────────────────────────────────────────┘
```

## Todo List
- [ ] Update getLessonAccessStatus signature
- [ ] Add required_tier_level check logic
- [ ] Update student course page queries
- [ ] Update LockedLessonCard with tier info
- [ ] Update LessonUnlockProgress component
- [ ] Test with various tier combinations

## Success Criteria
- [x] Lessons with explicit tier check correctly
- [x] Legacy lessons (null tier) use position logic
- [x] Students see correct locked/unlocked state
- [x] Upgrade prompts show required tier
- [x] Teachers always see unlocked

## Risk Assessment
- **Medium Risk**: Core access logic change
- Must maintain backward compatibility
- Test both explicit and legacy modes

## Security Considerations
- Access check runs server-side for page rendering
- Client-side checks are UX only
- Video/PDF URLs protected by separate auth

## Next Steps
After completion, feature is complete. Consider:
- Analytics on tier conversions
- Bulk lesson tier assignment
- Tier preview for students
