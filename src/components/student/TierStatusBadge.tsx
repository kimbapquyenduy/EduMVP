'use client'

import { Badge } from '@/components/ui/badge'
import { Crown, Sparkles, Star, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier, TierLevel } from '@/lib/types/database.types'

interface TierStatusBadgeProps {
  tier: SubscriptionTier | null
  className?: string
  showDescription?: boolean
}

const tierIcons: Record<TierLevel, typeof Gift> = {
  0: Gift,
  1: Star,
  2: Sparkles,
  3: Crown,
}

const tierColors: Record<TierLevel, string> = {
  0: 'bg-gray-100 text-gray-700 border-gray-200',
  1: 'bg-blue-100 text-blue-700 border-blue-200',
  2: 'bg-purple-100 text-purple-700 border-purple-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
}

const defaultTierNames: Record<TierLevel, string> = {
  0: 'Miễn phí',
  1: 'Cơ bản',
  2: 'Tiêu chuẩn',
  3: 'Trọn bộ',
}

export function TierStatusBadge({
  tier,
  className,
  showDescription = false,
}: TierStatusBadgeProps) {
  // Handle null tier (user has no purchase, uses free tier)
  const tierLevel: TierLevel = tier?.tier_level ?? 0
  const tierName = tier?.name || defaultTierNames[tierLevel]
  const Icon = tierIcons[tierLevel]
  const colors = tierColors[tierLevel]

  return (
    <Badge
      variant="outline"
      className={cn(colors, className)}
    >
      <Icon className="w-3 h-3 mr-1" />
      {tierName}
      {showDescription && tier?.description && (
        <span className="ml-1 text-xs opacity-75">- {tier.description}</span>
      )}
    </Badge>
  )
}
