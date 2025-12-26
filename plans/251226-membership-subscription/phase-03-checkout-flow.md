# Phase 03: Checkout Flow UI

**Parent**: [plan.md](./plan.md) | **Status**: ✅ COMPLETE | **Priority**: HIGH
**Review**: [code-reviewer-251226-phase03-checkout-flow.md](../reports/code-reviewer-251226-phase03-checkout-flow.md)

## Dependencies
- Phase 02: Payment Service (API endpoint must exist)

## Overview

Tier selection modal with payment form. Student selects tier, enters card, purchases. Shows unlock count and price.

## Key Insights

1. Modal keeps user in context (no navigation)
2. Show tier comparison (lessons unlocked, price)
3. Highlight current tier if upgrading
4. "TEST MODE" badge for clarity
5. Test card hints for easy testing

## Requirements

### Functional
- F1: Display 3 tiers with prices and lesson counts
- F2: Highlight best value / most popular
- F3: Select tier → show payment form
- F4: Process payment and show result
- F5: Refresh lesson access on success

### Non-Functional
- NF1: Mobile-responsive layout
- NF2: Clear pricing display (VND format)
- NF3: Loading states during processing
- NF4: Accessible form controls

## Architecture

### Component Hierarchy

```
StudentCourseViewer / LessonList
  └── TierPurchaseModal (dialog)
        ├── TierSelector
        │     ├── TierCard (x3)
        │     │     ├── Tier name
        │     │     ├── Price (VND)
        │     │     ├── Lessons unlocked
        │     │     └── Select button
        │     └── CurrentTierBadge (if owned)
        ├── PaymentForm (shown after tier selected)
        │     ├── Card Number Input
        │     ├── Expiry Input
        │     ├── CVV Input
        │     └── Pay Button
        └── TestCardHints (collapsible)
```

### State Flow

```
Locked lesson clicked → "Upgrade to unlock"
        ↓
TierPurchaseModal opens (load tiers from DB)
        ↓
User selects tier → PaymentForm appears
        ↓
User fills card → Submit
        ↓
API call /api/payments
        ↓
Success: close modal, refresh, toast "X lessons unlocked!"
Failure: show error, allow retry
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `src/components/checkout/TierPurchaseModal.tsx` | Modal with tier selection |
| `src/components/checkout/TierCard.tsx` | Individual tier display |
| `src/components/checkout/PaymentForm.tsx` | Card input form |
| `src/components/checkout/TestCardHints.tsx` | Test card reference |

### Modify
| File | Change |
|------|--------|
| `src/components/student/StudentCourseViewer.tsx` | Add upgrade trigger |
| `src/components/student/StudentCoursesView.tsx` | Pass tier purchase state |

## Implementation Steps

1. Create TierCard component:
   - Props: tier, isSelected, isOwned, onSelect
   - Display: name, price (formatted VND), lesson count
   - Badge for "owned" or "best value"

2. Create TestCardHints component:
   - Collapsible info box
   - List test cards with copy buttons
   - 4111... = success, 4000... = fail

3. Create PaymentForm component:
   - React Hook Form + Zod validation
   - Card number (16 digits, grouped display)
   - Expiry (MM/YY)
   - CVV (3-4 digits)
   - Submit with loading state

4. Create TierPurchaseModal component:
   - Fetch tiers for class on open
   - TierSelector → PaymentForm flow
   - Handle success/error states
   - Call onSuccess prop to refresh parent

5. Modify StudentCourseViewer:
   - Detect locked lessons (beyond free/purchased count)
   - Show "Upgrade to unlock" button
   - Open TierPurchaseModal on click

## Todo

- [ ] Create src/components/checkout/TierCard.tsx
- [ ] Tier info display
- [ ] Price formatting (VND)
- [ ] Selected/owned states
- [ ] Create src/components/checkout/TestCardHints.tsx
- [ ] Collapsible UI
- [ ] Copy buttons
- [ ] Create src/components/checkout/PaymentForm.tsx
- [ ] Form with validation
- [ ] Card inputs
- [ ] Loading/error states
- [ ] Create src/components/checkout/TierPurchaseModal.tsx
- [ ] Tier fetching
- [ ] Tier selection flow
- [ ] Payment integration
- [ ] Success handling
- [ ] Modify StudentCourseViewer.tsx
- [ ] Locked lesson detection
- [ ] Upgrade button
- [ ] Modal integration

## Success Criteria

- [ ] Modal shows 3 tiers with correct prices
- [ ] Selecting tier shows payment form
- [ ] 4111 card purchase succeeds
- [ ] 4000 card shows error message
- [ ] Success unlocks additional lessons
- [ ] Current tier shown if already purchased

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| VND formatting issues | LOW | LOW | Use Intl.NumberFormat |
| Tier fetch failure | LOW | MED | Loading/error states |
| Modal z-index issues | LOW | LOW | Use shadcn Dialog |

## Security Considerations

- Never log card details
- Clear form on close
- Server validates even if client validated
- No card data in localStorage

## UI/UX Notes

- "TEST MODE" badge prominent
- VND format: 50.000 ₫
- Disable submit during processing
- Toast on success: "Đã mở khóa X bài học!"

## Next Steps

After completion: Proceed to Phase 04 (Subscription Management)
