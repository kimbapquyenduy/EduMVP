# Tier Management System Architecture

**Component**: Subscription Tier Configuration & Per-Lesson Access Control
**Phase**: Phase 1 & 2 Complete
**Last Updated**: 2025-12-29
**Status**: Active Implementation

---

## Overview

EduMVP uses a hierarchical tier system where:
- Each class has 4 tiers (Free/Tier 1/Tier 2/Tier 3)
- Each lesson can require a specific tier (null = inherit course tier)
- Students can only access content at their tier level or below
- Teachers can customize tier names and prices

**Key Change (Phase 2)**: Moved from `lesson_unlock_count` (first N lessons) to per-lesson `required_tier_level` for granular control.

---

## System Architecture

```
TEACHER SIDE
├── Class Settings (TierPricingForm)
│   ├── GET /api/tiers/[classId]
│   │   └── Fetch/create 4 tier configs
│   └── PUT /api/tiers/[classId]
│       └── Update tier names, prices, enabled status
│
└── Course Lessons (LessonsManagement)
    └── Each Lesson Card
        ├── LessonTierSelector Component (NEW)
        │   └── Dropdown: Auto | Free | Tier 1 | Tier 2 | Tier 3
        └── PATCH /lessons/[lessonId]
            └── Update required_tier_level (0|1|2|3|null)

STUDENT SIDE
└── Course Viewer (StudentCourseViewer)
    ├── Load lessons with required_tier_level
    ├── Load user's tier_purchase (or null if free)
    ├── For each lesson: Calculate access via lesson-access.ts
    │   ├── getLessonAccessStatus()
    │   ├── getCourseAccessStatus()
    │   └── getContentAccessStatus()
    └── Display with access status (locked/unlocked)
        └── Show upgrade modal if tier insufficient
```

---

## Access Control Logic: Tier Hierarchy

### Core Principle
User with tier N can access all content requiring tier 0 to N.

```
Free User (Tier 0) → Can access: [0]
Tier 1 User        → Can access: [0, 1]
Tier 2 User        → Can access: [0, 1, 2]
Tier 3 User        → Can access: [0, 1, 2, 3]
Teachers           → Always full access
```

### Access Functions (lesson-access.ts)

**getUserTierLevel(tierPurchase)**
- Returns user's current tier level (0 if no purchase)
- Type: TierPurchaseWithTier | null → TierLevel

**getContentAccessStatus(requiredTierLevel, tierPurchase, isTeacher)**
- Base comparison function
- Teachers always return 'unlocked'
- Others: 'unlocked' if userTierLevel >= requiredTierLevel

**getLessonAccessStatus(lessonTierLevel, courseTierLevel, tierPurchase, isTeacher)**
- Determines lesson-specific access
- Steps:
  1. If lesson.required_tier_level is set → use it
  2. Else → inherit course.required_tier_level
  3. Call getContentAccessStatus() with final tier

**getCourseAccessStatus(courseTierLevel, tierPurchase, isTeacher)**
- Course-level wrapper around getContentAccessStatus()

**canUpgrade(tierPurchase)**
- Returns true if user.tier < 3

**getAccessibleTierLevels(tierPurchase)**
- Returns array [0, 1, ..., userTierLevel]
- Used for displaying accessible tier options

---

## Data Models

### SubscriptionTier (subscription_tiers table)
```typescript
{
  id: string                // UUID, primary key
  class_id: string          // FK to classes
  tier_level: 0|1|2|3       // Fixed tier identifier
  name: string              // Customizable (e.g., "Cơ bản")
  description: string|null  // Teacher-customizable description
  price: number             // VND integer, >= 0
  is_enabled: boolean       // Tier 0 always true, others toggleable
  created_at: string        // Timestamp
  updated_at: string        // Timestamp
}
```

**Constraints**:
- Unique (class_id, tier_level)
- Price >= 0
- Tier 0 always enabled

**Indexes**:
- idx_subscription_tiers_class_id
- idx_subscription_tiers_tier_level

