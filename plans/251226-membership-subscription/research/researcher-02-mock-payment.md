# Mock Payment Implementation Patterns - Research Report

**Date:** 2025-12-26 | **Topic:** Mock Payment System Design for EduMVP

---

## 1. Mock Payment Flow Architecture

### Checkout Simulation Pattern
- **Card-driven flow**: Mock system accepts predefined test cards (4111-1111-1111-1111 success, 4000-0000-0000-0002 decline)
- **No external calls**: All processing happens in app—zero latency, 100% deterministic
- **State progression**: PENDING → PROCESSING → COMPLETED/FAILED
- **UI patterns**: Match real payment forms but with "TEST MODE" badge

### Success/Failure Scenarios
```
Success paths:
  • Standard card: 4111 series
  • 3D Secure: 4000002500003155
  • International: Vary by region prefix

Failure paths:
  • Insufficient funds: 4000000000000002
  • Lost card: 4000000000000069
  • Expired: Use past expiry dates (01/23)
  • CVV mismatch: Any card + wrong CVV (00)
```

**Recommendation**: Deterministic outcomes—use card prefix patterns mapped to outcomes. Avoid randomization.

---

## 2. Payment Data Structures

### Transaction Schema (PostgreSQL)
```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  membership_id uuid REFERENCES memberships(id),

  -- Payment details
  amount_cents integer NOT NULL,
  currency text DEFAULT 'USD',
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

  -- Mock-specific
  test_mode boolean DEFAULT true,
  card_last_four text,
  payment_method text DEFAULT 'mock_card',

  -- Timestamps
  created_at timestamp DEFAULT now(),
  completed_at timestamp,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text
);

CREATE TABLE payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number text UNIQUE,
  issued_at timestamp DEFAULT now(),
  html_content text,
  pdf_url text
);
```

### Payment Status State Machine
```
PENDING ──→ PROCESSING ──→ COMPLETED (success)
                    ├──→ FAILED (decline/error)
                    └──→ REFUNDED (refund issued)
```

---

## 3. Supabase-Specific Patterns

### RLS Policies for Payment Security
```sql
-- Users can only see their own payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_own_payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Database Trigger for Subscription Activation
```sql
CREATE OR REPLACE FUNCTION activate_membership_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Activate membership
    UPDATE memberships
    SET status = 'active', activated_at = now()
    WHERE id = NEW.membership_id;

    -- Log subscription event
    INSERT INTO subscription_events (membership_id, event_type, created_at)
    VALUES (NEW.membership_id, 'payment_completed', now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_completed
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION activate_membership_on_payment();
```

---

## 4. Implementation Architecture

### Service Layer (Abstraction for Future Migration)
```typescript
// Mock implementation
export interface PaymentService {
  createPayment(payload: CreatePaymentPayload): Promise<Payment>;
  processPayment(paymentId: string, card: CardDetails): Promise<PaymentResult>;
  refundPayment(paymentId: string): Promise<RefundResult>;
  validateCard(card: CardDetails): { valid: boolean; reason?: string };
}

// Mock service uses deterministic outcomes based on card patterns
export class MockPaymentService implements PaymentService {
  // Outcome determined by card number prefix
  async processPayment(paymentId: string, card: CardDetails): Promise<PaymentResult> {
    const outcome = this.getOutcome(card.number);
    await db.update('payments').set({ status: outcome });
    return { success: outcome === 'completed' };
  }

  private getOutcome(cardNumber: string): PaymentStatus {
    if (cardNumber.startsWith('4111')) return 'completed';
    if (cardNumber.startsWith('4000')) return 'failed';
    return 'pending';
  }
}
```

**Key pattern**: Interface-based design allows drop-in replacement with Stripe/PayPal later without changing business logic.

---

## 5. Receipt/Invoice Generation

### Mock Receipt Generation
- Use server-side HTML template → PDF conversion (Puppeteer/wkhtmltopdf)
- Store receipt as JSONB in receipts table
- Generate fake receipt numbers: `RCP-{YYYY}{MM}{timestamp}`
- Include: Transaction ID, amount, student name, course/membership details

### Email Integration
```typescript
// Send receipt on successful payment
export async function sendPaymentReceipt(paymentId: string) {
  const payment = await db.query('payments').findById(paymentId);
  const receipt = await generateReceiptPDF(payment);

  await emailService.send({
    to: payment.user.email,
    subject: 'Payment Receipt',
    template: 'payment_receipt',
    attachments: [{ filename: 'receipt.pdf', content: receipt }]
  });
}
```

---

## 6. Refund Handling Patterns

### Mock Refund Flow
```typescript
async function refundPayment(paymentId: string) {
  const payment = await db.payments.findById(paymentId);

  if (payment.status !== 'completed') {
    throw new Error('Only completed payments can be refunded');
  }

  // Deactivate membership
  if (payment.membership_id) {
    await db.memberships.update(payment.membership_id, {
      status: 'refunded',
      refunded_at: new Date()
    });
  }

  // Update payment
  await db.payments.update(paymentId, {
    status: 'refunded',
    refunded_at: new Date()
  });

  // Send refund notification
  await sendRefundEmail(paymentId);
}
```

---

## 7. Future Migration to Real Payments

### Stripe Migration Path
1. **Minimal code changes**: Replace MockPaymentService with StripePaymentService
2. **Add env-based switching**:
   ```typescript
   const paymentService = process.env.PAYMENT_MODE === 'stripe'
     ? new StripePaymentService()
     : new MockPaymentService();
   ```
3. **Add webhook handling**: Stripe sends payment events via webhooks (requires URL endpoint)
4. **Database adjustments**: Add `stripe_payment_id`, `idempotency_key` columns
5. **PCI compliance**: Never store full card details—use Stripe elements

### Schema Migration
```sql
-- Add Stripe-specific columns (backward compatible with mock)
ALTER TABLE payments ADD COLUMN stripe_payment_id text;
ALTER TABLE payments ADD COLUMN idempotency_key text UNIQUE;
ALTER TABLE payments ADD COLUMN webhook_received_at timestamp;

-- Keep test_mode flag to track payment environment
```

---

## Key Findings & Recommendations

### Critical Patterns
- **Deterministic outcomes**: Card prefixes → predictable results (no randomization)
- **Interface-based services**: PaymentService interface allows migration without business logic changes
- **Event-driven activation**: Database triggers automatically activate memberships on payment completion
- **Separation of concerns**: Payment layer decoupled from membership/subscription logic

### Schema Essentials
- Store `test_mode` flag for environment tracking
- Use JSONB metadata for extensibility (add Stripe IDs later without migrations)
- Implement RLS policies from day one
- Create payment_receipts table for audit trail

### Testing Card Numbers
| Scenario | Card | Result |
|----------|------|--------|
| Success | 4111111111111111 | COMPLETED |
| Decline | 4000000000000002 | FAILED |
| Expired | 4111111111111111 + 01/23 | FAILED |
| No CVV | Any + CVV: 00 | FAILED |

### Future-Proofing Checklist
- ✓ Interface-based payment service
- ✓ Webhook simulation (mock endpoint returns 200 OK)
- ✓ Idempotency keys for duplicate prevention
- ✓ JSONB metadata for provider-specific fields
- ✓ test_mode flag for environment awareness

---

## Unresolved Questions
- Invoice tax calculation requirements (VAT/GST by region)?
- Refund window policy (immediate vs. delayed)?
- Multi-currency support scope for mock system?
