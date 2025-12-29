'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Video, FileText, Maximize2, Minimize2 } from 'lucide-react'
import type { Course } from '@/lib/types/database.types'
import { CustomVideoPlayer } from './CustomVideoPlayer'

interface CourseContentViewerProps {
  course: Course & { school?: any }
}

export function CourseContentViewer({ course }: CourseContentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeView, setActiveView] = useState<'split' | 'video' | 'pdf'>('split')

  // Extract video embed URL
  const getEmbedUrl = (url: string | null) => {
    if (!url) return null

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

    // Direct video file
    if (url.endsWith('.mp4') || url.endsWith('.webm')) {
      return url
    }

    return url
  }

  const videoEmbedUrl = getEmbedUrl(course.video_url)
  const hasVideo = !!videoEmbedUrl
  const hasPdf = !!course.pdf_url

  // If no content, show message
  if (!hasVideo && !hasPdf) {
    return (
      <div className="container mx-auto p-6">
        <Card className="clay-card p-12 text-center transition-smooth">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No content available</h3>
          <p className="text-muted-foreground">
            This course doesn&apos;t have any video or PDF content yet.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-180px)]">
      {/* View Controls - Teal theme */}
      <div className="border-b bg-gradient-to-r from-secondary/30 to-primary/5">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            {hasVideo && hasPdf && (
              <Button
                variant={activeView === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('split')}
                className={activeView === 'split' ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary transition-smooth'}
              >
                Split View
              </Button>
            )}
            {hasVideo && (
              <Button
                variant={activeView === 'video' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('video')}
                className={activeView === 'video' ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary transition-smooth'}
              >
                <Video className="mr-2 h-4 w-4" />
                Video Only
              </Button>
            )}
            {hasPdf && (
              <Button
                variant={activeView === 'pdf' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('pdf')}
                className={activeView === 'pdf' ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/10 hover:text-primary transition-smooth'}
              >
                <FileText className="mr-2 h-4 w-4" />
                Slides Only
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary transition-smooth"
          >
            {isFullscreen ? (
              <><Minimize2 className="mr-2 h-4 w-4" /> Exit Fullscreen</>
            ) : (
              <><Maximize2 className="mr-2 h-4 w-4" /> Fullscreen</>
            )}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className={`${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-background'
            : 'container mx-auto h-full'
        }`}
      >
        <div className="h-full p-4">
          {/* Split View */}
          {activeView === 'split' && hasVideo && hasPdf && (
            <div className="grid lg:grid-cols-2 gap-4 h-full">
              {/* Video Section */}
              <Card className="clay-card overflow-hidden flex flex-col transition-smooth">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                    <Video className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">Video</span>
                </div>
                <div className="flex-1 bg-black">
                  {videoEmbedUrl?.endsWith('.mp4') || videoEmbedUrl?.endsWith('.webm') || videoEmbedUrl?.includes('supabase.co/storage') ? (
                    <CustomVideoPlayer
                      src={videoEmbedUrl}
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={videoEmbedUrl || ''}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </Card>

              {/* PDF Section */}
              <Card className="clay-card overflow-hidden flex flex-col transition-smooth">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">Slides</span>
                </div>
                <div className="flex-1">
                  <iframe
                    src={`${course.pdf_url}#view=FitH`}
                    className="w-full h-full"
                    title="Course Slides"
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Video Only */}
          {activeView === 'video' && hasVideo && (
            <Card className="clay-card h-full overflow-hidden flex flex-col transition-smooth">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <Video className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-medium text-sm">Video</span>
              </div>
              <div className="flex-1 bg-black">
                {videoEmbedUrl?.endsWith('.mp4') || videoEmbedUrl?.endsWith('.webm') || videoEmbedUrl?.includes('supabase.co/storage') ? (
                  <CustomVideoPlayer
                    src={videoEmbedUrl}
                    className="w-full h-full"
                  />
                ) : (
                  <iframe
                    src={videoEmbedUrl || ''}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </Card>
          )}

          {/* PDF Only */}
          {activeView === 'pdf' && hasPdf && (
            <Card className="clay-card h-full overflow-hidden flex flex-col transition-smooth">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-medium text-sm">Slides</span>
              </div>
              <div className="flex-1">
                <iframe
                  src={`${course.pdf_url}#view=FitH`}
                  className="w-full h-full"
                  title="Course Slides"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
