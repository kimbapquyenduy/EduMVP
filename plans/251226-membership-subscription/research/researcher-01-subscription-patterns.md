# Subscription & Membership Patterns for Educational Platforms
## Research Report: EduMVP Integration Analysis

**Date:** 2025-12-26
**Context:** Next.js + Supabase edtech platform with per-class subscriptions and tiered content access

---

## 1. CURRENT STATE ANALYSIS

### Existing Schema
EduMVP implements:
- **Memberships table**: `id`, `class_id`, `user_id`, `status` (ACTIVE/EXPIRED/CANCELLED), `joined_at`, `expires_at`
- **Classes**: `price` field (DECIMAL 10,2) with $0.00 = free, >0 = paid monthly
- **Courses**: `tier` field (FREE/PREMIUM) for gating content within classes
- **Denormalized counts**: `member_count`, `course_count` on classes table

### Current Implementation Gaps
1. No billing/payment integration (Stripe, Polar, SePay)
2. No automatic expiration handling (cron jobs missing)
3. No grace period logic post-expiration
4. No trial period support
5. Ambiguous "membership_status" passing to UI (line 104 in student class page)

---

## 2. RECOMMENDED SUBSCRIPTION MODELS FOR EDTECH

### Model A: Per-Class Subscription (Current Architecture)
**Pros:**
- Aligns with EduMVP's existing `classes.price` design
- Teacher can price each class independently
- Students see clear per-class costs
- Supports both free + premium classes simultaneously
- Simplified payment tracking

**Cons:**
- More complex churn (student leaves one class, not all)
- Multiple subscription states per user
- Higher payment processing overhead

**Best for:** EduMVP (micro-communities, teacher-led pricing)

### Model B: Platform-Wide Subscription
**Pros:**
- Single payment per user
- Simpler churn/retention metrics
- Better for platform monetization

**Cons:**
- Doesn't match current price-per-class design
- Requires tier-based access mapping

**Not recommended** for EduMVP MVP.

---

## 3. MEMBERSHIP STATE MACHINE PATTERNS

### Recommended 4-State Model
```
[PENDING] → [ACTIVE] → [EXPIRED] → [RENEWED/REACTIVATED]
            ↓         ↓
         [CANCELLED] (terminal)
```

**State Definitions:**
- **PENDING**: Payment authorized, waiting for confirmation or within trial period
- **ACTIVE**: Full access to class + courses (status check: `expires_at > NOW()`)
- **EXPIRED**: Payment lapsed, soft access cutoff (grace period: typically 3-7 days)
- **CANCELLED**: User requested cancellation or after grace period (hard access cutoff)

### Transition Rules
```sql
-- Automatic expiration logic (run via cron every 6hrs)
UPDATE memberships
SET status = 'EXPIRED'
WHERE status = 'ACTIVE'
AND expires_at IS NOT NULL
AND expires_at <= NOW();

-- Auto-cancel after grace period (14 days default)
UPDATE memberships
SET status = 'CANCELLED'
WHERE status = 'EXPIRED'
AND expires_at <= NOW() - INTERVAL '14 days';
```

---

## 4. BILLING PATTERNS FOR MONTHLY SUBSCRIPTIONS

### Monthly Renewal Logic
```sql
-- Next billing date calculation (typical)
expires_at = joined_at + INTERVAL '1 month'

-- On success: renew for another month
expires_at = expires_at + INTERVAL '1 month'

-- On failure (x3 retries): transition to EXPIRED
-- After 14-day grace: transition to CANCELLED
```

### Recommended Structure: Add to Memberships Table
```sql
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS (
  billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_billing_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  payment_method_id TEXT,  -- Stripe/Polar customer ref
  auto_renew BOOLEAN DEFAULT true,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ
);
```

---

## 5. TRIAL PERIOD IMPLEMENTATION

### Approach: Add `trial_ends_at` Column
```sql
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS (
  trial_ends_at TIMESTAMPTZ,  -- NULL = no trial or trial expired
  has_used_trial BOOLEAN DEFAULT false  -- One-time per class per user
);
```

### Logic
```sql
-- Create trial membership (0 cost)
INSERT INTO memberships (class_id, user_id, status, trial_ends_at)
VALUES (class_id, user_id, 'ACTIVE', NOW() + INTERVAL '7 days');

-- On trial expiration, require payment
UPDATE memberships
SET status = 'EXPIRED'
WHERE trial_ends_at IS NOT NULL
AND trial_ends_at <= NOW()
AND (billing_cycle_start IS NULL OR auto_renew = false);
```

