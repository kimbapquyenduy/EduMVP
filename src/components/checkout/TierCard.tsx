'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Star, Unlock, Gift, Sparkles, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier, TierLevel } from '@/lib/types/database.types'

interface TierCardProps {
  tier: SubscriptionTier
  isSelected: boolean
  isOwned: boolean
  isHighlighted?: boolean
  currentTierLevel?: number
  onSelect: (tier: SubscriptionTier) => void
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const tierIcons: Record<TierLevel, typeof Gift> = {
  0: Gift,
  1: Star,
  2: Sparkles,
  3: Crown,
}

export function TierCard({
  tier,
  isSelected,
  isOwned,
  isHighlighted,
  currentTierLevel,
  onSelect,
}: TierCardProps) {
  const isUpgrade = currentTierLevel !== undefined && tier.tier_level > currentTierLevel
  const isDowngrade = currentTierLevel !== undefined && tier.tier_level < currentTierLevel
  const TierIcon = tierIcons[tier.tier_level]

  // Generate access description based on tier level
  const getAccessDescription = () => {
    if (tier.tier_level === 0) return 'Nội dung miễn phí'
    if (tier.tier_level === 3) return 'Truy cập toàn bộ nội dung'
    return `Mở khóa tier 0-${tier.tier_level}`
  }

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary',
        isOwned && 'border-green-500 bg-green-50',
        isHighlighted && !isOwned && 'border-amber-500',
        isDowngrade && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => !isOwned && !isDowngrade && onSelect(tier)}
    >
      {isHighlighted && !isOwned && (
        <Badge
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white"
        >
          <Star className="w-3 h-3 mr-1" />
          Phổ biến nhất
        </Badge>
      )}

      {isOwned && (
        <Badge
          className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white"
        >
          <Check className="w-3 h-3 mr-1" />
          Đang sở hữu
        </Badge>
      )}

      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-2">
          <TierIcon className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-lg">{tier.name}</CardTitle>
        {tier.description && (
          <CardDescription className="text-sm">
            {tier.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="text-center space-y-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-primary">
            {tier.price === 0 ? 'Miễn phí' : formatVND(tier.price)}
          </p>
          {tier.price > 0 && (
            <p className="text-sm text-muted-foreground">Thanh toán một lần</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <Unlock className="w-4 h-4 text-green-500" />
          <span>{getAccessDescription()}</span>
        </div>

        {isOwned ? (
          <Button variant="outline" disabled className="w-full">
            <Check className="w-4 h-4 mr-2" />
            Đã mua
          </Button>
        ) : isDowngrade ? (
          <Button variant="outline" disabled className="w-full">
            Không thể hạ cấp
          </Button>
        ) : (
          <Button
            variant={isSelected ? 'default' : 'outline'}
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(tier)
            }}
          >
            {isUpgrade ? 'Nâng cấp' : 'Chọn gói này'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
