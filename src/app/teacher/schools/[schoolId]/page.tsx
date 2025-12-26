import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { CoursesTab } from '@/components/teacher/CoursesTab'
import { MembersTab } from '@/components/teacher/MembersTab'
import { AppHeader } from '@/components/shared/AppHeader'

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>
}) {
  const { schoolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get school data
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .eq('teacher_id', user.id)
    .single()

  if (!school) redirect('/teacher/dashboard')

  // Get counts
  const { count: memberCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
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
                <h1 className="text-3xl font-bold">{school.name}</h1>
                {!school.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                <Badge variant="outline">
                  {school.price > 0 ? `$${school.price}/mo` : 'Free'}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {school.description || 'No description'}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span>{memberCount || 0} members</span>
                <span>•</span>
                <span>{courseCount || 0} courses</span>
              </div>
            </div>

            <Link href={`/teacher/schools/${schoolId}/settings`}>
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
        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="feed">Community Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <CoursesTab schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="members">
            <MembersTab schoolId={schoolId} />
          </TabsContent>

          <TabsContent value="feed">
            <div className="text-center py-12 text-muted-foreground">
              <p>Community feed coming in Phase 4</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
