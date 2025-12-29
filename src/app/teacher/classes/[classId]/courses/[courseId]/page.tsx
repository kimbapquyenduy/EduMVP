import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Eye, Settings } from 'lucide-react'
import Link from 'next/link'
import { CourseViewer } from '@/components/teacher/CourseViewer'
import { LessonsManagement } from '@/components/teacher/LessonsManagement'

export default async function CourseViewerPage({
  params,
}: {
  params: Promise<{ classId: string; courseId: string }>
}) {
  const { classId, courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run queries in parallel for better performance
  const [profileResult, courseResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('courses').select('*, class:classes(*)').eq('id', courseId).single(),
  ])

  const profile = profileResult.data
  const course = courseResult.data

  if (!course) redirect(`/teacher/classes/${classId}`)

  // Verify teacher owns this class
  if (course.class.teacher_id !== user.id) {
    redirect('/teacher/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
        userId={user.id}
      />

      {/* Header with Back Button and Tabs */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <Link href={`/teacher/classes/${classId}`}>
            <Button variant="ghost" size="sm" className="mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {course.class.name}
            </Button>
          </Link>

          <Tabs defaultValue="manage" className="w-full">
            <TabsList>
              <TabsTrigger value="manage">
                <Settings className="mr-2 h-4 w-4" />
                Manage Lessons
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="mr-2 h-4 w-4" />
                Preview (Student View)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="mt-6">
              <LessonsManagement courseId={courseId} classId={classId} />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 -mx-4">
              <CourseViewer courseId={courseId} courseTitle={course.title} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
