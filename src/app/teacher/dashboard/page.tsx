import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { PlusCircle, Users, BookOpen, DollarSign } from 'lucide-react'
import { AppHeader } from '@/components/shared/AppHeader'

export default async function TeacherDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get classes with member and course counts
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      *,
      memberships:memberships(count),
      courses:courses(count)
    `)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const totalMembers = classes?.reduce((acc, classItem) => {
    const memberCount = classItem.memberships?.[0]?.count || 0
    return acc + memberCount
  }, 0) || 0

  const totalCourses = classes?.reduce((acc, classItem) => {
    const courseCount = classItem.courses?.[0]?.count || 0
    return acc + courseCount
  }, 0) || 0

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || 'Teacher'}!</h1>
              <p className="text-muted-foreground mt-1">Manage your classes and courses</p>
            </div>
            <Link href="/teacher/classes/new">
              <Button size="lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Class
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="clay-card border-none shadow-lg bg-gradient-to-br from-primary to-secondary text-white overflow-hidden relative transition-smooth">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">
                Total Classes
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold">{classes?.length || 0}</div>
              <p className="text-sm text-white/80 mt-1">Active communities</p>
            </CardContent>
          </Card>

          <Card className="clay-card border-none shadow-lg bg-gradient-to-br from-secondary to-primary text-white overflow-hidden relative transition-smooth">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">
                Total Students
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold">{totalMembers}</div>
              <p className="text-sm text-white/80 mt-1">Across all classes</p>
            </CardContent>
          </Card>

          <Card className="clay-card border-none shadow-lg bg-gradient-to-br from-accent to-orange-500 text-white overflow-hidden relative transition-smooth">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-white/90">
                Total Courses
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold">{totalCourses}</div>
              <p className="text-sm text-white/80 mt-1">Learning materials</p>
            </CardContent>
          </Card>
        </div>

        {/* Classes Grid */}
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Classes</h2>
        </div>

        {classes && classes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Link key={classItem.id} href={`/teacher/classes/${classItem.id}`}>
                <Card className="clay-card hover:shadow-xl transition-smooth cursor-pointer group h-full hover:-translate-y-1 overflow-hidden">
                  {classItem.thumbnail_url ? (
                    <div className="h-40 bg-gradient-to-br from-primary to-secondary overflow-hidden relative">
                      <img
                        src={classItem.thumbnail_url}
                        alt={classItem.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-primary via-secondary to-accent overflow-hidden relative">
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-white/80" />
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {classItem.name}
                      </CardTitle>
                      {!classItem.is_published && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Unpublished</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {classItem.description || 'No description'}
                    </p>
                    <div className="flex justify-between text-sm bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{classItem.memberships?.[0]?.count || 0}</div>
                          <div className="text-xs text-muted-foreground">members</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold">{classItem.courses?.[0]?.count || 0}</div>
                          <div className="text-xs text-muted-foreground">courses</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {classItem.price > 0 ? `$${classItem.price}/mo` : 'Free'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-sm text-primary font-medium">
                        View Details →
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first class to start teaching and building your community
              </p>
              <Link href="/teacher/classes/new">
                <Button size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Your First Class
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
