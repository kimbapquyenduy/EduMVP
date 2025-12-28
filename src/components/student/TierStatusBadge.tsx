'use client'

import { Badge } from '@/components/ui/badge'
import { Crown, Sparkles, Star, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubscriptionTier } from '@/lib/types/database.types'

interface TierStatusBadgeProps {
  tier: SubscriptionTier | null
  className?: string
  showLessonCount?: boolean
  freeTierLessonCount?: number
}

const tierIcons = {
  0: Gift,
  1: Star,
  2: Sparkles,
  3: Crown,
}

const tierColors = {
  0: 'bg-gray-100 text-gray-700 border-gray-200',
  1: 'bg-blue-100 text-blue-700 border-blue-200',
  2: 'bg-purple-100 text-purple-700 border-purple-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
}

export function TierStatusBadge({
  tier,
  className,
  showLessonCount = true,
  freeTierLessonCount = 0,
}: TierStatusBadgeProps) {
  // Handle null tier (user has no purchase, uses free tier defaults)
  if (!tier) {
    return (
      <Badge
        variant="outline"
        className={cn(tierColors[0], className)}
      >
        <Gift className="w-3 h-3 mr-1" />
        Miễn phí
        {showLessonCount && <span className="ml-1">- {freeTierLessonCount} bài</span>}
      </Badge>
    )
  }

  // Handle tier_level = 0 (free tier from database)
  if (tier.tier_level === 0) {
    return (
      <Badge
        variant="outline"
        className={cn(tierColors[0], className)}
      >
        <Gift className="w-3 h-3 mr-1" />
        {tier.name}
        {showLessonCount && <span className="ml-1">- {tier.lesson_unlock_count ?? 0} bài</span>}
      </Badge>
    )
  }

  const Icon = tierIcons[tier.tier_level as 1 | 2 | 3] || Star
  const colors = tierColors[tier.tier_level as 1 | 2 | 3] || tierColors[1]

  const lessonText = tier.lesson_unlock_count === null
    ? 'Tất cả'
    : `${tier.lesson_unlock_count} bài`

  return (
    <Badge
      variant="outline"
      className={cn(colors, className)}
    >
      <Icon className="w-3 h-3 mr-1" />
      {tier.name}
      {showLessonCount && <span className="ml-1">- {lessonText}</span>}
    </Badge>
  )
}
