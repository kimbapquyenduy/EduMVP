'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  defaultDescription: string
}

const tierConfigs: TierConfig[] = [
  { level: 0, icon: Gift, color: 'text-gray-600', defaultName: 'Miễn phí', defaultDescription: 'Truy cập nội dung miễn phí' },
  { level: 1, icon: Star, color: 'text-blue-600', defaultName: 'Cơ bản', defaultDescription: 'Mở khóa nội dung cơ bản' },
  { level: 2, icon: Sparkles, color: 'text-purple-600', defaultName: 'Tiêu chuẩn', defaultDescription: 'Mở khóa nội dung tiêu chuẩn' },
  { level: 3, icon: Crown, color: 'text-amber-600', defaultName: 'Trọn bộ', defaultDescription: 'Truy cập toàn bộ nội dung' },
]

interface TierFormData {
  id: string
  tier_level: number
  name: string
  description: string
  price: number
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
          description: t.description || '',
          price: t.price,
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

  const updateTier = (level: number, field: keyof TierFormData, value: number | string | boolean) => {
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
            name: t.name,
            description: t.description || null,
            price: t.price,
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
          Đặt tên, mô tả và giá cho mỗi gói. Học viên mua gói cao hơn sẽ mở khóa tất cả nội dung từ gói thấp hơn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {tierConfigs.map((config) => {
            const tier = tiers.find((t) => t.tier_level === config.level)
            if (!tier) return null

            const Icon = config.icon
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
                    <span className="font-medium">Gói {config.level}</span>
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
                      {/* Tier Name */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Tên gói
                        </Label>
                        <Input
                          placeholder={config.defaultName}
                          value={tier.name}
                          onChange={(e) => {
                            updateTier(config.level, 'name', e.target.value)
                          }}
                          disabled={isSaving}
                        />
                      </div>

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
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Mô tả (hiển thị cho học viên)
                      </Label>
                      <Textarea
                        placeholder={config.defaultDescription}
                        value={tier.description}
                        onChange={(e) => {
                          updateTier(config.level, 'description', e.target.value)
                        }}
                        disabled={isSaving}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {isFree
                        ? 'Học viên chưa mua gói sẽ chỉ truy cập được nội dung miễn phí (tier 0)'
                        : `Học viên mua gói này sẽ mở khóa tất cả nội dung từ tier 0 đến tier ${config.level}`}
                    </p>
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
