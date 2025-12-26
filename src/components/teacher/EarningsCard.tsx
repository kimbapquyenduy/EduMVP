'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface EarningsCardProps {
  classId: string
}

interface EarningsData {
  totalVnd: number
  purchaseCount: number
  tier1Count: number
  tier2Count: number
  tier3Count: number
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function EarningsCard({ classId }: EarningsCardProps) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEarnings()
  }, [classId])

  const fetchEarnings = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Get completed payments for this class
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          amount,
          tier_purchases!inner (
            tier:subscription_tiers (
              tier_level
            )
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'completed')

      if (error) throw error

      // Calculate totals
      let totalVnd = 0
      let tier1Count = 0
      let tier2Count = 0
      let tier3Count = 0

      for (const payment of payments || []) {
        totalVnd += payment.amount

        // Access nested tier_purchases
        const tierPurchases = payment.tier_purchases as unknown as Array<{
          tier: { tier_level: number } | null
        }>

        if (tierPurchases && tierPurchases.length > 0) {
          const tierLevel = tierPurchases[0]?.tier?.tier_level
          if (tierLevel === 1) tier1Count++
          else if (tierLevel === 2) tier2Count++
          else if (tierLevel === 3) tier3Count++
        }
      }

      setEarnings({
        totalVnd,
        purchaseCount: (payments || []).length,
        tier1Count,
        tier2Count,
        tier3Count,
      })
    } catch (err) {
      console.error('Error fetching earnings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Doanh thu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!earnings) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Doanh thu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-2xl font-bold text-green-600">
            {formatVND(earnings.totalVnd)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{earnings.purchaseCount} học viên đã mua gói</span>
        </div>

        {earnings.purchaseCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {earnings.tier1Count > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Cơ bản: {earnings.tier1Count}
              </Badge>
            )}
            {earnings.tier2Count > 0 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Tiêu chuẩn: {earnings.tier2Count}
              </Badge>
            )}
            {earnings.tier3Count > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                Trọn bộ: {earnings.tier3Count}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
