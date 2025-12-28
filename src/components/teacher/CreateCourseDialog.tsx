'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Link as LinkIcon, Upload, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { VideoUpload } from './VideoUpload'
import { ImageUpload } from './ImageUpload'

interface CreateCourseDialogProps {
  classId: string
  onCourseCreated?: () => void
}

export function CreateCourseDialog({ classId, onCourseCreated }: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [promoVideoUrl, setPromoVideoUrl] = useState('')
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    // Get promo video URL from either upload or input
    const finalPromoVideoUrl = promoVideoUrl || (formData.get('promo_video_url_input') as string) || null
    const finalThumbnailUrl = thumbnailImageUrl || (formData.get('thumbnail_url_input') as string) || null

    const courseData = {
      class_id: classId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      tier: formData.get('tier') as 'FREE' | 'PREMIUM',
      promo_video_url: finalPromoVideoUrl,
      thumbnail_url: finalThumbnailUrl,
    }

    const { error } = await supabase.from('courses').insert(courseData)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Course created successfully',
      })
      setOpen(false)
      setPromoVideoUrl('')
      setThumbnailImageUrl('')
      onCourseCreated?.()
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription className="mt-1.5">
                Add a new course with promotional content. Teaching materials (videos & slides) will be added as lessons inside the course.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Introduction to Web Development"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Learn the fundamentals of web development..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier">Access Tier *</Label>
              <Select name="tier" defaultValue="FREE" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Promo Video Section */}
            <div className="space-y-3">
              <Label>Promotional Video (Optional)</Label>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    External URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <VideoUpload
                    onUploadComplete={setPromoVideoUrl}
                    currentUrl={promoVideoUrl}
                  />
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <div className="space-y-2">
                    <Input
                      name="promo_video_url_input"
                      type="url"
                      placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ"
                      disabled={!!promoVideoUrl}
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Supported formats:</p>
                      <ul className="list-disc list-inside pl-2 space-y-0.5">
                        <li>YouTube: https://youtube.com/watch?v=VIDEO_ID</li>
                        <li>Vimeo: https://vimeo.com/VIDEO_ID</li>
                        <li>Direct MP4: https://example.com/video.mp4</li>
                      </ul>
                    </div>
                    {promoVideoUrl && (
                      <p className="text-sm text-amber-600">
                        You already uploaded a video. Remove it to use a URL instead.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Thumbnail Section */}
            <div className="space-y-3">
              <Label>Course Thumbnail Image</Label>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Image URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <ImageUpload
                    onUploadComplete={setThumbnailImageUrl}
                    currentUrl={thumbnailImageUrl}
                  />
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <div className="space-y-2">
                    <Input
                      name="thumbnail_url_input"
                      type="url"
                      placeholder="https://example.com/thumbnail.jpg"
                      disabled={!!thumbnailImageUrl}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to an image that represents this course
                    </p>
                    {thumbnailImageUrl && (
                      <p className="text-sm text-amber-600">
                        You already uploaded an image. Remove it to use a URL instead.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="border-t px-6 py-4 bg-background sticky bottom-0 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
