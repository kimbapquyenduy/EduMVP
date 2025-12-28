# Phase 1: Integrate TierPricingForm into Settings

## Context
- Parent: [plan.md](plan.md)
- Dependencies: None
- Docs: TierPricingForm already exists, just needs integration

## Overview
| Field | Value |
|-------|-------|
| Date | 2025-12-28 |
| Priority | High |
| Implementation | DONE |
| Review | DONE |
| Completed | 2025-12-28 |

## Key Insights
- `TierPricingForm` component exists at `src/components/teacher/TierPricingForm.tsx`
- API route exists at `src/app/api/tiers/[classId]/route.ts`
- Settings page currently only has EditClassForm and DeleteClassButton
- Component is fully functional, just not rendered

## Requirements
1. Add "Tier Pricing" section to class settings page
2. Import and render TierPricingForm component
3. Ensure proper styling consistency

## Architecture
No architectural changes needed - component exists and works.

## Related Code Files
- `src/app/teacher/classes/[classId]/settings/page.tsx` (modify)
- `src/components/teacher/TierPricingForm.tsx` (existing)
- `src/app/api/tiers/[classId]/route.ts` (existing)

## Implementation Steps

### Step 1: Update Settings Page
```typescript
// Add import
import { TierPricingForm } from '@/components/teacher/TierPricingForm'

// Add section after EditClassForm
<div className="pt-6">
  <h2 className="text-xl font-bold mb-4">Subscription Tiers</h2>
  <TierPricingForm classId={classId} />
</div>
```

### Step 2: Test
- Navigate to class settings
- Verify tier form loads
- Test saving tier changes

## Todo List
- [ ] Import TierPricingForm in settings page
- [ ] Add tier section with heading
- [ ] Verify form functionality

## Success Criteria
- [x] TierPricingForm visible in class settings
- [x] Can edit tier prices and lesson counts
- [x] Changes persist after save

## Risk Assessment
- **Low Risk**: Component already tested and working
- Only integration, no new logic

## Security Considerations
- RLS policies already in place (`011_FIX_SUBSCRIPTION_TIERS_RLS.sql`)
- Only teachers can update their class tiers

## Next Steps
After completion, proceed to Phase 2: Lesson Tier Assignment
