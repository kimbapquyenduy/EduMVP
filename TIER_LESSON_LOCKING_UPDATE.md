# Tier Management: Lesson Locking Implementation (2025-12-29)

**Status**: Complete - Phase 1 & 2 Delivered

---

## What Changed

### Key Architecture Update
- **Old Model**: `lesson_unlock_count` on tiers (first N lessons unlocked)
- **New Model**: `required_tier_level` on lessons (per-lesson tier assignment)

### Why This Matters
- Teachers now have granular control over which lessons require which tier
- Can't lock lesson 5 while leaving lesson 10 free → NOW YOU CAN
- More flexible course structures supported

---

## Implementation Summary

### Files Modified (15 total)
- `src/lib/utils/lesson-access.ts` - Refactored tier hierarchy logic
- `src/app/api/tiers/[classId]/route.ts` - Tier CRUD API
- `src/components/student/StudentCourseViewer.tsx` - Tier enforcement in student view
- `src/components/teacher/TierPricingForm.tsx` - Tier pricing UI
- `src/components/teacher/LessonsManagement.tsx` - Integrated tier selector
- Plus 10 other component/database updates

### Files Created (4 total)
- `src/components/teacher/LessonTierSelector.tsx` - NEW tier picker component
- `supabase/012_LESSON_TIER_REQUIREMENTS.sql` - DB migration for lessons table
- `supabase/014_TIER_HIERARCHY_SYSTEM.sql` - Tier hierarchy migration

---

## Core Access Control Logic

### Tier Hierarchy (Tier 0-3)
```
User Tier 0 → can access content requiring tier 0
User Tier 1 → can access content requiring tier 0-1
User Tier 2 → can access content requiring tier 0-2
User Tier 3 → can access content requiring tier 0-3
```

### Key Functions (lesson-access.ts)

```typescript
// Get user's tier level (0 if no purchase)
getUserTierLevel(tierPurchase) → TierLevel

// Base: Compare user.tier >= required.tier
getContentAccessStatus(requiredTier, tierPurchase, isTeacher) → 'unlocked'|'locked'

// Lesson-specific: Use lesson tier, else course tier
getLessonAccessStatus(lessonTier, courseTier, tierPurchase, isTeacher) → 'unlocked'|'locked'

// Course-specific wrapper
getCourseAccessStatus(courseTier, tierPurchase, isTeacher) → 'unlocked'|'locked'
```

---

## Teacher Workflow

1. **Settings Tab**: Configure tier prices/names (TierPricingForm)
   - GET /api/tiers/[classId] → fetch 4 tiers
   - PUT /api/tiers/[classId] → update config

2. **Course Lessons**: Assign tier to each lesson (LessonTierSelector)
   - Per-lesson dropdown: Auto | Free | Tier 1 | Tier 2 | Tier 3
   - Stored in `lessons.required_tier_level` (0|1|2|3|null)
   - null = inherit course tier

---

## Student Workflow

1. **View Course**: StudentCourseViewer loads
   - Fetches lessons with required_tier_level
   - Fetches user's tier_purchase
   - Calls getLessonAccessStatus() for each lesson

2. **Access Calculation**
   - If lesson.required_tier_level is null → use course tier
   - If user.tier_level >= required_tier → 'unlocked' ✓
   - Else → 'locked' 🔒

3. **Locked Content**
   - Shows lock icon
   - Click → TierPurchaseModal
   - After upgrade: access recalculated

---

## Database Schema

### lessons table (updated)
```sql
ALTER TABLE lessons ADD COLUMN required_tier_level INTEGER
  CHECK (required_tier_level IS NULL OR required_tier_level IN (0, 1, 2, 3));
```

### subscription_tiers table (unchanged)
- id, class_id, tier_level (0-3), name, price, is_enabled, description

### tier_purchases table (unchanged)
- id, user_id, class_id, tier_id, payment_id, purchased_at

---

## Component APIs

### TierPricingForm
- Location: `src/components/teacher/TierPricingForm.tsx`
- Props: classId
- Manages tier pricing configuration

### LessonTierSelector (NEW)
- Location: `src/components/teacher/LessonTierSelector.tsx`
- Props: lessonId, currentTier, onTierChange, compact
- Dropdown for: Auto | Free | Tier 1 | Tier 2 | Tier 3

### StudentCourseViewer
- Location: `src/components/student/StudentCourseViewer.tsx`
- Uses: getLessonAccessStatus() for access control
- Shows locked/unlocked status per lesson

---

## API Endpoints

### GET /api/tiers/[classId]
- Public, no auth required
- Returns 4 SubscriptionTier objects
- Auto-creates defaults if none exist

### PUT /api/tiers/[classId]
- Auth required (teacher only)
- Updates tier names, prices, enabled status
- Validates teacher ownership

---

## Security

- Teachers verified as class owner (PUT /api/tiers)
- Students cannot modify tiers
- Access control enforced on StudentCourseViewer
- Tier hierarchy prevents unauthorized access

---

## Key Implementation Details

### Tier Hierarchy vs. Index-Based
- **Old**: lesson_unlock_count = "unlock first 5 lessons"
- **New**: required_tier_level = "require tier 2 for this lesson"
- Allows any lesson to require any tier

### Null Handling
- `lesson.required_tier_level = null` → inherit course tier
- Enables per-course tier requirements
- Teachers can override for specific lessons

### Teacher Access
- Teachers always have full access
- getContentAccessStatus() returns 'unlocked' if isTeacher=true

---

## Testing Checklist

- [ ] Teacher can set tiers in class settings
- [ ] Teacher can assign tiers to individual lessons
- [ ] Student with Tier 0 sees only free content
- [ ] Student with Tier 2 sees tiers 0-2 unlocked
- [ ] Locked lessons show lock icon + upgrade prompt
- [ ] Purchase upgrades access immediately
- [ ] Tier inheritance (null → course tier) works

---

## Next Steps (Phase 3)

- Student tier purchase UI (TierPurchaseModal integration)
- Payment processing integration
- Tier analytics & revenue tracking
- Email notifications for tier upgrades

---

**Documentation**: See TIER_MANAGEMENT_ARCHITECTURE.md for complete technical details
**Plan**: See plans/251228-teacher-tier-lesson-locking/plan.md for phase breakdown

