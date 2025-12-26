'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowUp, Lock, Unlock, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TierPurchaseWithTier, canUpgrade } from '@/lib/utils/lesson-access'

interface UnlockPromptProps {
  classId: string
  currentTier: TierPurchaseWithTier | null
  accessibleCount: number
  totalCount: number
  onUpgrade: () => void
  className?: string
}

export function UnlockPrompt({
  currentTier,
  accessibleCount,
  totalCount,
  onUpgrade,
  className,
}: UnlockPromptProps) {
  const percentage = totalCount > 0 ? Math.round((accessibleCount / totalCount) * 100) : 0
  const lockedCount = totalCount - accessibleCount
  const showUpgrade = canUpgrade(currentTier)
  const isFullAccess = accessibleCount >= totalCount

  if (isFullAccess) {
    return (
      <Card className={cn('border-green-200 bg-green-50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-700">Truy cập đầy đủ</p>
              <p className="text-sm text-green-600">
                Bạn có thể xem tất cả {totalCount} bài học
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-amber-200 bg-amber-50', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-700">
                {lockedCount} bài học bị khóa
              </p>
              <p className="text-sm text-amber-600">
                Nâng cấp để mở khóa thêm bài học
              </p>
            </div>
          </div>

          {showUpgrade && (
            <Button
              size="sm"
              onClick={onUpgrade}
              className="gap-1 bg-amber-600 hover:bg-amber-700"
            >
              <ArrowUp className="w-3 h-3" />
              Nâng cấp
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-amber-600">
              <Unlock className="w-3.5 h-3.5" />
              <span>{accessibleCount}/{totalCount} bài học đã mở</span>
            </div>
            <span className="font-medium text-amber-700">{percentage}%</span>
          </div>
          <Progress
            value={percentage}
            className="h-2 [&>div]:bg-amber-500"
          />
        </div>

        {currentTier && (
          <p className="text-xs text-amber-600">
            Gói hiện tại: {currentTier.tier.name}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
