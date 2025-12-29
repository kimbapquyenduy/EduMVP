# Phase 1 Features: Teacher Tier Management

**Date**: December 28, 2025
**Status**: Complete & Integrated

---

## Feature: Teacher Subscription Tier Configuration

### Overview
Teachers can configure subscription tiers directly from class settings. Each class supports 4 tiers with customizable pricing and lesson unlock counts.

### Location
- **Settings Page**: `/teacher/classes/[classId]/settings`
- **Component**: `src/components/teacher/TierPricingForm.tsx`
- **API**: `src/app/api/tiers/[classId]/route.ts`

### Tier Structure

| Tier | Name (Vietnamese) | Configurable | Premium | Default Price | Default Lessons |
|------|-------------------|--------------|---------|---|---|
| 0 | Miễn phí (Free) | Price: No | No | 0 VND | 0 |
| 1 | Cơ bản (Basic) | Price: Yes | No | 50,000 | 5 |
| 2 | Tiêu chuẩn (Standard) | Price: Yes | No | 100,000 | 10 |
| 3 | Trọn bộ (Premium) | Price: Yes | Yes | 200,000 | Unlimited |

### Configuration Options

**For All Enabled Tiers**:
- Set price in Vietnamese Dong (VND)
- Set number of lessons to unlock (0-unlimited)
- Enable/disable tier (except Free tier)

**For Premium Tier Only**:
- Toggle between unlimited lessons or specific count
- Shown as "Tất cả bài học" (All lessons) or "Giới hạn" (Limited)

### User Experience

**Loading**: Skeleton loaders while fetching tier data

**Form State**:
- Free tier: Always enabled, price locked at 0
- Premium tier: Shows unlimited toggle instead of number input
- Other tiers: Can be toggled on/off

**Feedback**:
- Success: "Đã cập nhật cài đặt gói" (Updated tier settings)
- Error: Shows specific error message or generic error
- Saving state: Button shows spinner + "Đang lưu..." (Saving...)

**Validation**:
- Price must be non-negative
- Lesson count must be non-negative or null (unlimited)
- Free tier cannot be disabled
- Only class teacher can modify

### API Details

#### GET /api/tiers/[classId]
Fetches current tier configuration. Auto-creates default tiers if missing.

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
      "created_at": "2025-12-28T...",
      "updated_at": "2025-12-28T..."
    }
    // 3 more tiers...
  ]
}
```

#### PUT /api/tiers/[classId]
Updates tier configuration. Validates auth and ownership.

**Request**:
```json
{
  "tiers": [
    {
      "id": "uuid",
      "price": 50000,
      "lesson_unlock_count": 5,
      "is_enabled": true
    }
    // 3 more tiers...
  ]
}
```

**Validation Checks**:
- ✓ User is authenticated
- ✓ User is the class teacher
- ✓ All prices are non-negative numbers
- ✓ Lesson counts are null or non-negative numbers
- ✓ is_enabled is boolean

**Error Responses**:
- 401: Not authenticated
- 403: Not the class teacher
- 404: Class not found
- 400: Invalid data
- 500: Database error

### Database Schema

**Table**: `subscription_tiers`

```sql
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id),
  tier_level INTEGER NOT NULL (0-3),
  name VARCHAR NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  lesson_unlock_count INTEGER NULL,  -- NULL = unlimited
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Component Props

```typescript
interface TierPricingFormProps {
  classId: string
}
```

### State Management

**Local Form State**:
```typescript
interface TierFormData {
  id: string
  tier_level: number
  name: string
  price: number
  lesson_unlock_count: number | null
  is_enabled: boolean
}
```

**Component States**:
- `isLoading`: Boolean - Fetching tiers
- `isSaving`: Boolean - Submitting changes
- `tiers`: Array<TierFormData> - Current tier data

### Integration Point

**File**: `src/app/teacher/classes/[classId]/settings/page.tsx`

```typescript
// Lines 66-68
{/* Subscription Tiers Section */}
<div className="pt-6">
  <TierPricingForm classId={classId} />
</div>
```

Settings page flow:
1. Loads authenticated teacher
2. Verifies teacher owns the class
3. Renders header + EditClassForm + TierPricingForm + DeleteClassButton
4. TierPricingForm fetches and manages tier configuration

### Features Summary

**Implemented**:
- ✅ UI Form with 4 tier sections
- ✅ Price editing (VND currency format)
- ✅ Lesson count configuration
- ✅ Tier enable/disable toggles
- ✅ Unlimited lessons toggle for Premium
- ✅ Form validation
- ✅ API integration (GET/PUT)
- ✅ Error handling with toast notifications
- ✅ Loading states
- ✅ Auto-create defaults if missing
- ✅ Authentication & authorization checks
- ✅ Vietnamese localization

### Dependencies

**Frontend**:
- React 18+ (hooks: useState, useEffect)
- shadcn/ui components (Card, Button, Input, Switch, Badge)
- lucide-react (icons)
- sonner (toast notifications)

**Backend**:
- Next.js API Routes
- Supabase client (auth, database)
- TypeScript

### Testing Considerations

**Manual Testing**:
1. Navigate to `/teacher/classes/[classId]/settings`
2. Verify tier form loads
3. Edit pricing for Basic tier
4. Toggle Standard tier off
5. Enable Premium tier unlimited
6. Submit form
7. Verify success toast
8. Refresh page - changes persisted

**Error Cases**:
- Invalid price (negative) - should show validation error
- Network failure - should show error toast
- Unauthorized access - API returns 403
- Class doesn't exist - redirects to dashboard

---

## Integration Summary

| Component | Status | Location |
|-----------|--------|----------|
| TierPricingForm | ✅ Complete | `src/components/teacher/TierPricingForm.tsx` |
| API Routes | ✅ Complete | `src/app/api/tiers/[classId]/route.ts` |
| Settings Page Integration | ✅ Complete | `src/app/teacher/classes/[classId]/settings/page.tsx` |
| Database Migrations | ✅ Complete | `supabase/008_TEACHER_CONFIGURABLE_TIERS.sql` |
| TypeScript Types | ✅ Complete | `src/lib/types/database.types.ts` |

---

## Next Phase (Phase 2)

**Student-facing tier selection**:
- Browse available tiers in class view
- Purchase/upgrade tier flow
- Payment processing integration
- Lesson access control based on tier

**Teacher analytics**:
- Track tier subscriptions
- Revenue per tier
- Student tier distribution

---

**Documentation Status**: Current and Complete
**Last Updated**: December 28, 2025
