'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Lock, Unlock, Loader2, BookOpen, ArrowUp } from 'lucide-react'
import Link from 'next/link'
import { TierPurchaseModal } from '@/components/checkout/TierPurchaseModal'
import { TierPurchase, SubscriptionTier } from '@/lib/types/database.types'

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
  tier: 'FREE' | 'PREMIUM'
  thumbnail_url: string | null
  order_index: number
  lessons: Lesson[]
  completion_percentage: number
  lesson_count: number
}

interface StudentCoursesViewProps {
  classId: string
  userId: string
  membershipTier: string
}

export function StudentCoursesView({ classId, userId, membershipTier }: StudentCoursesViewProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
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

    // Get all courses for this class
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('class_id', classId)
      .order('order_index', { ascending: true })

    if (coursesError || !coursesData) {
      setLoading(false)
      return
    }

    // Get lessons and progress for each course
    const coursesWithProgress = await Promise.all(
      coursesData.map(async (course) => {
        // Get lessons
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', course.id)
          .order('order_index', { ascending: true })

        // Get progress for each lesson
        const lessonsWithProgress = await Promise.all(
          (lessons || []).map(async (lesson) => {
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

        // Calculate completion percentage
        const totalLessons = lessonsWithProgress.length
        const completedLessons = lessonsWithProgress.filter((l) => l.is_completed).length
        const completion_percentage =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        return {
          ...course,
          lessons: lessonsWithProgress,
          completion_percentage,
          lesson_count: lessonsWithProgress.length,
        }
      })
    )

    setCourses(coursesWithProgress as Course[])
    setLoading(false)
  }

  const canAccessCourse = (course: Course) => {
    return course.tier === 'FREE' || membershipTier === 'PREMIUM'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            The teacher hasn't added any courses to this class yet.
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
                      <div className="aspect-video w-full bg-muted overflow-hidden">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                        <Badge variant={course.tier === 'FREE' ? 'secondary' : 'default'} className="text-xs">
                          {course.tier === 'FREE' ? (
                            <><Unlock className="mr-1 h-3 w-3" /> Free</>
                          ) : (
                            <><Lock className="mr-1 h-3 w-3" /> Premium</>
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
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover blur-sm"
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
                        <Lock className="mr-1 h-3 w-3" /> Premium
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
