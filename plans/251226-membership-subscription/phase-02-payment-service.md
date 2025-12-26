# Phase 02: Payment Service

**Parent**: [plan.md](./plan.md) | **Status**: ✅ COMPLETE | **Priority**: HIGH
**Review**: [code-reviewer-251226-phase02-payment-service.md](../reports/code-reviewer-251226-phase02-payment-service.md)

## Dependencies
- Phase 01: Database Schema (tables must exist)

## Overview

Interface-based payment service with MockPaymentService. Handles tier purchases with deterministic test cards. VND currency.

## Key Insights

1. Interface design enables future Stripe migration
2. Card prefix determines outcome (no randomization)
3. VND currency, integer amounts (no decimals)
4. Payment creates pending record, processes, triggers tier_purchase

## Requirements

### Functional
- F1: Create payment record for tier purchase
- F2: Process with deterministic card outcome
- F3: Update status to completed/failed
- F4: Trigger creates tier_purchase on success

### Non-Functional
- NF1: Deterministic outcomes for testing
- NF2: Interface abstraction for providers
- NF3: Server-side validation

## Architecture

### PaymentService Interface

```typescript
interface PaymentService {
  createPayment(payload: CreatePaymentPayload): Promise<Payment>
  processPayment(paymentId: string, card: CardDetails): Promise<PaymentResult>
  getPayment(paymentId: string): Promise<Payment | null>
}

interface CreatePaymentPayload {
  userId: string
  classId: string
  tierId: string
  amount: number // VND integer
}

interface CardDetails {
  number: string    // 16 digits
  expMonth: string  // MM
  expYear: string   // YY
  cvv: string       // 3-4 digits
}

interface PaymentResult {
  success: boolean
  payment: Payment
  error?: string
}
```

### MockPaymentService Logic

```typescript
class MockPaymentService implements PaymentService {
  private getOutcome(cardNumber: string): 'completed' | 'failed' {
    if (cardNumber.startsWith('4111')) return 'completed'
    if (cardNumber.startsWith('4000')) return 'failed'
    return 'completed' // default success
  }

  async processPayment(paymentId: string, card: CardDetails): Promise<PaymentResult> {
    // 1. Validate card format
    // 2. Get outcome from card prefix
    // 3. Update payment status
    // 4. DB trigger creates tier_purchase if success
    // 5. Return result
  }
}
```

### Test Cards

| Card Number | Result | Use Case |
|------------|--------|----------|
| 4111111111111111 | SUCCESS | Normal purchase |
| 4000000000000002 | FAILED | Declined card |
| Any other 16 digits | SUCCESS | Default |

## Related Code Files

### Create
| File | Purpose |
|------|---------|
| `src/lib/services/payment.ts` | Interface + MockPaymentService |
| `src/lib/types/payment.types.ts` | Types |
| `src/lib/validations/payment.ts` | Zod schemas |
| `src/app/api/payments/route.ts` | POST endpoint |

## Implementation Steps

1. Create payment.types.ts:
   - PaymentService interface
   - CreatePaymentPayload, CardDetails
   - PaymentResult, Payment types

2. Create payment.ts validation (Zod):
   ```typescript
   const cardSchema = z.object({
     number: z.string().length(16).regex(/^\d+$/),
     expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
     expYear: z.string().length(2).regex(/^\d{2}$/),
     cvv: z.string().min(3).max(4).regex(/^\d+$/)
   })
   ```

3. Create MockPaymentService:
   - createPayment: insert pending payment with tierId in metadata
   - processPayment: validate, determine outcome, update DB
   - getPayment: fetch by ID

4. Create API route /api/payments:
   ```typescript
   POST /api/payments
   Body: { classId, tierId, card }
   Response: { success, payment, error? }
   ```

5. Add error handling and logging

## Todo

- [x] Create src/lib/types/payment.types.ts
- [x] PaymentService interface
- [x] CreatePaymentPayload type
- [x] CardDetails type
- [x] PaymentResult type
- [x] Create src/lib/validations/payment.ts
- [x] cardSchema
- [x] tierPurchaseRequestSchema
- [x] Create src/lib/services/payment.ts
- [x] MockPaymentService.createPayment()
- [x] MockPaymentService.processPayment()
- [x] MockPaymentService.getOutcome()
- [x] Create src/app/api/payments/route.ts
- [x] POST handler
- [x] Auth check
- [x] Error responses

## Success Criteria

- [x] 4111 card returns success
- [x] 4000 card returns failure
- [x] Payment record created with tierId in metadata
- [x] Status updated to completed/failed
- [x] tier_purchases record created on success (via trigger)

## Review Findings

**Status**: ✅ APPROVED for Phase 03

**Medium Priority Improvements**:
1. Add duplicate purchase check in API route
2. Enhance card expiry validation (reject year >10 years future)

**Low Priority**:
- Add JSDoc to helper functions
- Consider pagination for payment history API

See full review: [code-reviewer-251226-phase02-payment-service.md](../reports/code-reviewer-251226-phase02-payment-service.md)

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Card validation bypass | LOW | MED | Server validation |
| Trigger failure | LOW | HIGH | Error logging |
| Race conditions | LOW | LOW | DB transactions |

## Security Considerations

- Validate all input server-side
- Never log full card numbers
- Check user authentication
- Validate tier belongs to class

## Next Steps

After completion: Proceed to Phase 03 (Checkout Flow)
