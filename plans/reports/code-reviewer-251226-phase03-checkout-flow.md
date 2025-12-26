# Code Review: Phase 03 - Checkout Flow Implementation

**Date:** 2025-12-26
**Scope:** Checkout flow components and API endpoints
**Reviewed Files:**
1. `src/components/checkout/TierCard.tsx`
2. `src/components/checkout/TestCardHints.tsx`
3. `src/components/checkout/PaymentForm.tsx`
4. `src/components/checkout/TierPurchaseModal.tsx`
5. `src/app/api/tiers/[classId]/route.ts`
6. `src/app/api/payments/route.ts` (supporting file)
7. `src/lib/services/payment.ts` (supporting file)
8. Type definitions & validation schemas

---

## Overall Assessment

**Status: READY WITH MINOR ISSUES**

The Phase 03 checkout flow is well-architected with solid component separation, proper type safety, and comprehensive error handling. The implementation follows React best practices and maintains consistency with the project's patterns. Two minor issues require attention before deployment.

---

## Critical Issues

**NONE** - No security vulnerabilities or breaking issues detected.

---

## High Priority Findings

### 1. **PaymentForm Expiry Field Missing Form Field Wrapper**
**Location:** `src/components/checkout/PaymentForm.tsx` lines 122-137
**Severity:** HIGH (Form consistency & validation display)

**Issue:** The expiry date input is wrapped in a raw `FormItem` rather than `FormField` component, breaking the form-context pattern used for other fields. This causes the expiry field to not integrate with react-hook-form properly.

```tsx
// CURRENT (lines 122-137) - INCORRECT
<FormItem>
  <FormLabel>Ngày hết hạn</FormLabel>
  <FormControl>
    <Input
      placeholder="MM/YY"
      maxLength={5}
      onChange={handleExpiryChange}
      disabled={isLoading}
    />
  </FormControl>
```

**Problem:**
- The `handleExpiryChange` callback manually updates form state via `form.setValue()` instead of using field prop binding
- No connection to form context for proper validation state management
- Input value not synchronized with form state on component mount

**Fix:** Use `FormField` with proper field binding:

```tsx
<FormField
  control={form.control}
  name="expMonth"
  render={({ field: monthField }) => (
    <FormField
      control={form.control}
      name="expYear"
      render={({ field: yearField }) => (
        <FormItem>
          <FormLabel>Ngày hết hạn</FormLabel>
          <FormControl>
            <Input
              placeholder="MM/YY"
              maxLength={5}
              onChange={(e) => {
                const formatted = formatExpiryInput(e.target.value)
                const [month, year] = formatted.split('/')
                monthField.onChange(month || '')
                yearField.onChange(year || '')
                e.target.value = formatted
              }}
              disabled={isLoading}
            />
          </FormControl>
          {(form.formState.errors.expMonth || form.formState.errors.expYear) && (
            <p className="text-sm font-medium text-destructive">
              {form.formState.errors.expMonth?.message || form.formState.errors.expYear?.message}
            </p>
          )}
        </FormItem>
      )}
    />
  )}
/>
```

---

### 2. **Missing Card Expiration Validation on Client Side**
**Location:** `src/components/checkout/PaymentForm.tsx`
**Severity:** HIGH (Data validation)

**Issue:** The form validation doesn't use `isCardExpired()` and `isCardExpiryTooFar()` helper functions available in the validation schema. These checks only happen server-side, missing UX feedback opportunity.

**Problem:**
- Users won't know their card is expired/invalid until after submission
- Server-side validation is too late for good UX
- Utility functions exist but are unused in the component

**Fix:** Add refined Zod schema with custom validation:

```tsx
// In src/lib/validations/payment.ts, extend the schema:
export const cardDetailsSchema = z.object({
  number: cardNumberSchema,
  expMonth: expMonthSchema,
  expYear: expYearSchema,
  cvv: cvvSchema,
}).refine(
  ({ expMonth, expYear }) => !isCardExpired(expMonth, expYear),
  {
    message: 'Thẻ đã hết hạn',
    path: ['expMonth'],
  }
).refine(
  ({ expYear }) => !isCardExpiryTooFar(expYear),
  {
    message: 'Ngày hết hạn quá xa trong tương lai',
    path: ['expYear'],
  }
)
```

---

## Medium Priority Improvements

### 3. **TierCard Downgrade Logic Edge Case**
**Location:** `src/components/checkout/TierCard.tsx` lines 40-41, 50, 98-101
**Severity:** MEDIUM (Logic correctness)

