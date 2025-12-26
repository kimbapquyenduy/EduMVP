import { z } from 'zod'

// ============================================
// CARD VALIDATION SCHEMAS
// ============================================

/**
 * Card number validation
 * - Must be exactly 16 digits
 * - Only numeric characters
 */
export const cardNumberSchema = z
  .string()
  .length(16, 'Số thẻ phải có 16 chữ số')
  .regex(/^\d+$/, 'Số thẻ chỉ được chứa chữ số')

/**
 * Expiration month validation
 * - Must be MM format (01-12)
 */
export const expMonthSchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])$/, 'Tháng không hợp lệ (01-12)')

/**
 * Expiration year validation
 * - Must be YY format (2 digits)
 */
export const expYearSchema = z
  .string()
  .length(2, 'Năm phải có 2 chữ số')
  .regex(/^\d{2}$/, 'Năm chỉ được chứa chữ số')

/**
 * CVV validation
 * - Must be 3-4 digits
 */
export const cvvSchema = z
  .string()
  .min(3, 'CVV phải có ít nhất 3 chữ số')
  .max(4, 'CVV tối đa 4 chữ số')
  .regex(/^\d+$/, 'CVV chỉ được chứa chữ số')

/**
 * Complete card details schema
 */
export const cardDetailsSchema = z.object({
  number: cardNumberSchema,
  expMonth: expMonthSchema,
  expYear: expYearSchema,
  cvv: cvvSchema,
})

// ============================================
// PAYMENT REQUEST SCHEMAS
// ============================================

/**
 * Tier purchase request schema
 * Used for POST /api/payments
 */
export const tierPurchaseRequestSchema = z.object({
  classId: z.string().uuid('ID lớp học không hợp lệ'),
  tierId: z.string().uuid('ID gói không hợp lệ'),
  card: cardDetailsSchema,
})

/**
 * Get payment request schema
 * Used for GET /api/payments/[id]
 */
export const getPaymentSchema = z.object({
  paymentId: z.string().uuid('ID thanh toán không hợp lệ'),
})

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Maximum years in future for card expiration (10 years)
 */
const MAX_EXPIRY_YEARS = 10

/**
 * Validate card expiration is not in the past
 */
export function isCardExpired(expMonth: string, expYear: string): boolean {
  const now = new Date()
  const currentYear = now.getFullYear() % 100 // Get last 2 digits
  const currentMonth = now.getMonth() + 1 // 1-12

  const cardYear = parseInt(expYear, 10)
  const cardMonth = parseInt(expMonth, 10)

  if (cardYear < currentYear) return true
  if (cardYear === currentYear && cardMonth < currentMonth) return true

  return false
}

/**
 * Validate card expiration year is not too far in future
 */
export function isCardExpiryTooFar(expYear: string): boolean {
  const currentYear = new Date().getFullYear() % 100
  const cardYear = parseInt(expYear, 10)
  const maxYear = (currentYear + MAX_EXPIRY_YEARS) % 100

  // Handle century rollover (e.g., current=99, max=09)
  if (currentYear > 90 && maxYear < 10) {
    return cardYear > maxYear && cardYear < currentYear
  }

  return cardYear > maxYear
}

/**
 * Mask card number for display (show last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 4) return '****'
  return `****${cardNumber.slice(-4)}`
}

/**
 * Extract last 4 digits from card number
 */
export function getCardLastFour(cardNumber: string): string {
  if (cardNumber.length < 4) return ''
  return cardNumber.slice(-4)
}

// ============================================
// TYPE EXPORTS
// ============================================

export type CardDetailsInput = z.infer<typeof cardDetailsSchema>
export type TierPurchaseRequestInput = z.infer<typeof tierPurchaseRequestSchema>