**Pattern:** 7-day free trial → Auto-transition to EXPIRED unless payment method added

---

## 6. GRACE PERIOD STRATEGY

### Recommended: Hybrid Grace Period
```sql
-- Phase 1: Soft Cutoff (0-3 days post-expiration)
-- Access revoked visually, but data not deleted
-- Message: "Your subscription expired. Renew in Settings."

-- Phase 2: Hard Cutoff (3-14 days)
-- Limited access via RLS (can view but not interact)
-- Data preserved for 60 days

-- Phase 3: Cleanup (14+ days)
-- Auto-transition to CANCELLED
-- Consider: Archive user's posts/progress vs delete
```

### RLS Pattern for Grace Period
```sql
-- Allow read access during any grace period
CREATE POLICY "access_expired_for_grace_period"
ON courses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.class_id = courses.class_id
    AND m.user_id = auth.uid()
    AND m.status IN ('ACTIVE', 'EXPIRED')
    AND (m.expires_at IS NULL OR m.expires_at > NOW() - INTERVAL '14 days')
  )
);

-- Prevent write operations post-expiration
CREATE POLICY "no_write_if_expired"
ON posts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    JOIN classes c ON c.id = posts.class_id
    WHERE m.class_id = c.id
    AND m.user_id = auth.uid()
    AND m.status = 'ACTIVE'
  )
);
```

---

## 7. PREMIUM CONTENT ACCESS GATING

### Multi-Layer Gating Pattern
```sql
-- Layer 1: Course-level tier check
SELECT * FROM courses
WHERE class_id = ?
AND (
  -- User is teacher
  EXISTS (SELECT 1 FROM classes WHERE id = class_id AND teacher_id = auth.uid())
  -- OR: User has active membership + course is FREE
  OR (tier = 'FREE' AND EXISTS (
    SELECT 1 FROM memberships
    WHERE class_id = courses.class_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE'
  ))
  -- OR: User has active membership + course is PREMIUM (within trial OR paid)
  OR (tier = 'PREMIUM' AND EXISTS (
    SELECT 1 FROM memberships
    WHERE class_id = courses.class_id
    AND user_id = auth.uid()
    AND status = 'ACTIVE'
    AND (trial_ends_at > NOW() OR next_billing_date > NOW())
  ))
);

-- Layer 2: Lesson-level enforcement (granular)
SELECT * FROM lessons
WHERE course_id IN (accessible_courses)
AND (
  -- Public lessons
  is_public = true
  -- OR: User satisfies course requirements
  OR course_id IN (accessible_courses)
);
```

### Frontend Access Check Pattern
```typescript
// In StudentCoursesView.tsx
const canAccessPremium = (membership: Membership, course: Course) => {
  if (course.tier === 'FREE') return membership.status === 'ACTIVE';

  // PREMIUM tier: check trial OR active subscription
  const inTrial = membership.trial_ends_at &&
    new Date(membership.trial_ends_at) > new Date();
  const hasPaid = membership.status === 'ACTIVE' &&
    new Date(membership.expires_at) > new Date();

  return inTrial || hasPaid;
};
```

---

## 8. RECOMMENDED PAYMENT INTEGRATIONS

### Option A: Polar (Recommended for EduMVP)
**Best for:** SaaS subscriptions, global reach, tax handling
- Usage: Per-class subscriptions map to Polar "products"
- Benefits: Automatic recurring billing, customer portal, MoR tax handling
- Setup: `payment_provider_id` column in memberships
- Cost: 5% + payment processing

### Option B: Stripe
**Best for:** High-volume, enterprise needs
- Usage: Subscription API + webhook management
- Complexity: Higher (requires Stripe billing portal integration)
- Cost: 2.9% + $0.30 per transaction

### Option C: SePay (Vietnam-specific)
**Best for:** VietQR, domestic payments
- Usage: Payment processing via bank transfers
- Limitation: Regional only
- Cost: Variable

**Recommendation for MVP:** Polar (handles recurring + compliance).

---

## 9. CRITICAL CRON JOBS FOR PRODUCTION

### Required Scheduled Tasks
```python
# Every 6 hours
- Run expiration transition: ACTIVE → EXPIRED
- Retry failed payment authorizations (2-3 retries)

# Every 24 hours
- Process expirations > 14 days: EXPIRED → CANCELLED
- Archive cancelled user data (posts → soft-delete)
- Send expiration reminder emails (2 days before)
- Send cancellation confirmation emails

# Every week
- Generate revenue reports per teacher
- Audit payment reconciliation vs memberships table
```

---

