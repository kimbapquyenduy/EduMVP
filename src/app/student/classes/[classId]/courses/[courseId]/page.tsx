import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { StudentCourseViewer } from '@/components/student/StudentCourseViewer'

export default async function StudentCourseViewerPage({
  params,
}: {
  params: Promise<{ classId: string; courseId: string }>
}) {
  const { classId, courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'STUDENT') {
    redirect('/login')
  }

  // Verify student is enrolled in this class
  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('class_id', classId)
    .single()

  if (!membership) {
    redirect('/student/dashboard')
  }

  // Get course data
  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      class:classes(*)
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect(`/student/classes/${classId}`)

  // Fetch student's tier purchase for this class (may not exist yet)
  const { data: tierPurchase } = await supabase
    .from('tier_purchases')
    .select('*, tier:subscription_tiers(*)')
    .eq('user_id', user.id)
    .eq('class_id', classId)
    .maybeSingle()

  // Fetch free tier lesson count
  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('lesson_unlock_count')
    .eq('class_id', classId)
    .eq('tier_level', 0)
    .single()

  const freeTierLessonCount = freeTier?.lesson_unlock_count ?? 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
        userId={user.id}
      />

      {/* Back Button */}
      <div className="border-b bg-background px-4 py-3">
        <div className="container mx-auto">
          <Link href={`/student/classes/${classId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {course.class.name}
            </Button>
          </Link>
        </div>
      </div>

      {/* Course Viewer */}
      <StudentCourseViewer
        courseId={courseId}
        courseTitle={course.title}
        userId={user.id}
        classId={classId}
        className={course.class.name}
        tierPurchase={tierPurchase}
        freeTierLessonCount={freeTierLessonCount}
      />
    </div>
  )
}
