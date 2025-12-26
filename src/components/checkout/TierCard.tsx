'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Star, Lock, Unlock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier } from '@/lib/types/database.types'

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

export function TierCard({
  tier,
  isSelected,
  isOwned,
  isHighlighted,
  currentTierLevel,
  onSelect,
}: TierCardProps) {
  const lessonText = tier.lesson_unlock_count === null
    ? 'Tất cả bài học'
    : `${tier.lesson_unlock_count} bài học`

  const isUpgrade = currentTierLevel !== undefined && tier.tier_level > currentTierLevel
  const isDowngrade = currentTierLevel !== undefined && tier.tier_level < currentTierLevel

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
        <CardTitle className="text-lg">{tier.name}</CardTitle>
      </CardHeader>

      <CardContent className="text-center space-y-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-primary">
            {formatVND(tier.price)}
          </p>
          <p className="text-sm text-muted-foreground">Thanh toán một lần</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          {tier.lesson_unlock_count === null ? (
            <Unlock className="w-4 h-4 text-green-500" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
          <span>{lessonText}</span>
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
