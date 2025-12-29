'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Gift, Star, Sparkles, Crown, Loader2, Settings } from 'lucide-react'

type TierLevel = 0 | 1 | 2 | 3 | null

interface LessonTierSelectorProps {
  lessonId: string
  currentTier: TierLevel
  onTierChange?: (newTier: TierLevel) => void
  compact?: boolean
}

const TIER_OPTIONS: Array<{
  value: TierLevel
  label: string
  icon: typeof Settings
  color: string
  description: string
}> = [
  {
    value: null,
    label: 'Auto',
    icon: Settings,
    color: 'bg-muted text-muted-foreground',
    description: 'Use default unlock rules',
  },
  {
    value: 0,
    label: 'Free',
    icon: Gift,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Available to all students',
  },
  {
    value: 1,
    label: 'Tier 1',
    icon: Star,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Basic tier required',
  },
  {
    value: 2,
    label: 'Tier 2',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Standard tier required',
  },
  {
    value: 3,
    label: 'Tier 3',
    icon: Crown,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    description: 'Premium tier required',
  },
]

function getTierConfig(tier: TierLevel) {
  return TIER_OPTIONS.find((opt) => opt.value === tier) ?? TIER_OPTIONS[0]
}

export function LessonTierSelector({
  lessonId,
  currentTier,
  onTierChange,
  compact = false,
}: LessonTierSelectorProps) {
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const config = getTierConfig(currentTier)
  const Icon = config.icon

  const handleTierChange = async (newTier: TierLevel) => {
    if (newTier === currentTier) return

    setSaving(true)
    const { error } = await supabase
      .from('lessons')
      .update({ required_tier_level: newTier })
      .eq('id', lessonId)

    if (!error) {
      onTierChange?.(newTier)
    }
    setSaving(false)
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-xs ${config.color}`}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {TIER_OPTIONS.map((option) => {
            const TierIcon = option.icon
            const isSelected = currentTier === option.value

            return (
              <DropdownMenuItem
                key={String(option.value)}
                onClick={() => handleTierChange(option.value)}
                className={isSelected ? 'bg-muted' : ''}
              >
                <TierIcon className="h-4 w-4 mr-2" />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          variant="secondary"
          className={`cursor-pointer hover:opacity-80 transition-opacity ${config.color}`}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Icon className="h-3 w-3 mr-1" />
          )}
          {config.label}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {TIER_OPTIONS.map((option) => {
          const TierIcon = option.icon
          const isSelected = currentTier === option.value

          return (
            <DropdownMenuItem
              key={String(option.value)}
              onClick={() => handleTierChange(option.value)}
              className={isSelected ? 'bg-muted' : ''}
            >
              <TierIcon className="h-4 w-4 mr-2" />
              <div className="flex-1">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export tier badge for read-only display
export function TierBadge({ tier }: { tier: TierLevel }) {
  const config = getTierConfig(tier)
  const Icon = config.icon

  return (
    <Badge variant="secondary" className={config.color}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}
