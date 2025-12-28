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
      console.error('Supabase error fetching tiers:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}`, code: error.code },
        { status: 500 }
      )
    }

    // If no tiers found, it might be an old class without tiers - create them
    if (!tiers || tiers.length === 0) {
      console.warn(`No tiers found for class ${classId}, creating defaults...`)

      // Create default tiers for this class
      const defaultTiers = [
        { class_id: classId, tier_level: 0, name: 'Miễn phí', price: 0, lesson_unlock_count: 0, is_enabled: true },
        { class_id: classId, tier_level: 1, name: 'Cơ bản', price: 50000, lesson_unlock_count: 5, is_enabled: true },
        { class_id: classId, tier_level: 2, name: 'Tiêu chuẩn', price: 100000, lesson_unlock_count: 10, is_enabled: true },
        { class_id: classId, tier_level: 3, name: 'Trọn bộ', price: 200000, lesson_unlock_count: null, is_enabled: true },
      ]

      const { data: createdTiers, error: insertError } = await supabase
        .from('subscription_tiers')
        .insert(defaultTiers)
        .select()

      if (insertError) {
        console.error('Error creating default tiers:', insertError)
        return NextResponse.json({ tiers: [] })
      }

      return NextResponse.json({ tiers: createdTiers })
    }

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Get tiers error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể tải thông tin gói' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tiers/[classId]
 * Update tier settings for a class (teacher only)
 * Supports updating price and lesson_unlock_count
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
        { error: 'Bạn không có quyền chỉnh sửa cài đặt gói' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { tiers } = body as {
      tiers: Array<{
        id: string
        price: number
        lesson_unlock_count: number | null
        is_enabled: boolean
      }>
    }

    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      )
    }

    // Validate tier data
    for (const tier of tiers) {
      if (typeof tier.price !== 'number' || tier.price < 0) {
        return NextResponse.json(
          { error: 'Giá phải là số không âm' },
          { status: 400 }
        )
      }
      if (
        tier.lesson_unlock_count !== null &&
        (typeof tier.lesson_unlock_count !== 'number' || tier.lesson_unlock_count < 0)
      ) {
        return NextResponse.json(
          { error: 'Số bài mở khóa phải là số không âm hoặc null' },
          { status: 400 }
        )
      }
      if (typeof tier.is_enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Trạng thái kích hoạt không hợp lệ' },
          { status: 400 }
        )
      }
    }

    // Update each tier
    for (const tier of tiers) {
      const { error: updateError } = await supabase
        .from('subscription_tiers')
        .update({
          price: tier.price,
          lesson_unlock_count: tier.lesson_unlock_count,
          is_enabled: tier.is_enabled,
        })
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
