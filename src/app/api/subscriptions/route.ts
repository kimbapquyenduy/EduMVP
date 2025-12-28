import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/lib/services/payment'
import { tierPurchaseRequestSchema } from '@/lib/validations/payment'
import { z } from 'zod'

// Subscription request schema
const subscriptionRequestSchema = z.object({
  classId: z.string().uuid('ID lớp học không hợp lệ'),
  card: z.object({
    number: z.string().length(16),
    expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expYear: z.string().length(2),
    cvv: z.string().min(3).max(4),
  }),
})

/**
 * POST /api/subscriptions
 * Subscribe to a class (pay monthly fee)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để tiếp tục' },
        { status: 401 }
      )
    }

    // Parse request
    const body = await request.json()
    const validation = subscriptionRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { classId, card } = validation.data

    // Get class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, subscription_price, teacher_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { success: false, error: 'Lớp học không tồn tại' },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: 'Bạn đã là thành viên của lớp này' },
        { status: 400 }
      )
    }

    // Check if class is free
    if (classData.subscription_price === 0) {
      // Free class - just create membership
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .insert({
          class_id: classId,
          user_id: user.id,
          status: 'ACTIVE',
        })
        .select()
        .single()

      if (membershipError) {
        throw new Error(`Failed to create membership: ${membershipError.message}`)
      }

      return NextResponse.json({
        success: true,
        membership,
        isFree: true,
      })
    }

    // Paid class - process payment first
    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        class_id: classId,
        amount: classData.subscription_price,
        currency: 'VND',
        status: 'pending',
        test_mode: true,
        metadata: { type: 'subscription' },
      })
      .select()
      .single()

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`)
    }

    // Process payment with mock service
    const result = await paymentService.processPayment(payment.id, card)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Thanh toán thất bại' },
        { status: 400 }
      )
    }

    // Payment successful - create membership and subscription
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1) // 1 month subscription

    // Create membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        class_id: classId,
        user_id: user.id,
        status: 'ACTIVE',
        subscription_paid: true,
        subscription_expires_at: expiresAt.toISOString(),
        last_payment_id: payment.id,
      })
      .select()
      .single()

    if (membershipError) {
      throw new Error(`Failed to create membership: ${membershipError.message}`)
    }

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('class_subscriptions')
      .insert({
        user_id: user.id,
        class_id: classId,
        payment_id: payment.id,
        amount: classData.subscription_price,
        currency: 'VND',
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (subError) {
      console.error('Failed to create subscription record:', subError)
      // Don't fail the request - membership is already created
    }

    return NextResponse.json({
      success: true,
      membership,
      subscription,
      payment: result.payment,
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi khi đăng ký lớp học' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/subscriptions
 * Get user's active subscriptions
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

    const { data: subscriptions, error } = await supabase
      .from('class_subscriptions')
      .select(`
        *,
        class:classes(id, name, subscription_price)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`)
    }

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách đăng ký' },
      { status: 500 }
    )
  }
}
