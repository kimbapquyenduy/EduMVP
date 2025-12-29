'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Lock, Unlock, BookOpen, ArrowUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import Image from 'next/image'
import { TierPurchaseModal } from '@/components/checkout/TierPurchaseModal'
import { TierPurchase, SubscriptionTier, TierLevel } from '@/lib/types/database.types'
import { getCourseAccessStatus, DEFAULT_TIER_NAMES, TierPurchaseWithTier } from '@/lib/utils/lesson-access'

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  pdf_url: string | null
  order_index: number
  duration_minutes: number | null
  is_completed: boolean
}

interface Course {
  id: string
  class_id: string
  title: string
  description: string | null
  required_tier_level: TierLevel
  thumbnail_url: string | null
  order_index: number
  lessons: Lesson[]
  completion_percentage: number
  lesson_count: number
}

interface StudentCoursesViewProps {
  classId: string
  userId: string
}

export function StudentCoursesView({ classId, userId }: StudentCoursesViewProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [tierPurchase, setTierPurchase] = useState<(TierPurchase & { tier: SubscriptionTier }) | null>(null)
  const supabase = createClient()

  // Fetch tier purchase on mount
  useEffect(() => {
    const fetchTierPurchase = async () => {
      const { data } = await supabase
        .from('tier_purchases')
        .select('*, tier:subscription_tiers(*)')
        .eq('user_id', userId)
        .eq('class_id', classId)
        .maybeSingle()
      if (data) {
        setTierPurchase(data as TierPurchase & { tier: SubscriptionTier })
      }
    }
    fetchTierPurchase()
  }, [classId, userId, supabase])

  useEffect(() => {
    loadCourses()
  }, [classId, userId])

  const loadCourses = async () => {
    setLoading(true)

    // Optimized: Get courses with lessons in a single query
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        lessons:lessons(*)
      `)
      .eq('class_id', classId)
      .order('order_index', { ascending: true })

    if (coursesError || !coursesData) {
      setLoading(false)
      return
    }

    // Collect all lesson IDs for batch progress query
    const allLessonIds = coursesData.flatMap(
      (course) => (course.lessons || []).map((lesson: { id: string }) => lesson.id)
    )

    // Single query to get all progress for this user
    let progressMap: Record<string, boolean> = {}
    if (allLessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed')
        .eq('user_id', userId)
        .in('lesson_id', allLessonIds)

      progressMap = (progressData || []).reduce(
        (acc, p) => ({ ...acc, [p.lesson_id]: p.is_completed }),
        {}
      )
    }

    // Combine data in memory (no additional queries)
    const coursesWithProgress = coursesData.map((course) => {
      const lessons = (course.lessons || [])
        .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((lesson: { id: string }) => ({
          ...lesson,
          is_completed: progressMap[lesson.id] || false,
        }))

      const totalLessons = lessons.length
      const completedLessons = lessons.filter((l: { is_completed: boolean }) => l.is_completed).length
      const completion_percentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      return {
        ...course,
        lessons,
        completion_percentage,
        lesson_count: totalLessons,
      }
    })

    setCourses(coursesWithProgress as Course[])
    setLoading(false)
  }

  const canAccessCourse = (course: Course) => {
    const requiredTier = course.required_tier_level ?? 0
    return getCourseAccessStatus(requiredTier, tierPurchase as TierPurchaseWithTier | null, false) === 'unlocked'
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No courses available yet</h3>
          <p className="text-muted-foreground">
            The teacher hasn&apos;t added any courses to this class yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {courses.length} Course{courses.length !== 1 ? 's' : ''}
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const hasAccess = canAccessCourse(course)

          return (
            <div key={course.id} className="relative">
              {hasAccess ? (
                <Link href={`/student/classes/${classId}/courses/${course.id}`}>
                  <Card className="hover:shadow-lg transition-all hover:scale-[1.02] group overflow-hidden h-full cursor-pointer">
                    {/* Thumbnail Image */}
                    {course.thumbnail_url ? (
                      <div className="aspect-video w-full bg-muted overflow-hidden relative">
                        <Image
                          src={course.thumbnail_url}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-primary/40" />
                      </div>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg line-clamp-2 flex-1">{course.title}</CardTitle>
                      </div>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <BookOpen className="mr-1.5 h-4 w-4" />
                            <span>
                              {course.lesson_count || 0} Lesson{course.lesson_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Badge variant={course.required_tier_level === 0 ? 'secondary' : 'default'} className="text-xs">
                          {course.required_tier_level === 0 ? (
                            <><Unlock className="mr-1 h-3 w-3" /> {DEFAULT_TIER_NAMES[0]}</>
                          ) : (
                            <><Lock className="mr-1 h-3 w-3" /> {DEFAULT_TIER_NAMES[course.required_tier_level]}</>
                          )}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{course.completion_percentage}% Complete</span>
                        </div>
                        <Progress value={course.completion_percentage} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card
                  className="overflow-hidden h-full opacity-75 hover:opacity-100 cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => setIsUpgradeModalOpen(true)}
                >
                  {/* Thumbnail Image with Lock Overlay */}
                  <div className="aspect-video w-full bg-muted overflow-hidden relative">
                    {course.thumbnail_url ? (
                      <>
                        <Image
                          src={course.thumbnail_url}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover blur-sm"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="h-12 w-12 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <Lock className="h-16 w-16 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg line-clamp-2 flex-1">{course.title}</CardTitle>
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {course.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <BookOpen className="mr-1.5 h-4 w-4" />
                          <span>
                            {course.lesson_count || 0} Lesson{course.lesson_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <Badge variant="default" className="text-xs">
                        <Lock className="mr-1 h-3 w-3" /> {DEFAULT_TIER_NAMES[course.required_tier_level]}
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsUpgradeModalOpen(true)
                      }}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Nâng cấp để mở khóa
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )
        })}
      </div>

      {/* Tier Purchase Modal */}
      <TierPurchaseModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        classId={classId}
        currentTierPurchase={tierPurchase}
        onSuccess={(purchase) => {
          setTierPurchase({ ...purchase, tier: tierPurchase?.tier } as TierPurchase & { tier: SubscriptionTier })
          setIsUpgradeModalOpen(false)
          // Reload page to update access
          window.location.reload()
        }}
      />
    </div>
  )
}