**Issue:** Downgrade prevention logic assumes `currentTierLevel` is always defined when user owns a tier, but type allows `undefined`.

```tsx
// Line 40-41
const isDowngrade = currentTierLevel !== undefined && tier.tier_level < currentTierLevel

// Line 50 - onClick disabled but not enforced visually
isDowngrade && 'opacity-50 cursor-not-allowed'

// Line 98-101 - Button disabled when downgrade
```

**Problem:**
- If user owns a tier but `currentTierLevel` is undefined, downgrade logic won't trigger
- opacity-50 on disabled buttons is weak UX (poor color contrast)
- No aria-disabled attribute for accessibility

**Recommendation:** Add safety check and improve disabled button styling:

```tsx
const isDowngrade = currentTierLevel !== undefined && tier.tier_level < currentTierLevel
const canSelect = !isOwned && !isDowngrade

return (
  <Card
    className={cn(
      'relative cursor-pointer transition-all hover:shadow-md',
      isSelected && 'ring-2 ring-primary border-primary',
      isOwned && 'border-green-500 bg-green-50',
      isHighlighted && !isOwned && 'border-amber-500',
      !canSelect && 'opacity-60 cursor-not-allowed pointer-events-none' // Improved styling
    )}
    onClick={() => canSelect && onSelect(tier)}
    role="button"
    aria-disabled={!canSelect}
  >
```

---

### 4. **TierPurchaseModal Missing Loading State for Close Button**
**Location:** `src/components/checkout/TierPurchaseModal.tsx` line 184
**Severity:** MEDIUM (UX edge case)

**Issue:** Back button on payment step has `disabled={isProcessing}` but doesn't provide visual feedback to user.

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleBack}
  disabled={isProcessing}
>
```

**Problem:**
- Ghost button variant has minimal visual difference when disabled
- User may not realize button is disabled during payment processing
- Inconsistent with main submit button which shows loading spinner

**Fix:** Add loading indicator:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleBack}
  disabled={isProcessing}
  className={isProcessing ? 'opacity-50' : ''}
>
  {isProcessing ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Xử lý...
    </>
  ) : (
    <>
      <ArrowLeft className="w-4 h-4 mr-2" />
      Quay lại
    </>
  )}
</Button>
```

---

### 5. **TestCardHints Copy Feedback Timing**
**Location:** `src/components/checkout/TestCardHints.tsx` lines 36-44
**Severity:** MEDIUM (UX polish)

**Issue:** Copy feedback resets after 2 seconds, but if user copies multiple cards in quick succession, state gets out of sync.

```tsx
const copyToClipboard = async (number: string) => {
  try {
    await navigator.clipboard.writeText(number)
    setCopiedCard(number)
    setTimeout(() => setCopiedCard(null), 2000) // Can create race condition
```

**Problem:**
- If user clicks two cards within 2 seconds, timers can interfere
- Second card's feedback may reset the first card's timeout

**Fix:** Use ref to track and clear timers properly:

```tsx
const [copiedCard, setCopiedCard] = useState<string | null>(null)
const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

const copyToClipboard = async (number: string) => {
  try {
    await navigator.clipboard.writeText(number)
    setCopiedCard(number)

    // Clear existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }

    // Set new timeout
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedCard(null)
      copyTimeoutRef.current = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
  }
}, [])
```

---

## Low Priority Suggestions

### 6. **Duplicate formatVND Function**
**Location:** `TierCard.tsx` (lines 19-26) & `PaymentForm.tsx` (lines 26-33)
**Severity:** LOW (Code duplication)

**Recommendation:** Extract to shared utility:
```tsx
// src/lib/utils/formatting.ts
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Then import in both components
import { formatVND } from '@/lib/utils/formatting'
```

---

### 7. **TierPurchaseModal Fetch Error Handling**
**Location:** `src/components/checkout/TierPurchaseModal.tsx` lines 56-69
**Severity:** LOW (Robustness)

**Issue:** Network error logs to console but could be more informative:

```tsx
const fetchTiers = async () => {
  setIsLoading(true)
  try {
    const response = await fetch(`/api/tiers/${classId}`)
    if (!response.ok) throw new Error('Failed to fetch tiers')
    const data = await response.json()
    setTiers(data.tiers || [])
  } catch (err) {
    console.error('Error fetching tiers:', err) // Minimal context
    toast.error('Không thể tải thông tin gói')
  } finally {
    setIsLoading(false)
  }
}
```

