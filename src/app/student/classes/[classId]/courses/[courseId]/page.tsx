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

  // Run all queries in parallel for better performance
  const [profileResult, membershipResult, courseResult, tierPurchaseResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('memberships').select('*').eq('user_id', user.id).eq('class_id', classId).single(),
    supabase.from('courses').select('*, class:classes(*)').eq('id', courseId).single(),
    supabase.from('tier_purchases').select('*, tier:subscription_tiers(*)').eq('user_id', user.id).eq('class_id', classId).maybeSingle(),
  ])

  const profile = profileResult.data
  const membership = membershipResult.data
  const course = courseResult.data
  const tierPurchase = tierPurchaseResult.data

  if (!profile || profile.role !== 'STUDENT') redirect('/login')
  if (!membership) redirect('/student/dashboard')
  if (!course) redirect(`/student/classes/${classId}`)

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
        courseTierLevel={course.required_tier_level ?? 0}
        userId={user.id}
        classId={classId}
        className={course.class.name}
        tierPurchase={tierPurchase}
      />
    </div>
  )
}
