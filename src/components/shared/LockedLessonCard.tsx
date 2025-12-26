'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Play, Clock, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Lesson } from '@/lib/types/database.types'

interface LockedLessonCardProps {
  lesson: Lesson
  index: number
  onUpgrade: () => void
  className?: string
}

export function LockedLessonCard({
  lesson,
  index,
  onUpgrade,
  className,
}: LockedLessonCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden opacity-75 hover:opacity-90 transition-opacity',
        className
      )}
    >
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-[1px] z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={onUpgrade}
            className="gap-1"
          >
            <ArrowUp className="w-3 h-3" />
            Nâng cấp để mở
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Lesson number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {index + 1}
          </div>

          {/* Lesson info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium truncate text-muted-foreground">
                {lesson.title}
              </h3>
            </div>

            {lesson.description && (
              <p className="text-sm text-muted-foreground/70 mt-1 line-clamp-2">
                {lesson.description}
              </p>
            )}

            {lesson.duration_minutes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-2">
                <Clock className="w-3 h-3" />
                <span>{lesson.duration_minutes} phút</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
