import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { CoursesTab } from '@/components/teacher/CoursesTab'
import { MembersTab } from '@/components/teacher/MembersTab'
import { CommunityTab } from '@/components/teacher/CommunityTab'
import { AboutTab } from '@/components/teacher/AboutTab'
import { AppHeader } from '@/components/shared/AppHeader'

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run all queries in parallel for better performance
  const [profileResult, classResult, memberCountResult, courseCountResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('classes').select('*').eq('id', classId).eq('teacher_id', user.id).single(),
    supabase.from('memberships').select('*', { count: 'exact', head: true }).eq('class_id', classId),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('class_id', classId),
  ])

  const profile = profileResult.data
  const classData = classResult.data
  const memberCount = memberCountResult.count
  const courseCount = courseCountResult.count

  if (!classData) redirect('/teacher/dashboard')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
        userId={user.id}
      />

      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto p-6">
          <Link href="/teacher/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{classData.name}</h1>
                {!classData.is_published && (
                  <Badge variant="secondary">Unpublished</Badge>
                )}
                <Badge variant="outline">
                  {classData.price > 0 ? `$${classData.price}/mo` : 'Free'}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {classData.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span>{memberCount || 0} members</span>
                <span>•</span>
                <span>{courseCount || 0} courses</span>
              </div>
            </div>

            <Link href={`/teacher/classes/${classId}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="community" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="classroom">Classroom</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="community">
            <CommunityTab classId={classId} />
          </TabsContent>

          <TabsContent value="classroom">
            <CoursesTab classId={classId} />
          </TabsContent>

          <TabsContent value="members">
            <MembersTab classId={classId} />
          </TabsContent>

          <TabsContent value="about">
            <AboutTab classData={classData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
