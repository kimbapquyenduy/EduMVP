'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlusCircle, Video, FileText, Lock, Unlock, Trash2, Loader2, Eye, BookOpen } from 'lucide-react'
import type { Course } from '@/lib/types/database.types'
import { CreateCourseDialog } from './CreateCourseDialog'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface CoursesTabProps {
  classId?: string
  schoolId?: string
}

interface CourseWithLessonCount extends Course {
  lesson_count?: number
}

export function CoursesTab({ classId, schoolId }: CoursesTabProps) {
  const entityId = classId || schoolId
  const entityType = classId ? 'class_id' : 'school_id'
  const [courses, setCourses] = useState<CourseWithLessonCount[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadCourses()
  }, [entityId])

  const loadCourses = async () => {
    if (!entityId) return
    const supabase = createClient()

    // Get courses
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq(entityType, entityId)
      .order('order_index', { ascending: true })

    if (coursesError || !coursesData) {
      setLoading(false)
      return
    }

    // Get lesson counts for each course
    const coursesWithCounts = await Promise.all(
      coursesData.map(async (course) => {
        const { count } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)

        return { ...course, lesson_count: count || 0 }
      })
    )

    setCourses(coursesWithCounts)
    setLoading(false)
  }

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"?`)) return

    setDeleting(courseId)
    const supabase = createClient()
    const { error } = await supabase.from('courses').delete().eq('id', courseId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Course deleted successfully',
      })
      loadCourses()
    }
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {courses.length} Course{courses.length !== 1 ? 's' : ''}
        </h2>
        {classId && <CreateCourseDialog classId={classId} />}
      </div>

      {courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <Link key={course.id} href={classId ? `/teacher/classes/${classId}/courses/${course.id}` : `/teacher/schools/${schoolId}/courses/${course.id}`}>
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

                <CardHeader className="pb-3 relative">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2 flex-1">{course.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(course.id, course.title)
                      }}
                      disabled={deleting === course.id}
                    >
                      {deleting === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {course.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <BookOpen className="mr-1.5 h-4 w-4" />
                        <span>
                          {course.lesson_count || 0} Lesson{course.lesson_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {course.promo_video_url && (
                        <>
                          <span>•</span>
                          <Video className="h-4 w-4" />
                        </>
                      )}
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
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>0% Complete</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add your first course to start teaching. You can upload videos or PDF documents.
            </p>
            {classId && <CreateCourseDialog classId={classId} />}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
