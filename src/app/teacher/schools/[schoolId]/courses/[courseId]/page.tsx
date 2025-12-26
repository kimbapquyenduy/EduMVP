import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Lock, Unlock, Users, BookOpen, Clock } from 'lucide-react'
import Link from 'next/link'
import { CustomVideoPlayer } from '@/components/shared/CustomVideoPlayer'

export default async function CourseViewerPage({
  params,
}: {
  params: Promise<{ schoolId: string; courseId: string }>
}) {
  const { schoolId, courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get course data with school info
  const { data: course } = await supabase
    .from('courses')
    .select(`
      *,
      school:schools(*)
    `)
    .eq('id', courseId)
    .single()

  if (!course) redirect(`/teacher/schools/${schoolId}`)

  // Verify teacher owns this school
  if (course.school.teacher_id !== user.id) {
    redirect('/teacher/dashboard')
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  // Get all courses in this school for sidebar
  const { data: allCourses } = await supabase
    .from('courses')
    .select('*')
    .eq('school_id', schoolId)
    .order('order_index', { ascending: true })

  // Extract video URL
  const getVideoUrl = (url: string | null) => {
    if (!url) return null

    // Direct MP4/WebM or Supabase storage
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('supabase.co/storage')) {
      return url
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : new URLSearchParams(new URL(url).search).get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${videoId}`
    }

    return url
  }

  const videoUrl = getVideoUrl(course.video_url)
  const isDirectVideo = videoUrl?.endsWith('.mp4') || videoUrl?.endsWith('.webm') || videoUrl?.includes('supabase.co/storage')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
      />

      <div className="container mx-auto p-6">
        {/* Back Button */}
        <Link href={`/teacher/schools/${schoolId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to School
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            {videoUrl && (
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black">
                  {isDirectVideo ? (
                    <CustomVideoPlayer
                      src={videoUrl}
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Course Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant={course.tier === 'FREE' ? 'secondary' : 'default'}>
                        {course.tier === 'FREE' ? (
                          <><Unlock className="mr-1 h-3 w-3" /> Free Course</>
                        ) : (
                          <><Lock className="mr-1 h-3 w-3" /> Premium Course</>
                        )}
                      </Badge>
                      {course.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration_minutes} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {course.description && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">{course.description}</p>
                  </div>
                )}

                {/* PDF Download */}
                {course.pdf_url && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Course Materials</h3>
                    <a
                      href={course.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      Download PDF Slides
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* School Info Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{course.school.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {course.school.description || 'No description'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{memberCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{allCourses?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Courses</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Teacher Preview Mode</span>
                  </div>
                  {course.school.price > 0 && (
                    <div className="text-center py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold">
                      ${course.school.price}/month
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Courses */}
            {allCourses && allCourses.length > 1 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">All Courses ({allCourses.length})</h3>
                  <div className="space-y-2">
                    {allCourses.map((c, index) => (
                      <Link
                        key={c.id}
                        href={`/teacher/schools/${schoolId}/courses/${c.id}`}
                      >
                        <div
                          className={`p-3 rounded-lg transition-colors ${
                            c.id === course.id
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-muted/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono text-muted-foreground">
                              #{index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">
                                {c.title}
                              </div>
                              {c.duration_minutes && (
                                <div className="text-xs text-muted-foreground">
                                  {c.duration_minutes} min
                                </div>
                              )}
                            </div>
                            <Badge variant={c.tier === 'FREE' ? 'secondary' : 'default'} className="text-xs">
                              {c.tier === 'FREE' ? (
                                <Unlock className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
