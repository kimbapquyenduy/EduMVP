import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ classId: string }>
}

/**
 * GET /api/tiers/[classId]
 * Get all tiers for a class
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { classId } = await params
    const supabase = await createClient()

    const { data: tiers, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('class_id', classId)
      .order('tier_level', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch tiers: ${error.message}`)
    }

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Get tiers error:', error)
    return NextResponse.json(
      { error: 'Không thể tải thông tin gói' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tiers/[classId]
 * Update tier prices for a class (teacher only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { classId } = await params
    const supabase = await createClient()

    // Get authenticated user
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

    // Verify user is the teacher of this class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Lớp học không tồn tại' },
        { status: 404 }
      )
    }

    if (classData.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh sửa giá gói' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { tiers } = body as {
      tiers: Array<{ id: string; price: number }>
    }

    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      )
    }

    // Validate prices
    for (const tier of tiers) {
      if (typeof tier.price !== 'number' || tier.price < 0) {
        return NextResponse.json(
          { error: 'Giá phải là số không âm' },
          { status: 400 }
        )
      }
    }

    // Update each tier
    for (const tier of tiers) {
      const { error: updateError } = await supabase
        .from('subscription_tiers')
        .update({ price: tier.price })
        .eq('id', tier.id)
        .eq('class_id', classId) // Extra safety check

      if (updateError) {
        throw new Error(`Failed to update tier: ${updateError.message}`)
      }
    }

    // Fetch updated tiers
    const { data: updatedTiers, error: fetchError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('class_id', classId)
      .order('tier_level', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch updated tiers: ${fetchError.message}`)
    }

    return NextResponse.json({ tiers: updatedTiers })
  } catch (error) {
    console.error('Update tiers error:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật giá gói' },
      { status: 500 }
    )
  }
}