### Lesson (lessons table) - UPDATED
```typescript
{
  id: string
  course_id: string
  title: string
  description: string|null
  video_url: string|null
  pdf_url: string|null
  order_index: number
  duration_minutes: number|null
  required_tier_level: 0|1|2|3|null  // NEW: Per-lesson tier requirement
  created_at: string
  updated_at: string
}
```

**Note**: `required_tier_level = null` means inherit course tier level.

### TierPurchase (tier_purchases table)
```typescript
{
  id: string              // UUID, primary key
  user_id: string         // FK to auth.users
  class_id: string        // FK to classes
  tier_id: string         // FK to subscription_tiers
  payment_id: string|null // Payment gateway reference
  purchased_at: string    // Timestamp
}
```

**Unique Constraint**: (user_id, class_id) - one tier per user per class

### TypeScript Types
```typescript
type TierLevel = 0 | 1 | 2 | 3
type LessonAccessStatus = 'unlocked' | 'locked'

interface TierPurchaseWithTier extends TierPurchase {
  tier: SubscriptionTier
}
```

---

## Component APIs

### TierPricingForm.tsx (Teacher)
**Location**: `src/components/teacher/TierPricingForm.tsx`

Manages tier pricing configuration in class settings.

**Props**:
- classId: string

**Features**:
- Fetches 4 tiers on mount (GET /api/tiers/[classId])
- Tier 0 (Free): Read-only name/price, always enabled
- Tiers 1-3: Editable name, price, description, enabled toggle
- Skeleton loaders during load
- Toast notifications for success/error
- Vietnamese number formatting

**State**:
- tiers: TierFormData[]
- isLoading: boolean
- isSaving: boolean

**Submit**: PUT /api/tiers/[classId] with tier updates

---

### LessonTierSelector.tsx (Teacher) - NEW
**Location**: `src/components/teacher/LessonTierSelector.tsx`

Per-lesson tier assignment dropdown.

**Props**:
```typescript
{
  lessonId: string
  currentTier: TierLevel | null
  onTierChange?: (newTier: TierLevel | null) => void
  compact?: boolean
}
```

**Options**:
- null → "Auto" (inherit course tier)
- 0 → "Free" (available to all students)
- 1 → "Tier 1" (basic tier required)
- 2 → "Tier 2" (standard tier required)
- 3 → "Tier 3" (premium tier required)

**Icons/Colors**:
- Auto: Settings icon, muted
- Free: Gift icon, green
- Tier 1: Star icon, blue
- Tier 2: Sparkles icon, purple
- Tier 3: Crown icon, amber

**Integration**: Used in LessonsManagement for each lesson card.

---

### StudentCourseViewer.tsx (Student)
**Location**: `src/components/student/StudentCourseViewer.tsx`

Course viewer with tier-based lesson access enforcement.

**Access Logic**:
```typescript
const status = getLessonAccessStatus(
  lesson.required_tier_level,      // Lesson's tier (null = use course)
  courseTierLevel,                 // Course default tier
  currentTierPurchase,             // User's tier_purchase (may be null)
  false                            // Not teacher
)

if (status === 'locked') {
  // Show lock icon, disable playback
  // Click → TierPurchaseModal
}
```

**Features**:
- First accessible lesson auto-selected
- Locked lessons show lock icon
- Click locked lesson → upgrade modal
- Progress tracking works alongside tier
- Real-time access updates after purchase

---

## API Endpoints

### GET /api/tiers/[classId]
**Purpose**: Fetch tier configuration for a class
**Auth**: None required (public read)

**Response**:
```typescript
{
  tiers: SubscriptionTier[]
}
```

**Returns**: Array of 4 tier objects ordered by tier_level

**Auto-Creation Logic**:
- If no tiers exist for class, creates 4 defaults:
  - Tier 0: Free, 0 VND
  - Tier 1: Basic, 50,000 VND
  - Tier 2: Standard, 100,000 VND
  - Tier 3: Premium, 200,000 VND

**Error Responses**:
- 500: Database error (includes error code)

---

### PUT /api/tiers/[classId]
**Purpose**: Update tier configuration
**Auth**: Required (teacher only)

