// ============================================
// PAYMENT SERVICE TYPES
// ============================================

import { Payment, SubscriptionTier, TierPurchase } from './database.types'

// ============================================
// SERVICE INTERFACES
// ============================================

/**
 * Abstract payment service interface.
 * Enables future migration to real payment providers (Stripe, etc.)
 */
export interface PaymentService {
  createPayment(payload: CreatePaymentPayload): Promise<Payment>
  processPayment(paymentId: string, card: CardDetails): Promise<PaymentResult>
  getPayment(paymentId: string): Promise<Payment | null>
}

// ============================================
// PAYLOAD TYPES
// ============================================

export interface CreatePaymentPayload {
  userId: string
  classId: string
  tierId: string
  amount: number // VND integer
}

export interface CardDetails {
  number: string    // 16 digits
  expMonth: string  // MM (01-12)
  expYear: string   // YY (2 digits)
  cvv: string       // 3-4 digits
}

// ============================================
// RESULT TYPES
// ============================================

export interface PaymentResult {
  success: boolean
  payment: Payment
  error?: string
}

export interface TierPurchaseResult {
  success: boolean
  purchase?: TierPurchase
  payment?: Payment
  error?: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface ProcessPaymentRequest {
  classId: string
  tierId: string
  card: CardDetails
}

export interface ProcessPaymentResponse {
  success: boolean
  payment?: Payment
  purchase?: TierPurchase
  error?: string
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Test card numbers for MockPaymentService
 * - Cards starting with 4111: SUCCESS
 * - Cards starting with 4000: FAILED
 * - Any other valid 16-digit: SUCCESS (default)
 */
export const TEST_CARDS = {
  SUCCESS: '4111111111111111',
  DECLINED: '4000000000000002',
} as const

/**
 * Default tier configuration
 * Used when auto-creating tiers for new classes
 */
export const DEFAULT_TIER_CONFIG = {
  TIER_1: { name: 'Cơ bản', price: 50000, lessonCount: 5 },
  TIER_2: { name: 'Tiêu chuẩn', price: 100000, lessonCount: 10 },
  TIER_3: { name: 'Trọn bộ', price: 200000, lessonCount: null }, // unlimited
} as const

/**
 * Free lesson count for members without tier purchase
 */
export const FREE_LESSON_COUNT = 3
