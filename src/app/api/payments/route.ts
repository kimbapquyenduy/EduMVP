import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  paymentService,
  getTierById,
  isClassMember,
  getUserTierPurchase,
} from '@/lib/services/payment'
import { tierPurchaseRequestSchema } from '@/lib/validations/payment'
import { ProcessPaymentResponse } from '@/lib/types/payment.types'

/**
 * POST /api/payments
 * Process a tier purchase payment
 *
 * Request body:
 * - classId: UUID of the class
 * - tierId: UUID of the tier to purchase
 * - card: { number, expMonth, expYear, cvv }
 *
 * Response:
 * - success: boolean
 * - payment: Payment record
 * - purchase: TierPurchase record (if successful)
 * - error: string (if failed)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json<ProcessPaymentResponse>(
        { success: false, error: 'Vui lòng đăng nhập để tiếp tục' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = tierPurchaseRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<ProcessPaymentResponse>(
        {
          success: false,
          error: validation.error.issues[0].message,
        },
        { status: 400 }
      )
    }

    const { classId, tierId, card } = validation.data

    // Verify user is a member of the class
    const isMember = await isClassMember(user.id, classId)
    if (!isMember) {
      return NextResponse.json<ProcessPaymentResponse>(
        {
          success: false,
          error: 'Bạn cần tham gia lớp học trước khi mua gói',
        },
        { status: 403 }
      )
    }

    // Get tier details and verify it belongs to the class
    const tier = await getTierById(tierId)
    if (!tier) {
      return NextResponse.json<ProcessPaymentResponse>(
        { success: false, error: 'Gói không tồn tại' },
        { status: 404 }
      )
    }

    if (tier.class_id !== classId) {
      return NextResponse.json<ProcessPaymentResponse>(
        { success: false, error: 'Gói không thuộc lớp học này' },
        { status: 400 }
      )
    }

    // Check for existing tier purchase
    const existingPurchase = await getUserTierPurchase(user.id, classId)
    if (existingPurchase) {
      const existingTierLevel = existingPurchase.tier?.tier_level ?? 0
      const newTierLevel = tier.tier_level

      // Already has same or higher tier
      if (existingTierLevel >= newTierLevel) {
        return NextResponse.json<ProcessPaymentResponse>(
          {
            success: false,
            error: existingTierLevel === newTierLevel
              ? 'Bạn đã sở hữu gói này'
              : 'Bạn đã sở hữu gói cao hơn',
          },
          { status: 400 }
        )
      }
      // Upgrading to higher tier is allowed - proceed with payment
    }

    // Create payment record
    const payment = await paymentService.createPayment({
      userId: user.id,
      classId,
      tierId,
      amount: tier.price,
    })

    // Process payment
    const result = await paymentService.processPayment(payment.id, card)

    if (!result.success) {
      return NextResponse.json<ProcessPaymentResponse>(
        {
          success: false,
          payment: result.payment,
          error: result.error,
        },
        { status: 400 }
      )
    }

    // Fetch the tier purchase (created by trigger)
    const { data: purchase } = await supabase
      .from('tier_purchases')
      .select()
      .eq('payment_id', result.payment.id)
      .single()

    return NextResponse.json<ProcessPaymentResponse>({
      success: true,
      payment: result.payment,
      purchase: purchase ?? undefined,
    })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json<ProcessPaymentResponse>(
      {
        success: false,
        error: 'Đã xảy ra lỗi khi xử lý thanh toán',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments
 * Get user's payment history
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để tiếp tục' },
        { status: 401 }
      )
    }

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        class:classes(id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy lịch sử thanh toán' },
      { status: 500 }
    )
  }
}