**Request**:
```typescript
{
  tiers: Array<{
    id: string
    name: string
    description: string | null
    price: number
    is_enabled: boolean
  }>
}
```

**Validation Stack**:
1. User authentication (401 if missing)
2. Class existence (404 if missing)
3. Teacher ownership (403 if not teacher)
4. Tier array format (400 if invalid)
5. Per-tier validation:
   - name: non-empty string (required)
   - price: number >= 0 (required)
   - is_enabled: boolean (required)
   - description: optional string

**Response**: Updated tiers array

**Error Responses**:
```
401: 'Vui lòng đăng nhập để tiếp tục'
403: 'Bạn không có quyền chỉnh sửa cài đặt gói'
404: 'Lớp học không tồn tại'
400: 'Dữ liệu không hợp lệ' | 'Tên gói không được để trống' | 'Giá phải là số không âm'
500: 'Không thể cập nhật cài đặt gói'
```

---

## Database Schema

### Migration: Add required_tier_level to lessons
```sql
ALTER TABLE lessons ADD COLUMN required_tier_level INTEGER
  CHECK (required_tier_level IS NULL OR required_tier_level IN (0, 1, 2, 3));

-- NULL: inherit course tier
-- 0: free
-- 1|2|3: specific tier required
```

### subscription_tiers Table
```sql
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (0, 1, 2, 3)),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_tier_per_class UNIQUE(class_id, tier_level)
);

CREATE INDEX idx_subscription_tiers_class_id ON subscription_tiers(class_id);
CREATE INDEX idx_subscription_tiers_tier_level ON subscription_tiers(tier_level);
```

### tier_purchases Table
```sql
CREATE TABLE tier_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  payment_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

CREATE INDEX idx_tier_purchases_user_id ON tier_purchases(user_id);
CREATE INDEX idx_tier_purchases_class_id ON tier_purchases(class_id);
```

---

## Data Flow Examples

### Teacher Assigning Per-Lesson Tiers

```
1. Teacher opens course → LessonsManagement component
2. Sees list of lessons with current tier badges
3. Clicks lesson tier badge → LessonTierSelector dropdown opens
4. Selects "Tier 2" from options
5. Component calls PATCH /lessons/[lessonId] with required_tier_level: 2
6. Backend updates lessons table
7. Component updates UI
8. Next time students view course:
   - Lesson now requires Tier 2
   - Students with Tier 0-1 see lock icon
   - Students with Tier 2-3 can access
```

### Student Accessing Locked Content

```
1. Student navigates to course → StudentCourseViewer loads
2. Query:
   - Fetch lessons (each with required_tier_level)
   - Fetch user's tier_purchase (or null if free)
3. For each lesson, calculate access:
   const status = getLessonAccessStatus(
     lesson.required_tier_level,      // 2 (requires Tier 2)
     courseTierLevel,                 // 0 (course is free)
     tierPurchase,                    // null (student has no purchase)
     false                            // Not teacher
   )
   // Returns 'locked' because null >= 2 is false

4. UI renders:
   - ✓ Lesson 1 (Free) - unlocked, can watch
   - 🔒 Lesson 2 (Requires Tier 2) - locked, lock icon shown

5. Student clicks locked lesson
6. TierPurchaseModal opens
7. Student purchases Tier 2
8. tier_purchases row created: { user_id, class_id, tier_id }
9. StudentCourseViewer refetches tier_purchase
10. getLessonAccessStatus() now returns 'unlocked' (2 >= 2)
11. Lesson now shows as accessible
```

### Tier Inheritance (Null Handling)

```
Scenario: Course requires Tier 1 (courseTierLevel = 1)

Lesson A: required_tier_level = null
  → Uses course tier (1)
  → Student needs Tier 1+ to access

Lesson B: required_tier_level = 0
  → Override to free
  → All students can access (even Tier 0)

Lesson C: required_tier_level = 3
  → Override to premium
  → Only Tier 3 students can access

This gives teachers fine-grained control:
- Set course base tier
- Override specific lessons
```

---

## Security Considerations

