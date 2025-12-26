# Phase 04: Subscription Management UI

**Parent**: [plan.md](./plan.md) | **Status**: ✅ COMPLETE | **Priority**: MEDIUM

## Dependencies
- Phase 03: Checkout Flow (tier purchases working)

## Overview

Student views purchased tiers and unlocked lessons. Teacher views member tiers and earnings.

## Key Insights

1. Student needs: current tier per class, lessons unlocked count
2. Teacher needs: member tier status, total earnings
3. One-time purchase = no cancellation needed (no recurring)
4. Upgrade = buy higher tier (replaces current)
5. VND formatting for prices

## Requirements

### Functional
- F1: Student views tier status per enrolled class
- F2: Student sees unlocked lesson count
- F3: Student can upgrade to higher tier
- F4: Teacher views member tier breakdown
- F5: Teacher sees earnings per class

### Non-Functional
- NF1: Clear tier comparison for upgrades
- NF2: VND currency formatting
- NF3: Mobile-friendly layout

## Architecture

### Student Tier View

```
My Classes (with tier info)
├── ClassCard
│     ├── Class name, teacher
│     ├── Current tier badge (or "Free - 3 lessons")
│     ├── Lessons unlocked: X of Y
│     ├── Progress bar
│     └── Upgrade button (if not Tier 3)
└── Empty state if no classes
```

### Teacher Earnings View

```
MembersTab (enhanced)
├── EarningsCard
│     ├── Total earnings (VND)
│     ├── Tier breakdown (T1: X, T2: Y, T3: Z)
│     └── Total paying students
├── TierPricingForm
│     └── Edit tier prices (3 inputs)
└── Member list with tier badges
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `src/components/student/TierStatusBadge.tsx` | Display current tier |
| `src/components/student/LessonUnlockProgress.tsx` | Progress bar |
| `src/components/teacher/EarningsCard.tsx` | Revenue summary |
| `src/components/teacher/TierPricingForm.tsx` | Edit tier prices |
| `src/app/api/tiers/[classId]/route.ts` | GET/PUT tier prices |

### Modify
| File | Change |
|------|--------|
| `src/components/student/MyClasses.tsx` | Add tier info |
| `src/components/teacher/MembersTab.tsx` | Add tier badges, earnings |
| `src/app/teacher/classes/[classId]/settings/page.tsx` | Add pricing form |

## Implementation Steps

1. Create TierStatusBadge component:
   - Props: tier (null | tier object)
   - Show "Miễn phí - 3 bài" if no tier
   - Show tier name + lesson count if purchased

2. Create LessonUnlockProgress component:
   - Props: unlockedCount, totalCount
   - Progress bar with percentage
   - Text: "5/20 bài học đã mở khóa"

3. Create EarningsCard component:
   - Props: classId
   - Query tier_purchases + payments
   - Calculate: total VND, tier breakdown, paid count
   - Format VND: 1.500.000 ₫

4. Create TierPricingForm component:
   - Props: classId, tiers[]
   - 3 inputs for tier prices
   - Save button → PUT /api/tiers/[classId]

5. Create tiers API route:
   - GET: fetch tiers for class
   - PUT: update tier prices (teacher only)

6. Modify MyClasses:
   - Join tier_purchases to get user's tier
   - Pass tier info to class cards
   - Show upgrade button if tier < 3

7. Modify MembersTab:
   - Join tier_purchases for member tiers
   - Add tier badge per member
   - Add EarningsCard at top

8. Modify settings page:
   - Add "Pricing" section
   - Render TierPricingForm

## Todo

- [ ] Create src/components/student/TierStatusBadge.tsx
- [ ] Create src/components/student/LessonUnlockProgress.tsx
- [ ] Create src/components/teacher/EarningsCard.tsx
- [ ] Query earnings data
- [ ] VND formatting
- [ ] Tier breakdown display
- [ ] Create src/components/teacher/TierPricingForm.tsx
- [ ] Price inputs
- [ ] Save handler
- [ ] Create src/app/api/tiers/[classId]/route.ts
- [ ] GET handler
- [ ] PUT handler with auth
- [ ] Modify MyClasses.tsx
- [ ] Add tier query
- [ ] Show tier badge
- [ ] Show unlock progress
- [ ] Modify MembersTab.tsx
- [ ] Add tier badges
- [ ] Add EarningsCard
- [ ] Modify settings page
- [ ] Add TierPricingForm

## Success Criteria

- [ ] Student sees current tier for each class
- [ ] Student sees lesson unlock count
- [ ] Student can initiate upgrade (opens modal)
- [ ] Teacher sees earnings summary
- [ ] Teacher can edit tier prices
- [ ] Member list shows tier badges

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| VND formatting issues | LOW | LOW | Use Intl.NumberFormat |
| Earnings calculation error | MED | MED | Aggregate in DB |
| Price update race | LOW | LOW | Optimistic UI |

## Security Considerations

- Only teacher can update tier prices
- Validate price > 0 server-side
- RLS prevents cross-class access

## Data Queries

### Student Tier Status
```sql
SELECT tp.*, st.name, st.lesson_unlock_count
FROM tier_purchases tp
JOIN subscription_tiers st ON st.id = tp.tier_id
WHERE tp.user_id = $1 AND tp.class_id = $2
```

### Teacher Earnings
```sql
SELECT
  SUM(p.amount) as total_vnd,
  COUNT(*) as purchase_count,
  st.tier_level,
  COUNT(*) FILTER (WHERE st.tier_level = 1) as tier1_count,
  COUNT(*) FILTER (WHERE st.tier_level = 2) as tier2_count,
  COUNT(*) FILTER (WHERE st.tier_level = 3) as tier3_count
FROM payments p
JOIN tier_purchases tp ON tp.payment_id = p.id
JOIN subscription_tiers st ON st.id = tp.tier_id
WHERE p.class_id = $1 AND p.status = 'completed'
GROUP BY st.tier_level
```

## Next Steps

After completion: Proceed to Phase 05 (Access Control)
