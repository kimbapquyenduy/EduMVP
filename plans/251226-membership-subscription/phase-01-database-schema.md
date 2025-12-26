# Phase 01: Database Schema Changes

**Parent**: [plan.md](./plan.md) | **Status**: PENDING | **Priority**: HIGH

## Dependencies
- None (first phase)

## Overview

Add subscription tiers table (per-class), tier purchases table, payments table. Free class joining (no payment for membership).

## Key Insights

1. Classes have 3 tiers with teacher-set prices
2. Tier purchase = one-time (no recurring)
3. Lesson unlock count: Tier1=5, Tier2=10, Tier3=ALL
4. 3 free lessons for all members (no purchase required)
5. Currency: VND (integer, no decimals)

## Requirements

### Functional
- F1: Store tier definitions per class (name, price, lesson_count)
- F2: Track tier purchases (user + class + tier)
- F3: Store payment records with status
- F4: Auto-record purchase on successful payment

### Non-Functional
- NF1: RLS for payment/purchase security
- NF2: Indexes for query performance
- NF3: Backward compatible with existing memberships

## Architecture

### New Tables

```sql
-- subscription_tiers: Per-class tier definitions
subscription_tiers (
  id UUID PRIMARY KEY,
  class_id UUID -> classes(id),
  tier_level INTEGER (1, 2, 3),
  name TEXT ('Basic', 'Standard', 'Premium'),
  price INTEGER NOT NULL, -- VND, no decimals
  lesson_unlock_count INTEGER, -- NULL = unlimited
  created_at TIMESTAMPTZ,
  UNIQUE(class_id, tier_level)
)

-- tier_purchases: User tier ownership
tier_purchases (
  id UUID PRIMARY KEY,
  user_id UUID -> profiles(id),
  class_id UUID -> classes(id),
  tier_id UUID -> subscription_tiers(id),
  payment_id UUID -> payments(id),
  purchased_at TIMESTAMPTZ,
  UNIQUE(user_id, class_id) -- one active tier per class per user
)

-- payments: Payment records
payments (
  id UUID PRIMARY KEY,
  user_id UUID -> profiles(id),
  class_id UUID -> classes(id),
  amount INTEGER NOT NULL, -- VND
  currency TEXT DEFAULT 'VND',
  status TEXT (pending|processing|completed|failed),
  test_mode BOOLEAN DEFAULT true,
  card_last_four TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
```

### Default Tiers (Auto-create for each class)

```sql
-- When class created, insert default tiers
Tier 1: 'Cơ bản' (Basic), 50000 VND, 5 lessons
Tier 2: 'Tiêu chuẩn' (Standard), 100000 VND, 10 lessons
Tier 3: 'Trọn bộ' (Premium), 200000 VND, NULL (all)
```

### Trigger: Auto-create purchase on payment success

```sql
ON payments UPDATE:
  IF new.status = 'completed' AND old.status != 'completed':
    INSERT INTO tier_purchases (user_id, class_id, tier_id, payment_id)
    VALUES (new.user_id, new.class_id, new.metadata->>'tier_id', new.id)
    ON CONFLICT (user_id, class_id) DO UPDATE
    SET tier_id = EXCLUDED.tier_id, payment_id = EXCLUDED.payment_id
```

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `supabase/006_SUBSCRIPTION_TIERS_SCHEMA.sql` | Full migration |

### Modify
| File | Change |
|------|--------|
| `src/lib/types/database.types.ts` | Add SubscriptionTier, TierPurchase, Payment types |

## Implementation Steps

1. Create subscription_tiers table with constraints
2. Create tier_purchases table with unique constraint
3. Create payments table with status check
4. Add indexes (class_id, user_id, status)
5. Create function to auto-create default tiers for new classes
6. Create trigger on classes INSERT for default tiers
7. Create function to record purchase on payment success
8. Create trigger on payments UPDATE
9. Add RLS policies:
   - Tiers: anyone can view, teacher can update prices
   - Purchases: users see own, teachers see class purchases
   - Payments: users see own
10. Update database.types.ts

## Todo

- [ ] Create 005_SUBSCRIPTION_TIERS_SCHEMA.sql
- [ ] subscription_tiers table
- [ ] tier_purchases table
- [ ] payments table
- [ ] Indexes
- [ ] create_default_tiers() function + trigger
- [ ] record_tier_purchase() function + trigger
- [ ] RLS: tiers viewable by all
- [ ] RLS: teacher update tier prices
- [ ] RLS: users view own purchases
- [ ] RLS: users view own payments
- [ ] Update database.types.ts

## Success Criteria

- [ ] Default tiers auto-created when class created
- [ ] Payment completion creates tier_purchase record
- [ ] RLS blocks cross-user access
- [ ] TypeScript types match schema

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Trigger failure | LOW | HIGH | Error logging, manual recovery |
| Default tier prices wrong | LOW | LOW | Teacher can edit |
| Unique constraint conflicts | LOW | MED | ON CONFLICT DO UPDATE |

## Security Considerations

- Never store full card numbers
- RLS prevents cross-user visibility
- Validate amount > 0 via CHECK
- Payment metadata validated server-side

## Next Steps

After completion: Proceed to Phase 02 (Payment Service)
