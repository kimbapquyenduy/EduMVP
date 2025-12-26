'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PlayCircle, FileText, Download, ExternalLink, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  pdf_url: string | null
  duration_minutes: number | null
  order_index: number
}

interface CourseViewerProps {
  courseId: string
  courseTitle: string
}

export function CourseViewer({ courseId, courseTitle }: CourseViewerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const supabase = createClient()

  const loadLessons = useCallback(async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (data && data.length > 0) {
      setLessons(data)
      setSelectedLesson(data[0])
    }
    setLoading(false)
  }, [courseId, supabase])

  useEffect(() => {
    loadLessons()
  }, [loadLessons])

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

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const completedLessons = 0
  const progressPercentage = 0

  const currentLessonIndex = useMemo(() =>
    selectedLesson ? lessons.findIndex(l => l.id === selectedLesson.id) : -1,
    [selectedLesson, lessons]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading lessons...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Course Title Header */}
      <div className="border-b bg-background py-3 flex-shrink-0">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Course Preview</p>
              <h2 className="text-lg font-semibold">{courseTitle}</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {lessons.length} Lesson{lessons.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden container mx-auto">
        {/* Lessons Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-80 lg:w-96'} transition-all duration-300 border-r bg-background overflow-hidden flex-shrink-0`}>
          <div className="h-full overflow-y-auto pr-4 py-4 space-y-4">
            {/* Course Progress */}
            <Card className="border-0 shadow-none bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Lessons</span>
                  <span className="text-muted-foreground">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {completedLessons} of {lessons.length} lessons complete
                </p>
              </CardContent>
            </Card>

          {/* Lessons List */}
          <div className="space-y-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedLesson?.id === lesson.id
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {completedLessons > index ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium line-clamp-2 ${
                      selectedLesson?.id === lesson.id ? 'text-primary' : ''
                    }`}>
                      {lesson.title}
                    </p>
                    {lesson.duration_minutes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDuration(lesson.duration_minutes)}
                      </p>
                    )}
                  </div>
                  {lesson.video_url && (
                    <PlayCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No lessons yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div>
            {/* Lesson Title */}
            <div className="border-b bg-background py-6 px-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <PlayCircle className="h-4 w-4" />
                <span>Lesson {currentLessonIndex + 1} of {lessons.length}</span>
              </div>
              <h1 className="text-3xl font-bold">{selectedLesson.title}</h1>
            </div>

            {/* Video Player */}
            {selectedLesson.video_url && (() => {
              const videoUrl = getVideoUrl(selectedLesson.video_url)
              const isDirectVideo = videoUrl?.includes('supabase.co/storage')

              return (
                <div className="w-full bg-muted/30 py-4 px-6">
                  <div className="aspect-video bg-black w-full rounded-lg overflow-hidden">
                    {isDirectVideo ? (
                      <video src={videoUrl || ''} controls className="w-full h-full">
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <iframe
                        src={videoUrl || ''}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Lesson Content - THIRD */}
            <div className="py-6 px-6 space-y-8">
              {/* Lesson Description */}
              {selectedLesson.description && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">About this Lesson</h3>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: selectedLesson.description }}
                  />
                </div>
              )}

              {/* PDF Materials */}
              {selectedLesson.pdf_url && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Lesson Materials</h3>
                  <a
                    href={selectedLesson.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">PDF Slides & Materials</p>
                              <p className="text-sm text-muted-foreground">Click to open or download</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ExternalLink className="h-5 w-5 text-muted-foreground" />
                            <Download className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => currentLessonIndex > 0 && setSelectedLesson(lessons[currentLessonIndex - 1])}
                  disabled={currentLessonIndex === 0}
                >
                  Previous Lesson
                </Button>
                <Button
                  onClick={() => currentLessonIndex < lessons.length - 1 && setSelectedLesson(lessons[currentLessonIndex + 1])}
                  disabled={currentLessonIndex === lessons.length - 1}
                >
                  Next Lesson
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a lesson to start learning</p>
            </div>
          </div>
        )}
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="fixed bottom-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
        >
          {sidebarCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