## 10. SCHEMA MIGRATION CHECKLIST

### Phase 1: Immediate (MVP Payment Integration)
```sql
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS (
  payment_provider_id TEXT,        -- Stripe/Polar subscription ID
  auto_renew BOOLEAN DEFAULT true,
  billing_cycle_start TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  failed_payment_count INT DEFAULT 0
);

CREATE INDEX idx_memberships_expires_at ON memberships(expires_at);
CREATE INDEX idx_memberships_status_expires ON memberships(status, expires_at);
```

### Phase 2: Trial + Grace Period Support
```sql
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS (
  trial_ends_at TIMESTAMPTZ,
  has_used_trial BOOLEAN DEFAULT false,
  grace_period_ends_at TIMESTAMPTZ
);
```

### Phase 3: Audit + Churn Tracking
```sql
CREATE TABLE membership_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID REFERENCES memberships(id),
  old_status membership_status,
  new_status membership_status,
  reason TEXT,  -- 'auto_expiration', 'user_cancelled', 'payment_failed'
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. EXISTING CODE COMPATIBILITY NOTES

### Current Code Issues
1. **Line 104** (`StudentCoursesView`): Uses `membershipTier={membership.status}`
   - Should be `membership` object (not just status) to access `expires_at`, `trial_ends_at`
   - **Action:** Pass full membership object + current timestamp for access checks

2. **No RLS layer 2**: Lessons/posts access not gating on `courses.tier`
   - **Action:** Add RLS policy that checks course tier + membership status

3. **MembersTab** not filtering by membership status
   - **Action:** Show member_count as accurate (not including EXPIRED/CANCELLED)

### Required Frontend Updates
```typescript
// Example fix in StudentCoursesView.tsx
type Props = {
  classId: string;
  userId: string;
  membership: Membership;  // Change from membershipTier string
  currentTime?: Date;      // For testing/UI preview
};

const isAccessible = (course: Course) => {
  if (membership.status !== 'ACTIVE') return false;
  if (membership.expires_at && new Date(membership.expires_at) < new Date()) {
    return false;  // Expired subscription
  }
  if (course.tier === 'FREE') return true;

  // PREMIUM: check trial or within billing cycle
  return membership.trial_ends_at
    ? new Date(membership.trial_ends_at) > new Date()
    : true;
};
```

---

## 12. KEY RECOMMENDATIONS FOR EDUMVP

| Pattern | Recommendation | Priority |
|---------|---|---|
| **Subscription Model** | Per-class (current) | HIGH |
| **State Machine** | 4-state (PENDING→ACTIVE→EXPIRED→CANCELLED) | HIGH |
| **Billing Cycle** | Monthly renewal + 3-retry payment failures | HIGH |
| **Trial Support** | 7-day free trial (1x per class per user) | MEDIUM |
| **Grace Period** | 14-day EXPIRED before CANCELLED | MEDIUM |
| **Payment Provider** | Polar (MVP) → Stripe (scale) | HIGH |
| **Access Control** | 2-layer RLS (membership status + course tier) | HIGH |
| **Cron Jobs** | 3 scheduled tasks (expiration, retry, cleanup) | HIGH |

---

## 13. UNRESOLVED QUESTIONS

1. **Free vs Paid Classes**: Do free classes ($0.00) still require memberships, or open access?
   - Proposal: Free classes bypass membership system
   - Impact: Simplifies RLS for browsing

2. **Class Cancellation**: If teacher deletes a paid class, refund members?
   - Proposal: Auto-cancel memberships, issue refunds for current month

3. **Subscription Hierarchy**: Can single user have multiple active memberships?
   - Current: Yes (per-class design) — needs conflict handling

4. **Proration**: Handle mid-cycle cancellation refunds?
   - Proposal: Handle in payment provider webhook, not DB

5. **Revenue Sharing**: Multi-teacher platform requires revenue splits?
   - Proposal: Add `teacher_payout_rate` to classes table for MVP

---

## SOURCES & REFERENCES

- **SaaS Subscription Patterns**: Industry standard (Stripe, Zuora, Chargify)
- **Educational Platforms**: Udemy (per-course), Skillshare (platform-wide), Teachable (per-course)
- **PostgreSQL RLS**: Supabase RLS best practices (2024)
- **Polar Docs**: https://docs.polar.sh (payment gateway)
- **Stripe Subscriptions**: https://stripe.com/docs/billing/subscriptions (reference architecture)

---

**Report Status:** Complete
**Recommendations Ready:** Yes
**Implementation Scope:** ~2-3 weeks (payment integration + RLS updates)
