'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PlayCircle, FileText, Download, ExternalLink, Check, ChevronDown, ChevronUp, CheckCircle, Lock } from 'lucide-react'
import { UnlockPrompt } from '@/components/shared/UnlockPrompt'
import { TierPurchaseModal } from '@/components/checkout/TierPurchaseModal'
import { getLessonAccessStatus, getAccessibleLessonCount, TierPurchaseWithTier } from '@/lib/utils/lesson-access'
import { TierPurchase, SubscriptionTier } from '@/lib/types/database.types'

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  pdf_url: string | null
  duration_minutes: number | null
  order_index: number
  is_completed: boolean
}

interface StudentCourseViewerProps {
  courseId: string
  courseTitle: string
  userId: string
  classId: string
  className?: string
  tierPurchase?: (TierPurchase & { tier: SubscriptionTier }) | null
  freeTierLessonCount?: number
}

export function StudentCourseViewer({
  courseId,
  courseTitle,
  userId,
  classId,
  className,
  tierPurchase = null,
  freeTierLessonCount = 0,
}: StudentCourseViewerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [currentTierPurchase, setCurrentTierPurchase] = useState<TierPurchaseWithTier | null>(tierPurchase)
  const supabase = createClient()

  const loadLessons = useCallback(async () => {
    const { data: lessonsData, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (lessonsData && lessonsData.length > 0) {
      // Get progress for each lesson
      const lessonsWithProgress = await Promise.all(
        lessonsData.map(async (lesson) => {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('lesson_id', lesson.id)
            .eq('user_id', userId)
            .single()

          return {
            ...lesson,
            is_completed: progress?.is_completed || false,
          }
        })
      )

      setLessons(lessonsWithProgress as Lesson[])

      // Find first accessible lesson based on tier
      const firstAccessibleIndex = lessonsWithProgress.findIndex((_, index) => {
        const status = getLessonAccessStatus(index, currentTierPurchase, false, freeTierLessonCount)
        return status === 'unlocked'
      })
      const lessonToSelect = firstAccessibleIndex >= 0
        ? lessonsWithProgress[firstAccessibleIndex]
        : lessonsWithProgress[0]
      setSelectedLesson(lessonToSelect as Lesson)
    }
    setLoading(false)
  }, [courseId, userId, supabase, currentTierPurchase, freeTierLessonCount])

  useEffect(() => {
    loadLessons()
  }, [loadLessons])

  const handleMarkAsComplete = async (lessonId: string, isCompleted: boolean) => {
    setMarkingComplete(true)

    if (isCompleted) {
      // Mark as incomplete
      await supabase
        .from('lesson_progress')
        .delete()
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
    } else {
      // Mark as complete
      await supabase.from('lesson_progress').upsert({
        lesson_id: lessonId,
        user_id: userId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
    }

    // Reload lessons to update progress
    await loadLessons()
    setMarkingComplete(false)
  }

  const getVideoUrl = (url: string | null) => {
    if (!url) return null

    // Direct MP4/WebM or Supabase storage
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('supabase.co/storage')) {
      return url
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : new URLSearchParams(new URL(url).search).get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${videoId}`
    }

    return url
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const { completedLessons, progressPercentage } = useMemo(() => {
    const completed = lessons.filter((l) => l.is_completed).length
    const percentage = lessons.length > 0 ? (completed / lessons.length) * 100 : 0
    return { completedLessons: completed, progressPercentage: percentage }
  }, [lessons])

  const currentLessonIndex = useMemo(() =>
    selectedLesson ? lessons.findIndex(l => l.id === selectedLesson.id) : -1,
    [selectedLesson, lessons]
  )

  // Compute lesson access status for each lesson
  const lessonAccessMap = useMemo(() => {
    return lessons.map((_, index) =>
      getLessonAccessStatus(index, currentTierPurchase, false, freeTierLessonCount)
    )
  }, [lessons, currentTierPurchase, freeTierLessonCount])

  // Calculate accessible lesson count
  const accessibleCount = useMemo(() => {
    return getAccessibleLessonCount(lessons.length, currentTierPurchase, false, freeTierLessonCount)
  }, [lessons.length, currentTierPurchase, freeTierLessonCount])

  // Check if selected lesson is locked
  const isSelectedLessonLocked = useMemo(() => {
    if (currentLessonIndex === -1) return false
    return lessonAccessMap[currentLessonIndex] === 'locked'
  }, [currentLessonIndex, lessonAccessMap])

  // Handle lesson selection with access check
  const handleLessonSelect = (lesson: Lesson, index: number) => {
    if (lessonAccessMap[index] === 'locked') {
      setIsUpgradeModalOpen(true)
    } else {
      setSelectedLesson(lesson)
    }
  }

  // Handle successful tier purchase
  const handleUpgradeSuccess = (purchase: TierPurchase) => {
    // Refetch tier purchase to get updated access
    supabase
      .from('tier_purchases')
      .select('*, tier:subscription_tiers(*)')
      .eq('id', purchase.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentTierPurchase(data as TierPurchaseWithTier)
        }
      })
    setIsUpgradeModalOpen(false)
  }

  const hasLockedLessons = accessibleCount < lessons.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading lessons...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Course Title Header - Teal gradient */}
      <div className="border-b bg-gradient-to-r from-secondary/20 via-primary/5 to-secondary/10 py-3 flex-shrink-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary/70 mb-0.5 font-medium">Course</p>
              <h2 className="text-lg font-semibold">{courseTitle}</h2>
            </div>
            <div className="text-sm text-primary font-medium">
              {Math.round(progressPercentage)}% Complete
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden container mx-auto">
        {/* Lessons Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-80 lg:w-96'} transition-all duration-300 border-r bg-background overflow-hidden flex-shrink-0`}>
          <div className="h-full overflow-y-auto pr-4 py-4 space-y-4">
            {/* Unlock Prompt - Show if there are locked lessons */}
            {hasLockedLessons && (
              <UnlockPrompt
                classId={classId}
                currentTier={currentTierPurchase}
                accessibleCount={accessibleCount}
                totalCount={lessons.length}
                onUpgrade={() => setIsUpgradeModalOpen(true)}
              />
            )}

            {/* Course Progress - Teal gradient card */}
            <Card className="clay-card border-0 bg-gradient-to-r from-primary/5 to-secondary/5 transition-smooth">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-primary">Progress</span>
                  <span className="text-primary font-semibold">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/70" />
                <p className="text-xs text-muted-foreground">
                  {completedLessons} of {lessons.length} lessons complete
                </p>
              </CardContent>
            </Card>

          {/* Lessons List */}
          <div className="space-y-1">
            {lessons.map((lesson, index) => {
              const isLocked = lessonAccessMap[index] === 'locked'
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonSelect(lesson, index)}
                  className={`w-full text-left p-3 rounded-lg transition-smooth ${
                    isLocked
                      ? 'opacity-60 hover:opacity-80'
                      : selectedLesson?.id === lesson.id
                        ? 'bg-primary/10 border-l-4 border-primary shadow-sm'
                        : 'hover:bg-primary/5 hover:border-l-4 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isLocked ? (
                        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ) : lesson.is_completed ? (
                        <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-500/30">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : selectedLesson?.id === lesson.id ? (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm shadow-primary/30">
                          <span className="text-xs text-white font-medium">{index + 1}</span>
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-primary/30 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium line-clamp-2 ${
                        isLocked ? 'text-muted-foreground' : selectedLesson?.id === lesson.id ? 'text-primary' : ''
                      }`}>
                        {lesson.title}
                      </p>
                      {lesson.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDuration(lesson.duration_minutes)}
                        </p>
                      )}
                    </div>
                    {isLocked ? (
                      <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : lesson.video_url ? (
                      <PlayCircle className={`h-4 w-4 flex-shrink-0 ${selectedLesson?.id === lesson.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm">No lessons yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div>
            {/* Lesson Title & Mark Complete - FIRST */}
            <div className="border-b bg-gradient-to-r from-secondary/10 via-background to-primary/5 py-6 px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-primary/70 mb-2">
                      <PlayCircle className="h-4 w-4" />
                      <span className="font-medium">Lesson {currentLessonIndex + 1} of {lessons.length}</span>
                    </div>
                    <h1 className="text-3xl font-bold">{selectedLesson.title}</h1>
                  </div>
                  <Button
                    onClick={() => handleMarkAsComplete(selectedLesson.id, selectedLesson.is_completed)}
                    disabled={markingComplete}
                    variant={selectedLesson.is_completed ? 'outline' : 'default'}
                    className={`flex-shrink-0 transition-smooth ${
                      selectedLesson.is_completed
                        ? 'border-green-500 text-green-600 hover:bg-green-50'
                        : 'bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20'
                    }`}
                  >
                    {markingComplete ? (
                      'Updating...'
                    ) : selectedLesson.is_completed ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      'Mark as Complete'
                    )}
                  </Button>
                </div>
            </div>

            {/* Video Player */}
            {selectedLesson.video_url && (() => {
              const videoUrl = getVideoUrl(selectedLesson.video_url)
              const isDirectVideo = videoUrl?.includes('supabase.co/storage')

              return (
                <div className="w-full bg-gradient-to-b from-primary/5 to-secondary/5 py-4 px-6">
                  <div className="aspect-video bg-black w-full rounded-xl overflow-hidden shadow-lg shadow-primary/10">
                    {isDirectVideo ? (
                      <video src={videoUrl || ''} controls className="w-full h-full">
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <iframe
                        src={videoUrl || ''}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Lesson Content - THIRD */}
            <div className="py-6 px-6 space-y-8">
              {/* Lesson Description */}
              {selectedLesson.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">About this Lesson</h3>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: selectedLesson.description }}
                  />
                </div>
              )}

              {/* PDF Materials */}
              {selectedLesson.pdf_url && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-primary">Lesson Materials</h3>
                  <a
                    href={selectedLesson.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="clay-card hover:border-primary hover:shadow-md hover:shadow-primary/10 transition-smooth cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-secondary/30 transition-smooth">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-smooth">PDF Slides & Materials</p>
                              <p className="text-sm text-muted-foreground">Click to open or download</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth" />
                            <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-primary/10">
                <Button
                  variant="outline"
                  onClick={() => currentLessonIndex > 0 && handleLessonSelect(lessons[currentLessonIndex - 1], currentLessonIndex - 1)}
                  disabled={currentLessonIndex === 0}
                  className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary transition-smooth disabled:opacity-50"
                >
                  Previous Lesson
                </Button>
                {currentLessonIndex < lessons.length - 1 && lessonAccessMap[currentLessonIndex + 1] === 'locked' ? (
                  <Button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-500/20 transition-smooth gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Nâng cấp để tiếp tục
                  </Button>
                ) : (
                  <Button
                    onClick={() => currentLessonIndex < lessons.length - 1 && handleLessonSelect(lessons[currentLessonIndex + 1], currentLessonIndex + 1)}
                    disabled={currentLessonIndex === lessons.length - 1}
                    className="bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 transition-smooth disabled:opacity-50"
                  >
                    Next Lesson
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg">Select a lesson to start learning</p>
            </div>
          </div>
        )}
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="fixed bottom-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
        >
          {sidebarCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>

      {/* Tier Purchase Modal */}
      <TierPurchaseModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        classId={classId}
        className={className}
        currentTierPurchase={currentTierPurchase}
        onSuccess={handleUpgradeSuccess}
      />
    </div>
  )
}
