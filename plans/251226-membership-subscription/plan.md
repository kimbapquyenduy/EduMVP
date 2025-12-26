# Membership & Subscription with Mock Payment - Implementation Plan

**Date**: 2025-12-26 | **Status**: READY | **Priority**: HIGH

## Overview

Tiered lesson access system with mock payment. Free class joining for community access, subscription tiers unlock additional lessons.

**Business Model:**
- Join class = FREE (community, discussions, support)
- 3 free lessons on join
- Per-class subscription tiers (one-time purchase, teacher sets prices):
  - Tier 1: Unlock 5 lessons
  - Tier 2: Unlock 10 lessons
  - Tier 3: Unlock ALL lessons

## Phases

| Phase | Name | Status | Dependencies |
|-------|------|--------|--------------|
| 01 | Database Schema | ✅ DONE | None |
| 02 | Payment Service | ✅ DONE | Phase 01 |
| 03 | Checkout Flow | ✅ DONE | Phase 02 |
| 04 | Subscription Management | ✅ DONE | Phase 03 |
| 05 | Access Control | PENDING | Phase 04 |

## Architecture Summary

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  TierPurchase   │────▶│  PaymentService  │────▶│  Supabase DB    │
│  (React Modal)  │     │  (Interface)     │     │  (payments tbl) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                         │
                              ▼                         ▼
                        MockPayment              DB Trigger
                        (Deterministic)          (unlock lessons)
```

## Key Decisions

1. **Free class joining**: Membership = community access only
2. **Per-class tiers**: Teacher sets tier prices for each class
3. **One-time purchase**: No recurring billing for MVP
4. **Lesson unlock by order**: First N lessons based on tier
5. **VND currency**: Default for mock payment
6. **Interface-based**: PaymentService for future Stripe migration
7. **Deterministic cards**: 4111→success, 4000→fail

## Files Affected

### New Files
- `supabase/006_SUBSCRIPTION_TIERS_SCHEMA.sql` - tiers, purchases tables
- `src/lib/services/payment.ts` - PaymentService interface
- `src/lib/types/payment.types.ts` - Payment, Tier types
- `src/components/checkout/TierPurchaseModal.tsx` - Tier selection + payment
- `src/components/checkout/TierCard.tsx` - Individual tier display
- `src/components/checkout/PaymentForm.tsx` - Card input form
- `src/components/student/UnlockLessonPrompt.tsx` - Upgrade prompt
- `src/components/teacher/TierPricingForm.tsx` - Set tier prices
- `src/app/api/payments/route.ts` - Payment API

### Modified Files
- `src/lib/types/database.types.ts` - Add tier/payment types
- `src/components/student/BrowseClasses.tsx` - Free join (no payment)
- `src/components/student/StudentCourseViewer.tsx` - Lesson gating
- `src/app/teacher/classes/[classId]/settings/page.tsx` - Tier pricing

## Success Criteria

- [ ] Students join classes for free
- [ ] 3 lessons accessible immediately after joining
- [ ] Teachers can set tier prices (Sub1/Sub2/Sub3)
- [ ] Students can purchase tiers with test cards
- [ ] Purchased tier unlocks correct number of lessons
- [ ] 4111 card succeeds, 4000 card fails

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lesson ordering complexity | MED | Use order_index from lessons table |
| Tier upgrade logic | LOW | Replace tier, no partial credit for MVP |
| Free lesson count edge cases | LOW | Handle classes with <3 lessons |

## Related Docs

- Research: `research/researcher-01-subscription-patterns.md`
- Research: `research/researcher-02-mock-payment.md`
- Schema: `supabase/001_FULL_SCHEMA.sql`
