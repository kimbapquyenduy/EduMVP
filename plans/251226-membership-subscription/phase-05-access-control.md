# Phase 05: Access Control - Lesson Gating

**Parent**: [plan.md](./plan.md) | **Status**: ✅ COMPLETE | **Priority**: HIGH

## Dependencies
- Phase 04: Subscription Management (tier purchases working)

## Overview

Gate lesson access based on tier purchases. Free members get 3 lessons. Tiers unlock additional lessons by order_index.

## Key Insights

1. **Lesson gating by order_index**: Lessons sorted by order_index
2. **Free access**: First 3 lessons (order_index 0, 1, 2)
3. **Tier unlock counts**: T1=5, T2=10, T3=ALL
4. **Teachers always full access**
5. **Members without tier**: 3 free lessons only

## Requirements

### Functional
- F1: All class members access first 3 lessons
- F2: Tier 1 unlocks lessons 1-5
- F3: Tier 2 unlocks lessons 1-10
- F4: Tier 3 unlocks ALL lessons
- F5: Teachers access all lessons in their classes

### Non-Functional
- NF1: RLS enforces at DB level
- NF2: UI shows locked lessons with upgrade prompt
- NF3: Clear visual distinction (locked vs unlocked)

## Architecture

### Access Decision Tree

```
User requests lesson at order_index N
        ↓
Is user the class teacher?
  YES → FULL ACCESS
  NO  ↓
Is user a class member?
  NO  → BLOCKED (join required)
  YES ↓
Is N <= 2 (0-indexed, first 3 lessons)?
  YES → FULL ACCESS (free lessons)
  NO  ↓
Does user have tier_purchase for this class?
  NO  → BLOCKED (upgrade required)
  YES ↓
Is tier.lesson_unlock_count NULL (unlimited)?
  YES → FULL ACCESS (Tier 3)
  NO  ↓
Is N < tier.lesson_unlock_count?
  YES → FULL ACCESS
  NO  → BLOCKED (upgrade required)
```

### Unlock Logic

| Tier | lesson_unlock_count | Accessible Lessons (0-indexed) |
|------|--------------------|---------------------------------|
| None (free) | 3 | 0, 1, 2 |
| Tier 1 | 5 | 0, 1, 2, 3, 4 |
| Tier 2 | 10 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Tier 3 | NULL | ALL |

### RLS Policy

