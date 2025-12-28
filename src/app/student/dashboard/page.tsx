import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrowseClasses } from '@/components/student/BrowseClasses'
import { MyClasses } from '@/components/student/MyClasses'
import { BookOpen, Search } from 'lucide-react'

export default async function StudentDashboard() {
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

  // Get enrolled classes count
  const { count: enrolledCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile.full_name || undefined}
        userRole={profile.role}
        userId={user.id}
      />

      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Browse and join classes to start learning
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="clay-card bg-gradient-to-br from-primary to-secondary text-white rounded-2xl p-6 transition-smooth">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Enrolled Classes</p>
                <p className="text-3xl font-bold">{enrolledCount || 0}</p>
              </div>
              <BookOpen className="h-12 w-12 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-classes" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="my-classes">
              <BookOpen className="mr-2 h-4 w-4" />
              My Classes
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Search className="mr-2 h-4 w-4" />
              Browse Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-classes">
            <MyClasses userId={user.id} />
          </TabsContent>

          <TabsContent value="browse">
            <BrowseClasses userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