### Authentication & Authorization
- **GET /api/tiers**: Public (no auth required)
- **PUT /api/tiers**: Requires Supabase auth + teacher verification
  - Checks: user_id === class.teacher_id
  - Extra safety: WHERE clause includes class_id

### Input Validation
- All tier fields type-checked before update
- Price >= 0 enforced
- Foreign key constraints in database
- No string interpolation in SQL

### Access Control Enforcement
- StudentCourseViewer uses lesson-access.ts
- Teachers always get 'unlocked' status
- Students check: userTierLevel >= requiredTierLevel
- No client-side-only enforcement

---

## Configuration

### Default Tier Names
```typescript
{
  0: 'Miễn phí',     // Free
  1: 'Cơ bản',       // Basic
  2: 'Tiêu chuẩn',   // Standard
  3: 'Trọn bộ'       // Complete/Premium
}
```

### Tier Icons
- Tier 0: Gift icon (free)
- Tier 1: Star icon (basic)
- Tier 2: Sparkles icon (standard)
- Tier 3: Crown icon (premium)

---

## Testing Strategy

### Unit Tests
- `getUserTierLevel()`: Null and various tier levels
- `getContentAccessStatus()`: All tier combinations (0-3 user vs 0-3 required)
- `getLessonAccessStatus()`: Null vs explicit lesson tier
- `canUpgrade()`: All tier levels (0-3)
- `getAccessibleTierLevels()`: Correct arrays per tier

### Integration Tests
- GET /api/tiers auto-creates defaults
- PUT /api/tiers validates teacher ownership
- Updated tiers appear in TierPricingForm
- Lesson tier changes reflected in StudentCourseViewer

### E2E Tests
1. Teacher configures tiers (prices, names)
2. Teacher assigns lesson tiers
3. Student views course (sees locked content)
4. Student purchases tier
5. Content unlocks immediately
6. Teacher-owned course shows all content (always unlocked)

---

## Performance Notes

### Database Queries
- GET /api/tiers: Single indexed query (class_id)
- PUT /api/tiers: 4 update queries (one per tier)
- StudentCourseViewer: Single query per lesson for tier_purchase

### Caching Strategy
- TierPricingForm: Cached on mount, refetch if needed
- StudentCourseViewer: Refetch after purchase
- Tier hierarchy calculations: In-memory (fast)

### Network
- GET response: ~1KB (4 tier objects)
- PUT request: ~1KB (4 tier updates)
- No N+1 query problems

---

## File Locations

**Core Implementation**:
- `src/lib/utils/lesson-access.ts` - Tier hierarchy access logic
- `src/app/api/tiers/[classId]/route.ts` - Tier CRUD endpoints
- `src/components/teacher/TierPricingForm.tsx` - Tier configuration UI
- `src/components/teacher/LessonTierSelector.tsx` - Per-lesson tier picker (NEW)
- `src/components/student/StudentCourseViewer.tsx` - Student tier enforcement
- `src/lib/types/database.types.ts` - TypeScript types

**Database Migrations**:
- `supabase/012_LESSON_TIER_REQUIREMENTS.sql` - Add required_tier_level to lessons
- `supabase/014_TIER_HIERARCHY_SYSTEM.sql` - Tier hierarchy system

**Documentation**:
- `TIER_MANAGEMENT_ARCHITECTURE.md` - This file
- `DOCUMENTATION_INDEX.md` - Navigation guide
- `FEATURES_PHASE_1.md` - Feature overview
- `TIER_LESSON_LOCKING_UPDATE.md` - Phase 2 summary

---

## Phases Completed

**Phase 1**: Tier pricing configuration (TierPricingForm)
- Teachers can set tier prices, names, descriptions
- Enabled/disabled toggles
- Auto-creation of defaults

**Phase 2**: Per-lesson tier assignment (LessonTierSelector)
- Teachers assign tier to each lesson
- Tier inheritance via null handling
- Per-lesson overrides of course tier

**Phase 3** (Next): Student tier purchase flow
- TierPurchaseModal integration
- Payment processing
- Tier purchase analytics

---

**Last Updated**: 2025-12-29
**Status**: Phase 1 & 2 Complete
**Architecture Review**: Complete
