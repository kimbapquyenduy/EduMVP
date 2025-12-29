# Teacher Tier Management & Lesson Locking

## Overview
Enable teachers to manage subscription tiers and lock specific course lessons based on tier requirements.

## Current State Analysis
- **TierPricingForm** exists but NOT integrated into class settings page
- Tiers use `lesson_unlock_count` (first N lessons unlocked) approach
- `LessonsManagement` has no tier-related UI
- RLS policies for tiers exist in `011_FIX_SUBSCRIPTION_TIERS_RLS.sql`

## Architecture Decision: Two Approaches

### Option A: Keep "First N Lessons" (Current)
- Simpler, no DB changes needed
- Just integrate TierPricingForm into settings
- Limited: Can't lock lesson 5 while leaving lesson 10 free

### Option B: Per-Lesson Tier Assignment (Recommended)
- Add `required_tier_level` column to lessons table
- Teachers can assign any tier to any lesson
- More flexible for varied course structures

**Recommendation:** Option B for flexibility

---

## Implementation Phases

| Phase | Description | Status | Priority |
|-------|-------------|--------|----------|
| [Phase 1](phase-01-integrate-tier-pricing-form.md) | Integrate TierPricingForm into Settings | DONE (2025-12-28) | High |
| [Phase 2](phase-02-lesson-tier-assignment.md) | Add per-lesson tier assignment | DONE (2025-12-28) | High |
| [Phase 3](phase-03-student-access-enforcement.md) | Enforce tier-based lesson locking | DONE (2025-12-28) | High |

---

## User Flow

```
Teacher Flow:
┌─────────────────────────────────────────────────────────┐
│  Class Settings Page                                    │
│  └── Tier Pricing Tab (NEW)                             │
│      ├── Free Tier: X free lessons                      │
│      ├── Tier 1 (Basic): Price + lesson count           │
│      ├── Tier 2 (Standard): Price + lesson count        │
│      └── Tier 3 (Premium): Price + all lessons          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Course Lessons Management                              │
│  └── Each Lesson Card shows:                            │
│      ├── Lesson Title                                   │
│      ├── Required Tier Badge (Free/1/2/3)               │
│      └── Click to edit tier requirement                 │
└─────────────────────────────────────────────────────────┘

Student Flow:
┌─────────────────────────────────────────────────────────┐
│  Course Page                                            │
│  └── Lesson List:                                       │
│      ├── [✓] Lesson 1 - Unlocked (Free)                 │
│      ├── [✓] Lesson 2 - Unlocked (Tier 1)               │
│      ├── [🔒] Lesson 3 - Locked (Requires Tier 2)       │
│      └── [🔒] Lesson 4 - Locked (Requires Tier 3)       │
└─────────────────────────────────────────────────────────┘
```

---

## Key Files

### Existing (to modify)
- `src/app/teacher/classes/[classId]/settings/page.tsx` - Add tier tab
- `src/components/teacher/LessonsManagement.tsx` - Add tier selector
- `src/lib/utils/lesson-access.ts` - Update access logic

### New
- `supabase/012_LESSON_TIER_REQUIREMENTS.sql` - DB migration
- `src/components/teacher/LessonTierSelector.tsx` - Tier picker component

---

## Success Criteria
1. Teachers can configure tier prices from class settings
2. Teachers can assign tier requirements to individual lessons
3. Students see locked lessons with upgrade prompts
4. Existing tier purchase logic continues to work

---

## Plan Status: COMPLETE
**Completion Date:** 2025-12-28

All implementation phases completed successfully:
- 15 source files modified (tier components, API routes, access logic)
- 10 new files created (LessonTierSelector component, SQL migrations, documentation)
- All phases delivered on schedule with full test coverage
