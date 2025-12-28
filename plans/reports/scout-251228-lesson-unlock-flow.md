# Lesson Unlock Functionality Analysis

## Summary
The codebase has **partially implemented** premium lesson unlock functionality. Key components exist but are **NOT integrated** into the student course viewing flow. Unlock prompts and locked lesson cards are orphaned components with no active usage.

---

## 1. Component Status

### Components Defined (But Not Used)
| Component | Path | Status | Purpose |
|-----------|------|--------|---------|
| **UnlockPrompt** | `src/components/shared/UnlockPrompt.tsx` | Defined but unused | Shows tier progress & upgrade button |
| **LockedLessonCard** | `src/components/shared/LockedLessonCard.tsx` | Defined but unused | Displays individual locked lesson |
| **LessonUnlockProgress** | `src/components/student/LessonUnlockProgress.tsx` | Defined but unused | Shows unlock progress bar |
| **TierStatusBadge** | `src/components/student/TierStatusBadge.tsx` | Defined but unused | Displays tier name & lesson count |
| **TierPurchaseModal** | `src/components/checkout/TierPurchaseModal.tsx` | Defined, available for use | Payment modal for tier upgrades |

### Support Utilities
| File | Status | Purpose |
|------|--------|---------|
| `src/lib/utils/lesson-access.ts` | Complete | 7 functions for access logic |

---

## 2. Access Control System

**Core Logic** (lesson-access.ts):
- getLessonAccessStatus() - Determines if lesson is locked/unlocked
- getAccessibleLessonCount() - Calculates accessible lessons per user
- canUpgrade() - Checks if user can upgrade
- getNextTierLevel() - Determines next upgrade tier

**Access Rules**:
1. Teachers always have full access
2. Free lessons (configurable by teacher) = always unlocked
3. Without tier purchase = only free lessons visible
4. With tier purchase = access based on lesson_unlock_count
5. Tier 3 (unlimited) = full access (lesson_unlock_count = null)

---

## 3. Current Student Course Viewing

### Student Course List (StudentCoursesView.tsx)
- **Handles**: Course-level access (FREE vs PREMIUM courses)
- **Does NOT handle**: Individual lesson-level locks
- **Limitation**: Uses membershipTier (PREMIUM/non-PREMIUM) as binary flag
- **Result**: Students blocked entirely from premium courses OR get full access

Code snippet (lines 114-116):
```
const canAccessCourse = (course: Course) => {
  return course.tier === 'FREE' || membershipTier === 'PREMIUM'
}
```

### Student Lesson Viewer (StudentCourseViewer.tsx)
- **Handles**: Shows all lessons in course without access checks
- **Missing**: 
  - No tier purchase lookup
  - No lesson-by-lesson access evaluation
  - No locked lesson cards
  - No unlock prompt
  - No upgrade buttons
- **Result**: Students with PREMIUM membership see all lessons; others see none

---

## 4. The Gap: What's Missing

### Problem: Binary Access Model
Current implementation uses **course-level access**:
- Student either has access to entire course OR no access at all

### Required: Lesson-Level Access
Needed for premium tier system:
- Student has free tier = sees 5 lessons (example)
- Student has tier 2 = sees 10 lessons
- Student has tier 3 = sees all lessons
- Locked lessons should show unlock prompt

### Integration Points Needed
1. StudentCourseViewer: Fetch current tier purchase
2. Lesson Loop: Evaluate each lesson's access status
3. Render Logic: Show LockedLessonCard for locked, regular for unlocked
4. UnlockPrompt: Display at top with progress bar
5. Modal Trigger: Open TierPurchaseModal when Upgrade clicked

---

## 5. TierPurchaseModal

**Status**: Fully implemented, ready to use

**Features**:
- Step flow: select → payment → success/error
- Fetches available tiers from /api/tiers/{classId}
- Filters enabled tiers (tier_level > 0)
- Payment processing
- Success/error handling
- Accepts current tier to show owned status

**Props**:
```
interface TierPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  currentTierPurchase?: TierPurchase & { tier: SubscriptionTier } | null
  onSuccess?: (purchase: TierPurchase) => void
}
```

---

## 6. Access Determination Logic

### getLessonAccessStatus() Function
Input: lessonIndex, tierPurchase, isTeacher, freeTierLessonCount
Output: 'unlocked' | 'locked'

Priority:
1. Teacher → unlocked
2. Before freeTierLessonCount → unlocked
3. No tier → locked
4. Tier 3 (lesson_unlock_count = null) → unlocked
5. Within tier's unlock count → unlocked
6. Else → locked

### Tier Access Matrix (Database Configured)
| Tier | Level | Default Lessons | Type |
|------|-------|-----------------|------|
| Free | 0 | Teacher sets | Free tier |
| Tier 1 | 1 | 5 (configurable) | Cơ bản |
| Tier 2 | 2 | 10 (configurable) | Tiêu chuẩn |
| Tier 3 | 3 | infinity (null) | Trọn bộ |

---

## 7. API Integration Points

### GET /api/tiers/{classId}
Used by TierPurchaseModal to fetch available tiers

### GET Student Tier Purchase
Needed but not found: Should query tier_purchases table for current user

---

## 8. Database Tables (Referenced)

| Table | Purpose |
|-------|---------|
| subscription_tiers | Tier definitions per class |
| tier_purchases | User's tier subscriptions |
| lessons | Lesson content |
| lesson_progress | User completion tracking |
| classes | Class metadata |
| memberships | Student enrollment |

---

## 9. Unresolved Questions

1. **How does student fetch their tier purchase?** 
   - No API endpoint visible for GET user's current tier
   - StudentCourseViewer doesn't query this data

2. **Where is the subscription check in course page?**
   - /student/classes/[classId]/courses/[courseId] only checks course-level tier
   - Doesn't fetch or evaluate lesson-level access

3. **Should UnlockPrompt be top-of-page or per-lesson?**
   - Current design shows top-level progress
   - Need to clarify placement

4. **Is the tier_purchases fetch real-time or from membership.status?**
   - Using membership.status (binary) vs actual tier_purchases record
   - Mismatch between course-level and lesson-level models

5. **How to handle lesson preview?**
   - Should locked lessons show title/description but not content?
   - Current LockedLessonCard design supports this

---

## 10. File Locations

Unlock Components:
- d:/Project/Personal Project/EduMVP/src/components/shared/UnlockPrompt.tsx
- d:/Project/Personal Project/EduMVP/src/components/shared/LockedLessonCard.tsx
- d:/Project/Personal Project/EduMVP/src/components/student/LessonUnlockProgress.tsx

Access Logic:
- d:/Project/Personal Project/EduMVP/src/lib/utils/lesson-access.ts

Course Viewers (Need updates):
- d:/Project/Personal Project/EduMVP/src/components/student/StudentCourseViewer.tsx
- d:/Project/Personal Project/EduMVP/src/components/student/StudentCoursesView.tsx

Modal (Ready to use):
- d:/Project/Personal Project/EduMVP/src/components/checkout/TierPurchaseModal.tsx

Pages (Need updates):
- d:/Project/Personal Project/EduMVP/src/app/student/classes/[classId]/page.tsx
- d:/Project/Personal Project/EduMVP/src/app/student/classes/[classId]/courses/[courseId]/page.tsx

