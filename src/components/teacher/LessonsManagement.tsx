'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayCircle, FileText, Plus, Edit, Trash2, GripVertical, Loader2, CheckCircle, Upload, Link as LinkIcon, Download, ExternalLink, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VideoUpload } from './VideoUpload'
import { PDFUpload } from './PDFUpload'
import { RichTextEditor } from '../shared/RichTextEditor'
import { LessonTierSelector } from './LessonTierSelector'

type TierLevel = 0 | 1 | 2 | 3 | null

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  pdf_url: string | null
  order_index: number
  duration_minutes: number | null
  required_tier_level: TierLevel
  created_at: string
}

interface LessonsManagementProps {
  courseId: string
  classId: string
}

export function LessonsManagement({ courseId, classId }: LessonsManagementProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [descriptionContent, setDescriptionContent] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadLessons()
  }, [courseId])

  const loadLessons = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (!error && data) {
      setLessons(data)
      if (data.length > 0 && !selectedLesson) {
        setSelectedLesson(data[0])
      }
    }
    setLoading(false)
  }

  const handleCreateLesson = async (formData: FormData) => {
    setSaving(true)
    const title = formData.get('title') as string
    const video_url_input = formData.get('video_url_input') as string
    const pdf_url_input = formData.get('pdf_url_input') as string
    const duration_minutes = formData.get('duration_minutes') as string

    // Use uploaded URL or input URL
    const finalVideoUrl = videoUrl || video_url_input || null
    const finalPdfUrl = pdfUrl || pdf_url_input || null

    const { error } = await supabase.from('lessons').insert({
      course_id: courseId,
      title,
      description: descriptionContent || null,
      video_url: finalVideoUrl,
      pdf_url: finalPdfUrl,
      duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
      order_index: lessons.length,
    })

    if (!error) {
      setIsDialogOpen(false)
      setVideoUrl('')
      setPdfUrl('')
      setDescriptionContent('')
      loadLessons()
    }
    setSaving(false)
  }

  const handleUpdateLesson = async (lessonId: string, formData: FormData) => {
    setSaving(true)
    const title = formData.get('title') as string
    const video_url_input = formData.get('video_url_input') as string
    const pdf_url_input = formData.get('pdf_url_input') as string
    const duration_minutes = formData.get('duration_minutes') as string

    // Use uploaded URL or input URL, or keep existing
    const finalVideoUrl = videoUrl || video_url_input || selectedLesson?.video_url || null
    const finalPdfUrl = pdfUrl || pdf_url_input || selectedLesson?.pdf_url || null

    const { error } = await supabase
      .from('lessons')
      .update({
        title,
        description: descriptionContent || selectedLesson?.description || null,
        video_url: finalVideoUrl,
        pdf_url: finalPdfUrl,
        duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
      })
      .eq('id', lessonId)

    if (!error) {
      setIsDialogOpen(false)
      setIsEditing(false)
      setVideoUrl('')
      setPdfUrl('')
      setDescriptionContent('')
      loadLessons()
    }
    setSaving(false)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)

    if (!error) {
      loadLessons()
      setSelectedLesson(null)
    }
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'No duration set'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Convert video URL to embed format
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Lessons List Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Lessons</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setIsEditing(false)
                  setVideoUrl('')
                  setPdfUrl('')
                  setDescriptionContent('')
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
                  <div className="flex items-center justify-between">
                    <DialogTitle>
                      {isEditing ? 'Edit Lesson' : 'Create New Lesson'}
                    </DialogTitle>
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogClose>
                  </div>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    if (isEditing && selectedLesson) {
                      handleUpdateLesson(selectedLesson.id, formData)
                    } else {
                      handleCreateLesson(formData)
                    }
                  }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    <div>
                      <Label htmlFor="title">Lesson Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={isEditing ? selectedLesson?.title : ''}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <RichTextEditor
                      content={descriptionContent}
                      onChange={setDescriptionContent}
                      placeholder="Describe what students will learn in this lesson..."
                    />
                  </div>
                  {/* Video Section */}
                  <div className="space-y-2">
                    <Label>Lesson Video</Label>
                    <Tabs defaultValue="upload" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Video
                        </TabsTrigger>
                        <TabsTrigger value="url">
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Video URL
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="upload" className="mt-4">
                        <VideoUpload
                          onUploadComplete={setVideoUrl}
                          currentUrl={videoUrl || (isEditing ? selectedLesson?.video_url : null)}
                        />
                      </TabsContent>

                      <TabsContent value="url" className="mt-4">
                        <Input
                          name="video_url_input"
                          type="url"
                          placeholder="https://youtube.com/watch?v=... or direct MP4 link"
                          disabled={!!videoUrl}
                          defaultValue={isEditing ? selectedLesson?.video_url || '' : ''}
                        />
                        {videoUrl && (
                          <p className="text-sm text-amber-600 mt-2">
                            You already uploaded a video. Remove it to use a URL instead.
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* PDF Section */}
                  <div className="space-y-2">
                    <Label>Lesson Slides/Materials (PDF)</Label>
                    <Tabs defaultValue="upload" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload PDF
                        </TabsTrigger>
                        <TabsTrigger value="url">
                          <LinkIcon className="mr-2 h-4 w-4" />
                          PDF URL
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="upload" className="mt-4">
                        <PDFUpload
                          onUploadComplete={setPdfUrl}
                          currentUrl={pdfUrl || (isEditing ? selectedLesson?.pdf_url : null)}
                        />
                      </TabsContent>

                      <TabsContent value="url" className="mt-4">
                        <Input
                          name="pdf_url_input"
                          type="url"
                          placeholder="https://example.com/slides.pdf"
                          disabled={!!pdfUrl}
                          defaultValue={isEditing ? selectedLesson?.pdf_url || '' : ''}
                        />
                        {pdfUrl && (
                          <p className="text-sm text-amber-600 mt-2">
                            You already uploaded a PDF. Remove it to use a URL instead.
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      min="1"
                      placeholder="e.g., 30"
                      defaultValue={isEditing ? selectedLesson?.duration_minutes || '' : ''}
                    />
                  </div>
                  </div>
                  <div className="border-t px-6 py-4 bg-background sticky bottom-0 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isEditing ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No lessons yet. Create one to get started!
              </div>
            ) : (
              lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLesson(lesson)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedLesson(lesson)
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
                    selectedLesson?.id === lesson.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{lesson.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {lesson.duration_minutes && (
                          <span>{formatDuration(lesson.duration_minutes)}</span>
                        )}
                        {lesson.video_url && (
                          <PlayCircle className="h-3 w-3" />
                        )}
                        {lesson.pdf_url && (
                          <FileText className="h-3 w-3" />
                        )}
                      </div>
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <LessonTierSelector
                          lessonId={lesson.id}
                          currentTier={lesson.required_tier_level}
                          onTierChange={(newTier) => {
                            setLessons((prev) =>
                              prev.map((l) =>
                                l.id === lesson.id
                                  ? { ...l, required_tier_level: newTier }
                                  : l
                              )
                            )
                            if (selectedLesson?.id === lesson.id) {
                              setSelectedLesson((prev) =>
                                prev ? { ...prev, required_tier_level: newTier } : null
                              )
                            }
                          }}
                          compact
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lesson Content Viewer */}
      <div className="lg:col-span-2">
        {selectedLesson ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        Lesson {lessons.findIndex((l) => l.id === selectedLesson.id) + 1}
                      </Badge>
                      {selectedLesson.duration_minutes && (
                        <Badge variant="outline">
                          {formatDuration(selectedLesson.duration_minutes)}
                        </Badge>
                      )}
                      <LessonTierSelector
                        lessonId={selectedLesson.id}
                        currentTier={selectedLesson.required_tier_level}
                        onTierChange={(newTier) => {
                          setLessons((prev) =>
                            prev.map((l) =>
                              l.id === selectedLesson.id
                                ? { ...l, required_tier_level: newTier }
                                : l
                            )
                          )
                          setSelectedLesson((prev) =>
                            prev ? { ...prev, required_tier_level: newTier } : null
                          )
                        }}
                      />
                    </div>
                    <CardTitle className="text-2xl">{selectedLesson.title}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(true)
                        setVideoUrl('')
                        setPdfUrl('')
                        setDescriptionContent(selectedLesson?.description || '')
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteLesson(selectedLesson.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-0">
                {/* Video Player - Full Width */}
                {selectedLesson.video_url && (
                  <div className="aspect-video bg-black w-full">
                    {getVideoUrl(selectedLesson.video_url)?.includes('supabase.co/storage') ? (
                      <video
                        src={getVideoUrl(selectedLesson.video_url) || ''}
                        controls
                        className="w-full h-full"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <iframe
                        src={getVideoUrl(selectedLesson.video_url) || ''}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    )}
                  </div>
                )}

                {/* Description & Materials - Below Video */}
                <div className="px-6 pb-6 space-y-6">
                  {/* Description */}
                  {selectedLesson.description && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">About this Lesson</h3>
                      <div
                        className="prose prose-sm max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: selectedLesson.description }}
                      />
                    </div>
                  )}

                  {/* PDF Materials - Clickable Card */}
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
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No lesson selected</h3>
              <p className="text-muted-foreground">
                Select a lesson from the sidebar or create a new one
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
