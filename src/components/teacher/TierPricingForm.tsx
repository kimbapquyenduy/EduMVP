'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Settings, Loader2, Check, Star, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionTier } from '@/lib/types/database.types'

interface TierPricingFormProps {
  classId: string
}

const tierPricingSchema = z.object({
  tier1: z.number().min(0, 'Giá không được âm'),
  tier2: z.number().min(0, 'Giá không được âm'),
  tier3: z.number().min(0, 'Giá không được âm'),
})

type TierPricingInput = z.infer<typeof tierPricingSchema>

const tierInfo = [
  { level: 1, name: 'Cơ bản', icon: Star, color: 'text-blue-600', lessonCount: 5 },
  { level: 2, name: 'Tiêu chuẩn', icon: Sparkles, color: 'text-purple-600', lessonCount: 10 },
  { level: 3, name: 'Trọn bộ', icon: Crown, color: 'text-amber-600', lessonCount: null },
]

function formatPriceInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits ? parseInt(digits, 10).toLocaleString('vi-VN') : ''
}

function parsePriceInput(value: string): number {
  return parseInt(value.replace(/\D/g, '') || '0', 10)
}

export function TierPricingForm({ classId }: TierPricingFormProps) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<TierPricingInput>({
    resolver: zodResolver(tierPricingSchema),
    defaultValues: { tier1: 0, tier2: 0, tier3: 0 },
  })

  useEffect(() => {
    fetchTiers()
  }, [classId])

  const fetchTiers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tiers/${classId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      setTiers(data.tiers || [])

      // Set form values
      const tierMap = (data.tiers || []).reduce(
        (acc: Record<string, number>, tier: SubscriptionTier) => {
          acc[`tier${tier.tier_level}`] = tier.price
          return acc
        },
        {}
      )
      form.reset({
        tier1: tierMap.tier1 || 0,
        tier2: tierMap.tier2 || 0,
        tier3: tierMap.tier3 || 0,
      })
    } catch (err) {
      console.error('Error fetching tiers:', err)
      toast.error('Không thể tải thông tin gói')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (data: TierPricingInput) => {
    setIsSaving(true)
    try {
      const tiersUpdate = tiers.map((tier) => ({
        id: tier.id,
        price: data[`tier${tier.tier_level}` as keyof TierPricingInput],
      }))

      const response = await fetch(`/api/tiers/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: tiersUpdate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tiers')
      }

      const result = await response.json()
      setTiers(result.tiers || [])
      toast.success('Đã cập nhật giá gói')
    } catch (err) {
      console.error('Error saving tiers:', err)
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật giá')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cài đặt giá gói
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Cài đặt giá gói
        </CardTitle>
        <CardDescription>
          Đặt giá cho mỗi gói học. Học viên sẽ mua gói để mở khóa thêm bài học.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {tierInfo.map((info) => {
            const Icon = info.icon
            const fieldName = `tier${info.level}` as keyof TierPricingInput
            const lessonText = info.lessonCount === null
              ? 'Tất cả bài học'
              : `${info.lessonCount} bài học`

            return (
              <div key={info.level} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${info.color}`} />
                  <Label className="font-medium">{info.name}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {lessonText}
                  </Badge>
                </div>
                <div className="relative">
                  <Input
                    placeholder="0"
                    value={formatPriceInput(String(form.watch(fieldName) || ''))}
                    onChange={(e) => {
                      const value = parsePriceInput(e.target.value)
                      form.setValue(fieldName, value)
                    }}
                    disabled={isSaving}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₫
                  </span>
                </div>
                {form.formState.errors[fieldName] && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors[fieldName]?.message}
                  </p>
                )}
              </div>
            )
          })}

          <Button type="submit" disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
