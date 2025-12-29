# Tier Management System Architecture

**Component**: Subscription Tier Configuration
**Phase**: Phase 1
**Status**: Complete

---

## System Diagram

```
Teacher Settings Page
│
└── TierPricingForm Component
    ├── useEffect: Fetch tiers on mount
    │   └── GET /api/tiers/[classId]
    │       ├── Query subscription_tiers
    │       ├── If empty: Create defaults
    │       └── Return 4 tier objects
    │
    ├── Form State Management
    │   ├── tiers: TierFormData[]
    │   ├── isLoading: boolean
    │   └── isSaving: boolean
    │
    ├── UI Rendering (4 tier cards)
    │   ├── Tier 0: Free (static)
    │   ├── Tier 1: Basic (editable)
    │   ├── Tier 2: Standard (editable)
    │   └── Tier 3: Premium (editable + unlimited toggle)
    │
    └── Form Submission
        └── PUT /api/tiers/[classId]
            ├── Validate auth
            ├── Check teacher ownership
            ├── Validate tier data
            ├── Update subscription_tiers
            └── Return updated tiers
```

---

## Data Flow

### Initial Load
```
1. Teacher navigates to /teacher/classes/[classId]/settings
   ↓
2. Settings page renders AppHeader + TierPricingForm
   ↓
3. TierPricingForm mounts, useEffect triggers
   ↓
4. Fetch GET /api/tiers/[classId]
   ↓
5. API queries subscription_tiers for class
   ↓
6. If no rows: Insert 4 default tiers
   ↓
7. Return tiers array to component
   ↓
8. Component sets state, renders form
```

### Form Edit & Submit
```
1. Teacher edits tier price/lessons/toggle
   ↓
2. updateTier() updates local state
   ↓
3. Teacher clicks "Lưu thay đổi" (Save)
   ↓
4. handleSubmit() triggered
   ↓
5. Construct tiers array with updated values
   ↓
6. PUT /api/tiers/[classId] with tiers[]
   ↓
7. API validates:
   - Auth check
   - Teacher ownership check
   - Data validation (price, count, enabled)
   ↓
8. Update subscription_tiers rows
   ↓
9. Fetch and return updated tiers
   ↓
10. Component receives response
    ↓
11. Show success toast
```

---

## Component Structure

### TierPricingForm.tsx

**Imports**:
- React hooks (useState, useEffect)
- UI components (Card, Button, Input, Label, Switch)
- Icons (Settings, Loader2, Check, Gift, Star, Sparkles, Crown)
- Toast notifications (sonner)
- Types (SubscriptionTier from database.types)

**Key Functions**:

#### fetchTiers()
- Calls GET /api/tiers/[classId]
- Maps response to TierFormData
- Sets loading state
- Catches errors → toast.error()

#### updateTier(level, field, value)
- Updates state for specific tier level
- Allows: price, lesson_unlock_count, is_enabled

#### handleSubmit(e)
- Validates form
- Sends PUT request
- Maps tiers to { id, price, lesson_unlock_count, is_enabled }
- Handles response/errors
- Shows toast notification

**Rendering Logic**:
- Loading state: 4 skeleton loaders
- Per tier: Iterate tierConfigs array
- Check if tier enabled before rendering fields
- Free tier: Special handling (price locked, no toggle)
- Premium tier: Unlimited toggle instead of number input

---

## API Layer

### GET /api/tiers/[classId]

**Authentication**: None required (public read)

**Validation**:
- classId must be valid UUID

**Logic**:
```typescript
1. Extract classId from params
2. Query subscription_tiers WHERE class_id = classId
3. If error: Return 500 with error
4. If no tiers:
   - Log warning
   - Insert 4 default tiers
   - Return inserted tiers
5. Return tiers array
```

**Default Tier Values**:
```typescript
[
  { tier_level: 0, name: 'Miễn phí', price: 0, lesson_unlock_count: 0, is_enabled: true },
  { tier_level: 1, name: 'Cơ bản', price: 50000, lesson_unlock_count: 5, is_enabled: true },
  { tier_level: 2, name: 'Tiêu chuẩn', price: 100000, lesson_unlock_count: 10, is_enabled: true },
  { tier_level: 3, name: 'Trọn bộ', price: 200000, lesson_unlock_count: null, is_enabled: true }
]
```

### PUT /api/tiers/[classId]

**Authentication**: Required (Supabase auth)

**Validation Stack**:
1. Extract classId
2. Get authenticated user
3. Verify user owns the class (query classes table)
4. Parse request body → tiers array
5. For each tier:
   - Validate id exists
   - Validate price >= 0
   - Validate lesson_unlock_count is null or >= 0
   - Validate is_enabled is boolean
6. Update each tier in subscription_tiers

**Error Responses**:
```typescript
if (!user): 401 - 'Vui lòng đăng nhập để tiếp tục'
if (!classData): 404 - 'Lớp học không tồn tại'
if (classData.teacher_id !== user.id): 403 - 'Bạn không có quyền...'
if (!tiers): 400 - 'Dữ liệu không hợp lệ'
if (price < 0): 400 - 'Giá phải là số không âm'
if (lesson_unlock_count invalid): 400 - 'Số bài mở khóa...'
if (is_enabled not boolean): 400 - 'Trạng thái kích hoạt...'
if (update fails): 500 - Error details
```

