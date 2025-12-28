# Documentation Update: Phase 1 Teacher Tier Management

**Date**: 2025-12-28
**Feature**: Teacher Tier Management (Phase 1)
**Status**: Integration Complete - Documentation Updated

---

## Summary

TierPricingForm component successfully integrated into class settings page. Teachers can now configure subscription tier pricing and lesson unlock counts directly from `/teacher/classes/[classId]/settings`.

**Changed File**: `src/app/teacher/classes/[classId]/settings/page.tsx`

---

## Component Integration

### TierPricingForm Component
**Location**: `src/components/teacher/TierPricingForm.tsx`
**Status**: Already documented (no new component)
**Integration Point**: Class Settings Page (lines 66-68)

**Functionality**:
- Displays 4 subscription tiers (Free, Basic, Standard, Premium)
- Edit price per tier (VND currency)
- Set lesson unlock count per tier
- Toggle tier enable/disable (except Free tier)
- Premium tier supports unlimited lessons toggle
- Real-time form validation
- Toast notifications for success/error

**API Endpoint**: `/api/tiers/[classId]`
- **GET**: Fetch all tiers for class (auto-creates defaults if missing)
- **PUT**: Update tier configuration (teacher auth required)

---

## Architecture Overview

### Tier System Structure

```
Class
├── Tier 0: Free (always enabled)
│   ├── Price: 0 VND
│   └── Lessons: Configurable unlock count
├── Tier 1: Basic (toggleable)
│   ├── Price: Editable
│   └── Lessons: Numeric limit
├── Tier 2: Standard (toggleable)
│   ├── Price: Editable
│   └── Lessons: Numeric limit
└── Tier 3: Premium (toggleable)
    ├── Price: Editable
    └── Lessons: Unlimited or limit
```

### Data Flow

1. **Teacher loads settings page** → Page renders AppHeader + EditClassForm + TierPricingForm
2. **TierPricingForm mounts** → Fetches tiers from GET `/api/tiers/[classId]`
3. **If no tiers exist** → API auto-creates 4 default tiers with sensible defaults
4. **Teacher updates pricing** → Form captures changes in local state
5. **Teacher submits** → PUT request sends updated tier array to API
6. **API validates** → Checks auth, ownership, data integrity
7. **Database updates** → subscription_tiers table updated per tier
8. **Response returns** → Updated tiers displayed (toast feedback)

---

## Database Schema Reference

### SubscriptionTier Interface
```typescript
export interface SubscriptionTier {
  id: string
  class_id: string
  tier_level: 0 | 1 | 2 | 3
  name: string
  price: number              // VND integer
  lesson_unlock_count: number | null  // NULL = unlimited
  is_enabled: boolean        // Tier 0 always true
  created_at: string
  updated_at: string
}
```

### Default Tier Values
| Tier | Name | Default Price | Default Lessons |
|------|------|---|---|
| 0 | Miễn phí (Free) | 0 | 0 |
| 1 | Cơ bản (Basic) | 50,000 | 5 |
| 2 | Tiêu chuẩn (Standard) | 100,000 | 10 |
| 3 | Trọn bộ (Premium) | 200,000 | unlimited |

---

## API Reference

### GET /api/tiers/[classId]

**Purpose**: Fetch subscription tiers for a class

**Response**:
```json
{
  "tiers": [
    {
      "id": "uuid",
      "class_id": "uuid",
      "tier_level": 0,
      "name": "Miễn phí",
      "price": 0,
      "lesson_unlock_count": 0,
      "is_enabled": true,
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
    // ... 3 more tiers
  ]
}
```

**Auto-creation**: If no tiers exist, API creates 4 default tiers automatically.

**Error Cases**:
- Database query fails → 500 with error details
- No tiers and creation fails → Returns empty array

---

### PUT /api/tiers/[classId]

**Purpose**: Update tier settings (teacher only)

**Request Body**:
```json
{
  "tiers": [
    {
      "id": "uuid",
      "price": 50000,
      "lesson_unlock_count": 5,
      "is_enabled": true
    }
    // ... 3 more tiers
  ]
}
```

**Validation**:
- ✓ User authenticated
- ✓ User is class teacher
- ✓ Price is non-negative number
- ✓ lesson_unlock_count is null or non-negative number
- ✓ is_enabled is boolean

**Response**: Updated tiers array (same format as GET)

**Error Cases**:
- Not authenticated → 401
- Not class teacher → 403
- Invalid class → 404
- Invalid data → 400
- Database error → 500

---

## UI/UX Details

### TierPricingForm Behavior

**Loading State**:
- Shows 4 skeleton loaders while fetching

**Enabled Tier Display**:
- Icon + Name + Badge (if Free tier)
- Price input (disabled for Free)
- Lesson count input or unlimited toggle

**Disabled Tier Display**:
- Grayed out (opacity-60)
- Shows "Đã tắt" badge
- All fields hidden

**Special Cases**:
- Free tier: Price always 0, toggle hidden, can't be disabled
- Premium tier: Lesson count has unlimited toggle instead of number input
- Submit button: Disabled while saving, shows spinner

**Notifications**:
- Success: "Đã cập nhật cài đặt gói"
- Error: Shows error message or generic "Không thể cập nhật"

---

## Integration Checklist

- ✅ TierPricingForm component created
- ✅ API route GET/PUT implemented
- ✅ Database migration for subscription_tiers
- ✅ TypeScript types defined
- ✅ Settings page integration complete
- ✅ Auth validation in API
- ✅ Default tier creation logic
- ✅ Form validation
- ✅ Internationalization (Vietnamese labels)
- ✅ Error handling

---

## Related Database Migrations

**Files Applied**:
- `supabase/008_TEACHER_CONFIGURABLE_TIERS.sql` - Creates subscription_tiers table
- `supabase/009_TIER_ENABLE_DISABLE.sql` - Adds is_enabled column
- `supabase/010_ENABLE_REALTIME_MESSAGES.sql` - Related to messaging

---

## Next Steps (Phase 2)

1. **Student-facing tier selection** - Purchase/upgrade flow in class view
2. **Lesson access control** - Lock lessons based on student's tier
3. **Payment processing** - Integrate payment gateway (Polar/SePay)
4. **Transaction history** - Show student purchases
5. **Tier analytics** - Dashboard showing sales per tier

---

## Files Modified Summary

| File | Change | Lines |
|------|--------|-------|
| `src/app/teacher/classes/[classId]/settings/page.tsx` | Added TierPricingForm component | +3 |

## Components Involved

| Component | Path | Status |
|-----------|------|--------|
| TierPricingForm | `src/components/teacher/TierPricingForm.tsx` | Complete |
| API Route | `src/app/api/tiers/[classId]/route.ts` | Complete |
| Settings Page | `src/app/teacher/classes/[classId]/settings/page.tsx` | Complete |

---

## Questions/Gaps

- None identified. Feature is self-contained and well-integrated.

---

**Last Updated**: 2025-12-28
**Documentation Status**: Current and Complete