**Improvement:** Add response status context:

```tsx
const fetchTiers = async () => {
  setIsLoading(true)
  try {
    const response = await fetch(`/api/tiers/${classId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch tiers: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    setTiers(data.tiers || [])
  } catch (err) {
    console.error('Error fetching tiers:', err)
    toast.error('Không thể tải thông tin gói. Vui lòng thử lại.')
  } finally {
    setIsLoading(false)
  }
}
```

---

### 8. **API Tier GET Endpoint - Missing Tier Ownership Check**
**Location:** `src/app/api/tiers/[classId]/route.ts` lines 12-35
**Severity:** LOW (Information disclosure)

**Issue:** GET endpoint returns all tiers for a class without verifying user is enrolled or authorized to view them.

**Current code:**
```tsx
export async function GET(request: NextRequest, { params }: RouteParams) {
  // No auth check - returns tiers for any authenticated user
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('class_id', classId)
```

**Recommendation:** Add optional membership check (low priority as price is not sensitive, but good practice):

```tsx
// Optional: verify user is class member
const isMember = await isClassMember(user.id, classId)
if (!isMember) {
  return NextResponse.json(
    { error: 'Bạn không có quyền xem thông tin này' },
    { status: 403 }
  )
}
```

Or allow public access but document it clearly as intentional for browsing functionality.

---

## Positive Observations

✓ **Type Safety:** Excellent use of TypeScript. All interfaces properly typed with discriminated unions for modal steps.

✓ **Form Validation:** Comprehensive Zod schema with specific Vietnamese error messages. Regex patterns well-crafted.

✓ **Component Architecture:** Clean separation between tier selection, payment form, and modal orchestration. Single responsibility principle followed.

✓ **Error Handling:** API endpoints include proper try-catch with user-friendly error messages.

✓ **Accessibility:** Icons used appropriately with Lucide React. Dialog component uses proper semantic structure.

✓ **API Design:** POST /api/payments and GET/PUT /api/tiers endpoints follow REST conventions with clear documentation.

✓ **Security:** No sensitive data exposure. Card details properly validated. Test card numbers documented clearly.

✓ **State Management:** Modal state machine (select → payment → success/error) is clear and prevents invalid transitions.

---

## Recommended Actions

**Priority 1 (Fix before merge):**
1. Refactor PaymentForm expiry field to use FormField wrapper with proper form context
2. Add client-side card expiration validation using existing utility functions

**Priority 2 (Polish):**
3. Improve TierCard downgrade button styling and accessibility
4. Add visual feedback for back button during payment processing
5. Fix TestCardHints copy feedback race condition with useRef cleanup

**Priority 3 (Maintenance):**
6. Extract formatVND to shared utility file
7. Improve fetchTiers error logging with status codes
8. Document GET /api/tiers endpoint access policy (is public access intentional?)

---

## Code Quality Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| Type Coverage | ✓ Excellent | All components properly typed, discriminated unions used |
| Error Handling | ✓ Good | Comprehensive try-catch, user-friendly messages |
| Component Reusability | ✓ Good | Clean component boundaries, composable |
| Form Handling | ⚠ Minor Issue | Expiry field needs FormField refactor |
| Accessibility | ✓ Good | Proper semantic HTML, icon usage, ARIA attributes where needed |
| Code Duplication | ⚠ Low | formatVND duplicated (trivial impact) |
| API Security | ✓ Good | Auth checks on mutations, test data isolated |
| Testing | ⓘ Unknown | No test files provided for review |

---

## Unresolved Questions

1. **Test Coverage:** Are unit/integration tests planned for the checkout flow? Recommend testing card validation, payment success/failure paths, and tier upgrade restrictions.

2. **Payment Persistence:** When payment fails, does the pending payment record get cleaned up? Should there be a background job to mark very old pending payments as abandoned?

3. **Concurrent Purchases:** If user submits payment twice quickly, what happens? Need idempotency check or debounce.

4. **GET /api/tiers Public Access:** Is it intentional that any authenticated user can fetch any class's tier pricing? Should only class members or teachers see this?

---

## Summary

The Phase 03 checkout flow implementation is **production-ready with minor refinements**. The architecture is sound, type safety is excellent, and error handling is comprehensive. Two form validation issues need fixing before deployment, and three UX improvements are recommended for polish. The supporting payment service is well-designed with proper mock implementation for development.

**Approval Status:** ✓ Conditional Approval - Fix High Priority items #1-2, then ready for merge.
