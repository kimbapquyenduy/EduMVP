import { createClient } from '@/lib/supabase/server'
import { Payment } from '@/lib/types/database.types'
import {
  PaymentService,
  CreatePaymentPayload,
  CardDetails,
  PaymentResult,
} from '@/lib/types/payment.types'
import {
  cardDetailsSchema,
  isCardExpired,
  isCardExpiryTooFar,
  getCardLastFour,
} from '@/lib/validations/payment'

// ============================================
// MOCK PAYMENT SERVICE
// ============================================

/**
 * Mock payment service for development/testing.
 * Uses deterministic card prefixes to determine outcomes:
 * - 4111: SUCCESS
 * - 4000: FAILED
 * - Other: SUCCESS (default)
 */
export class MockPaymentService implements PaymentService {
  /**
   * Determine payment outcome based on card prefix
   */
  private getOutcome(cardNumber: string): 'completed' | 'failed' {
    if (cardNumber.startsWith('4111')) return 'completed'
    if (cardNumber.startsWith('4000')) return 'failed'
    return 'completed' // default success
  }

  /**
   * Get error message for failed cards
   */
  private getErrorMessage(cardNumber: string): string | null {
    if (cardNumber.startsWith('4000')) {
      return 'Thẻ bị từ chối. Vui lòng thử thẻ khác.'
    }
    return null
  }

  /**
   * Create a new pending payment record
   */
  async createPayment(payload: CreatePaymentPayload): Promise<Payment> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: payload.userId,
        class_id: payload.classId,
        amount: payload.amount,
        currency: 'VND',
        status: 'pending',
        test_mode: true,
        metadata: {
          tier_id: payload.tierId,
        },
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    return data as Payment
  }

  /**
   * Process a payment with card details
   * Updates status to completed or failed based on card prefix
   */
  async processPayment(
    paymentId: string,
    card: CardDetails
  ): Promise<PaymentResult> {
    const supabase = await createClient()

    // Validate card details
    const cardValidation = cardDetailsSchema.safeParse(card)
    if (!cardValidation.success) {
      // Get payment to return in error
      const payment = await this.getPayment(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }
      return {
        success: false,
        payment,
        error: cardValidation.error.issues[0].message,
      }
    }

    // Check card expiration
    if (isCardExpired(card.expMonth, card.expYear)) {
      const payment = await this.getPayment(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Update payment to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: 'Thẻ đã hết hạn',
        })
        .eq('id', paymentId)

      return {
        success: false,
        payment: { ...payment, status: 'failed', error_message: 'Thẻ đã hết hạn' },
        error: 'Thẻ đã hết hạn',
      }
    }

    // Check card expiry not too far in future
    if (isCardExpiryTooFar(card.expYear)) {
      const payment = await this.getPayment(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Update payment to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: 'Ngày hết hạn thẻ không hợp lệ',
        })
        .eq('id', paymentId)

      return {
        success: false,
        payment: { ...payment, status: 'failed', error_message: 'Ngày hết hạn thẻ không hợp lệ' },
        error: 'Ngày hết hạn thẻ không hợp lệ',
      }
    }

    // Determine outcome
    const outcome = this.getOutcome(card.number)
    const errorMessage = this.getErrorMessage(card.number)

    // Update payment status
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: outcome,
        card_last_four: getCardLastFour(card.number),
        error_message: errorMessage,
        completed_at: outcome === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to process payment: ${error.message}`)
    }

    const payment = data as Payment

    return {
      success: outcome === 'completed',
      payment,
      error: errorMessage ?? undefined,
    }
  }

  /**
   * Get a payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payments')
      .select()
      .eq('id', paymentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get payment: ${error.message}`)
    }

    return data as Payment
  }
}

// ============================================
// SERVICE INSTANCE
// ============================================

/**
 * Default payment service instance
 * In production, this could be swapped for a real payment provider
 */
export const paymentService = new MockPaymentService()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get subscription tier by ID
 */
export async function getTierById(tierId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_tiers')
    .select()
    .eq('id', tierId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get tier: ${error.message}`)
  }

  return data
}

/**
 * Get all tiers for a class
 */
export async function getClassTiers(classId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscription_tiers')
    .select()
    .eq('class_id', classId)
    .order('tier_level', { ascending: true })

  if (error) {
    throw new Error(`Failed to get class tiers: ${error.message}`)
  }

  return data
}

/**
 * Get user's tier purchase for a class
 */
export async function getUserTierPurchase(userId: string, classId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tier_purchases')
    .select(`
      *,
      tier:subscription_tiers(*)
    `)
    .eq('user_id', userId)
    .eq('class_id', classId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get tier purchase: ${error.message}`)
  }

  return data
}

/**
 * Check if user is a member of a class
 */
export async function isClassMember(userId: string, classId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .eq('status', 'ACTIVE')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return false
    }
    throw new Error(`Failed to check membership: ${error.message}`)
  }

  return !!data
}
