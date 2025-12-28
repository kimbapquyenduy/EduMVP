'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Loader2, Check, Gift, Star, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionTier } from '@/lib/types/database.types'
import { LucideIcon } from 'lucide-react'

interface TierPricingFormProps {
  classId: string
}

interface TierConfig {
  level: number
  icon: LucideIcon
  color: string
  defaultName: string
}

const tierConfigs: TierConfig[] = [
  { level: 0, icon: Gift, color: 'text-gray-600', defaultName: 'Miễn phí' },
  { level: 1, icon: Star, color: 'text-blue-600', defaultName: 'Cơ bản' },
  { level: 2, icon: Sparkles, color: 'text-purple-600', defaultName: 'Tiêu chuẩn' },
  { level: 3, icon: Crown, color: 'text-amber-600', defaultName: 'Trọn bộ' },
]

interface TierFormData {
  id: string
  tier_level: number
  name: string
  price: number
  lesson_unlock_count: number | null
  is_enabled: boolean
}

function formatNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits ? parseInt(digits, 10).toLocaleString('vi-VN') : ''
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/\D/g, '') || '0', 10)
}

export function TierPricingForm({ classId }: TierPricingFormProps) {
  const [tiers, setTiers] = useState<TierFormData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchTiers()
  }, [classId])

  const fetchTiers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tiers/${classId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      setTiers(
        (data.tiers || []).map((t: SubscriptionTier) => ({
          id: t.id,
          tier_level: t.tier_level,
          name: t.name,
          price: t.price,
          lesson_unlock_count: t.lesson_unlock_count,
          is_enabled: t.is_enabled ?? true,
        }))
      )
    } catch (err) {
      console.error('Error fetching tiers:', err)
      toast.error('Không thể tải thông tin gói')
    } finally {
      setIsLoading(false)
    }
  }

  const updateTier = (level: number, field: keyof TierFormData, value: number | string | boolean | null) => {
    setTiers((prev) =>
      prev.map((t) => (t.tier_level === level ? { ...t, [field]: value } : t))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const response = await fetch(`/api/tiers/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: tiers.map((t) => ({
            id: t.id,
            price: t.price,
            lesson_unlock_count: t.lesson_unlock_count,
            is_enabled: t.is_enabled,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tiers')
      }

      toast.success('Đã cập nhật cài đặt gói')
    } catch (err) {
      console.error('Error saving tiers:', err)
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật')
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
            Cài đặt gói học
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
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
          Cài đặt gói học
        </CardTitle>
        <CardDescription>
          Đặt giá và số bài học mở khóa cho mỗi gói. Học viên mua gói để mở khóa bài học.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {tierConfigs.map((config) => {
            const tier = tiers.find((t) => t.tier_level === config.level)
            if (!tier) return null

            const Icon = config.icon
            const isUnlimited = tier.lesson_unlock_count === null
            const isFree = config.level === 0
            const isEnabled = tier.is_enabled
            const isDisabledTier = !isFree && !isEnabled

            return (
              <div
                key={config.level}
                className={`p-4 rounded-lg border space-y-3 transition-opacity ${
                  isDisabledTier ? 'bg-muted/10 opacity-60' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="font-medium">{tier.name}</span>
                    {isFree && (
                      <Badge variant="secondary" className="text-xs">
                        Mặc định
                      </Badge>
                    )}
                    {isDisabledTier && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Đã tắt
                      </Badge>
                    )}
                  </div>
                  {!isFree && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Kích hoạt
                      </Label>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          updateTier(config.level, 'is_enabled', checked)
                        }}
                        disabled={isSaving}
                      />
                    </div>
                  )}
                </div>

                {(isFree || isEnabled) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Price */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Giá (VND)
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="0"
                            value={formatNumber(String(tier.price || ''))}
                            onChange={(e) => {
                              updateTier(config.level, 'price', parseNumber(e.target.value))
                            }}
                            disabled={isSaving || isFree}
                            className={isFree ? 'bg-muted' : ''}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            ₫
                          </span>
                        </div>
                      </div>

                      {/* Lesson Count */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Số bài mở khóa
                        </Label>
                        {config.level === 3 ? (
                          <div className="flex items-center gap-2 h-9">
                            <Switch
                              checked={isUnlimited}
                              onCheckedChange={(checked) => {
                                updateTier(config.level, 'lesson_unlock_count', checked ? null : 10)
                              }}
                              disabled={isSaving}
                            />
                            <span className="text-sm">
                              {isUnlimited ? 'Tất cả bài học' : 'Giới hạn'}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={tier.lesson_unlock_count ?? 0}
                            onChange={(e) => {
                              updateTier(
                                config.level,
                                'lesson_unlock_count',
                                parseInt(e.target.value) || 0
                              )
                            }}
                            disabled={isSaving}
                          />
                        )}
                      </div>
                    </div>

                    {!isFree && !isUnlimited && tier.lesson_unlock_count !== null && (
                      <p className="text-xs text-muted-foreground">
                        Học viên mua gói này sẽ mở khóa {tier.lesson_unlock_count} bài học đầu tiên
                      </p>
                    )}
                    {isFree && (
                      <p className="text-xs text-muted-foreground">
                        Học viên chưa mua gói sẽ có {tier.lesson_unlock_count ?? 0} bài học miễn phí
                      </p>
                    )}
                    {isUnlimited && (
                      <p className="text-xs text-muted-foreground">
                        Học viên mua gói này sẽ mở khóa tất cả bài học trong lớp
                      </p>
                    )}
                  </>
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
