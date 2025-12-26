'use client'

import { Progress } from '@/components/ui/progress'
import { Unlock, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LessonUnlockProgressProps {
  unlockedCount: number
  totalCount: number
  className?: string
  showIcon?: boolean
}

export function LessonUnlockProgress({
  unlockedCount,
  totalCount,
  className,
  showIcon = true,
}: LessonUnlockProgressProps) {
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0
  const isFullAccess = unlockedCount >= totalCount

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          {showIcon && (
            isFullAccess ? (
              <Unlock className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )
          )}
          <span>
            {unlockedCount}/{totalCount} bài học đã mở khóa
          </span>
        </div>
        <span className={cn(
          'font-medium',
          isFullAccess ? 'text-green-600' : 'text-muted-foreground'
        )}>
          {percentage}%
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          'h-2',
          isFullAccess && '[&>div]:bg-green-500'
        )}
      />
    </div>
  )
}