```sql
CREATE POLICY "lesson_access_by_tier"
ON lessons FOR SELECT
TO authenticated
USING (
  -- Teacher access
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    WHERE c.id = lessons.course_id
    AND cl.teacher_id = auth.uid()
  )
  OR
  -- Member access with tier check
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    JOIN memberships m ON m.class_id = cl.id AND m.user_id = auth.uid()
    LEFT JOIN tier_purchases tp ON tp.class_id = cl.id AND tp.user_id = auth.uid()
    LEFT JOIN subscription_tiers st ON st.id = tp.tier_id
    WHERE c.id = lessons.course_id
    AND (
      -- Free lessons (first 3)
      lessons.order_index < 3
      OR
      -- Tier unlocked
      (tp.id IS NOT NULL AND (
        st.lesson_unlock_count IS NULL  -- Tier 3 unlimited
        OR lessons.order_index < st.lesson_unlock_count
      ))
    )
  )
)
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `supabase/005_SUBSCRIPTION_TIERS_SCHEMA.sql` | Include RLS policies |
| `src/lib/utils/lesson-access.ts` | Frontend access utilities |
| `src/components/shared/LockedLessonCard.tsx` | Locked lesson display |
| `src/components/shared/UnlockPrompt.tsx` | Upgrade CTA |

### Modify
| File | Change |
|------|--------|
| `src/components/student/StudentCourseViewer.tsx` | Add lesson locking |
| `src/components/teacher/LessonsManagement.tsx` | Show unlock info |

## Implementation Steps

1. Create lesson-access.ts utilities:
   ```typescript
   const FREE_LESSON_COUNT = 3

   export function getLessonAccessStatus(
     lessonIndex: number,
     tierPurchase: TierPurchase | null,
     isTeacher: boolean
   ): 'unlocked' | 'locked' {
     if (isTeacher) return 'unlocked'
     if (lessonIndex < FREE_LESSON_COUNT) return 'unlocked'
     if (!tierPurchase) return 'locked'
     if (tierPurchase.tier.lesson_unlock_count === null) return 'unlocked'
     if (lessonIndex < tierPurchase.tier.lesson_unlock_count) return 'unlocked'
     return 'locked'
   }

   export function getUnlockableCount(tier: SubscriptionTier | null): number {
     if (!tier) return FREE_LESSON_COUNT
     return tier.lesson_unlock_count ?? Infinity
   }
   ```

2. Create LockedLessonCard component:
   - Props: lesson, onUpgrade
   - Show lesson title (blurred/truncated)
   - Lock icon overlay
   - "Nâng cấp để mở khóa" text

3. Create UnlockPrompt component:
   - Props: classId, currentTier, totalLessons
   - Show comparison: "Bạn đã mở X/Y bài học"
   - CTA: "Nâng cấp ngay" → opens TierPurchaseModal

4. Update RLS in migration:
   - Drop existing permissive lessons policy
   - Add tier-aware SELECT policy
   - Test with different tier states

5. Modify StudentCourseViewer:
   - Fetch user's tier_purchase for class
   - Pass to lesson list
   - Map lessons with access status
   - Render LockedLessonCard for locked

6. Add unlock UI elements:
   - Lock icon on lesson cards
   - Upgrade button in course header
   - Count display: "3/20 bài học"

## Todo

- [ ] Create src/lib/utils/lesson-access.ts
- [ ] getLessonAccessStatus()
- [ ] getUnlockableCount()
- [ ] Constants: FREE_LESSON_COUNT = 3
- [ ] Create src/components/shared/LockedLessonCard.tsx
- [ ] Locked lesson UI
- [ ] Lock icon overlay
- [ ] Upgrade CTA
- [ ] Create src/components/shared/UnlockPrompt.tsx
- [ ] Comparison text
- [ ] Upgrade button
- [ ] Add RLS policy to migration
- [ ] Drop old lessons policy
- [ ] Create tier-aware policy
- [ ] Handle teacher bypass
- [ ] Handle free lessons
- [ ] Handle tier unlock counts
- [ ] Modify StudentCourseViewer.tsx
- [ ] Fetch tier_purchase
- [ ] Apply access check per lesson
- [ ] Render locked/unlocked states

## Success Criteria

- [ ] All members access first 3 lessons
- [ ] Non-tier members blocked from lesson 4+
- [ ] Tier 1 members access lessons 1-5
- [ ] Tier 2 members access lessons 1-10
- [ ] Tier 3 members access all lessons
- [ ] Teachers access all lessons
- [ ] Locked lessons show upgrade prompt
- [ ] RLS enforces at database level

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| RLS breaks existing | HIGH | HIGH | Test all scenarios |
| Order index gaps | MED | MED | Use row_number() |
| Cache stale after purchase | MED | LOW | Refresh on modal close |

## Security Considerations

- RLS is primary enforcement
- Frontend checks are UX only
- Test RLS with SQL before deploy
- Handle edge case: class with <3 lessons

## UI/UX Notes

- Lock icon: 🔒 on lesson card
- Blurred preview for locked lessons
- Count format: "5/20 bài học đã mở khóa"
- Upgrade button prominent but not intrusive
- Toast on access denial

## Access Matrix

| User | Tier | Lessons 0-2 | Lessons 3-4 | Lessons 5-9 | Lessons 10+ |
|------|------|-------------|-------------|-------------|-------------|
| Teacher | N/A | ✅ | ✅ | ✅ | ✅ |
| Member | None | ✅ | ❌ | ❌ | ❌ |
| Member | Tier 1 | ✅ | ✅ | ❌ | ❌ |
| Member | Tier 2 | ✅ | ✅ | ✅ | ❌ |
| Member | Tier 3 | ✅ | ✅ | ✅ | ✅ |
| Non-member | N/A | ❌ | ❌ | ❌ | ❌ |

## Next Steps

After completion: Full testing, then production deployment