---

## Database Schema

### subscription_tiers Table

```sql
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (0, 1, 2, 3)),
  name VARCHAR(100) NOT NULL,
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  lesson_unlock_count INTEGER CHECK (lesson_unlock_count IS NULL OR lesson_unlock_count >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_tier_per_class UNIQUE(class_id, tier_level)
);

CREATE INDEX idx_subscription_tiers_class_id ON subscription_tiers(class_id);
CREATE INDEX idx_subscription_tiers_tier_level ON subscription_tiers(tier_level);
```

### TypeScript Interface

```typescript
export interface SubscriptionTier {
  id: string
  class_id: string
  tier_level: 0 | 1 | 2 | 3
  name: string
  price: number              // VND, >= 0
  lesson_unlock_count: number | null  // null = unlimited
  is_enabled: boolean
  created_at: string
  updated_at: string
}
```

---

## Configuration Constants

### Tier Definitions

```typescript
const tierConfigs: TierConfig[] = [
  {
    level: 0,
    icon: Gift,
    color: 'text-gray-600',
    defaultName: 'Miễn phí'  // Free
  },
  {
    level: 1,
    icon: Star,
    color: 'text-blue-600',
    defaultName: 'Cơ bản'    // Basic
  },
  {
    level: 2,
    icon: Sparkles,
    color: 'text-purple-600',
    defaultName: 'Tiêu chuẩn'  // Standard
  },
  {
    level: 3,
    icon: Crown,
    color: 'text-amber-600',
    defaultName: 'Trọn bộ'     // Premium
  }
]
```

### Number Formatting (Vietnamese)

```typescript
// Format to display: 50000 → "50.000"
function formatNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits ? parseInt(digits, 10).toLocaleString('vi-VN') : ''
}

// Parse from input: "50.000" → 50000
function parseNumber(value: string): number {
  return parseInt(value.replace(/\D/g, '') || '0', 10)
}
```

---

## State Machine

### Component States

```
IDLE
  ├─ isLoading: false
  ├─ isSaving: false
  ├─ tiers: []
  └─ user interaction possible

LOADING
  ├─ isLoading: true
  ├─ Show skeleton loaders
  └─ No user input allowed

LOADED
  ├─ isLoading: false
  ├─ isSaving: false
  ├─ tiers: [TierFormData[], ...]
  └─ User can edit form

SAVING
  ├─ isLoading: false
  ├─ isSaving: true
  ├─ Form inputs disabled
  └─ Submit button shows spinner

ERROR
  ├─ Show toast.error()
  └─ Return to appropriate previous state
```

---

## Security Considerations

### Authentication
- GET endpoint: Public (no auth check)
- PUT endpoint: Requires Supabase auth token

### Authorization
- PUT checks user is class teacher
- Extra safety: Update includes class_id in WHERE clause

### Input Validation
- Type checking: price (number), lesson_unlock_count (number | null), is_enabled (boolean)
- Range checks: price >= 0, lesson_unlock_count >= 0 or null
- Foreign key: All tier updates check class_id matches

### SQL Injection Prevention
- Uses Supabase client (parameterized queries)
- No string interpolation in SQL

---

## Error Handling

### Frontend (TierPricingForm)
```typescript
try {
  // Fetch or update
} catch (err) {
  console.error('Error message:', err)
  toast.error('User-friendly message')
} finally {
  setIsLoading(false)
  setIsSaving(false)
}
```

### Backend (API Route)
```typescript
if (error) {
  console.error('Error details:', error)
  return NextResponse.json(
    { error: 'User message' },
    { status: errorCode }
  )
}
```

### Toast Notifications
- Success: "Đã cập nhật cài đặt gói"
- Error: Specific error message or generic "Không thể cập nhật"

---

## Testing Strategy

### Unit Tests (Recommended)
- formatNumber() function
- parseNumber() function
- updateTier() state updater logic

### Integration Tests
- GET endpoint: Create class, fetch tiers, verify defaults
- PUT endpoint: Update tier, verify changes, check auth
- Form submission: Edit, submit, verify success/error

### E2E Tests
1. Navigate to settings
2. Edit prices
3. Toggle tiers
4. Submit
5. Verify persistence
6. Refresh and confirm changes

---

## Performance Considerations

### Optimization
- Lazy component loading (teacher component)
- Memoization not needed (small tier array)
- API calls batched (single GET, single PUT)

### Network
- GET: Minimal payload (4 tier objects)
- PUT: Minimal payload (4 tier updates)
- Auto-create on GET prevents N+1 queries

### UI
- Toast notifications don't block
- Skeleton loaders show loading state
- Spinner on submit button shows progress

---

## Future Enhancements

### Phase 2 Considerations
- **Student Purchase Flow**: Display tiers, handle payments
- **Lesson Locking**: Check membership tier before lesson access
- **Payment Processing**: Track transactions linked to tiers
- **Analytics**: Per-tier subscription counts and revenue

### Potential Improvements
- Batch tier creation in API
- Add soft delete for disabled tiers
- Tier change history/audit log
- A/B test tier pricing suggestions
- Tier recommendations based on course difficulty

---

**Last Updated**: December 28, 2025
**Architecture Review**: Complete
**Documentation Status**: Current
