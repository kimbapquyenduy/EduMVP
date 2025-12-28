import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { StudentCoursesView } from '@/components/student/StudentCoursesView'
import { CommunityTab } from '@/components/teacher/CommunityTab'
import { AboutTab } from '@/components/teacher/AboutTab'
import { MembersTab } from '@/components/teacher/MembersTab'

export default async function StudentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'STUDENT') redirect('/teacher/dashboard')

  // Verify student is enrolled in this class
  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/student/dashboard')

  // Get class data with denormalized counts (bypasses RLS visibility issue)
  const { data: classData } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single()

  if (!classData) redirect('/student/dashboard')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile.full_name || undefined}
        userRole={profile.role}
        userId={user.id}
      />

      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto p-6">
          <Link href="/student/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{classData.name}</h1>
                <Badge variant="outline">
                  {classData.price > 0 ? `$${classData.price}/mo` : 'Free'}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {classData.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span>{classData.member_count || 0} members</span>
                <span>•</span>
                <span>{classData.course_count || 0} courses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="classroom" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="classroom">Classroom</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="classroom">
            <StudentCoursesView classId={classId} userId={user.id} membershipTier={membership.status} />
          </TabsContent>

          <TabsContent value="community">
            <CommunityTab classId={classId} />
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
