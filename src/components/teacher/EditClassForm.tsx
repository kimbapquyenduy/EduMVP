'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from './ImageUpload'
import type { Class } from '@/lib/types/database.types'

interface EditClassFormProps {
  classData: Class
}

export function EditClassForm({ classData }: EditClassFormProps) {
  const [loading, setLoading] = useState(false)
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState(classData.thumbnail_url || '')
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    // Get thumbnail URL from either upload or input
    const finalThumbnailUrl = thumbnailImageUrl || (formData.get('thumbnail_url_input') as string) || null

    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      is_published: formData.get('is_published') === 'on',
      thumbnail_url: finalThumbnailUrl,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', classData.id)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Class updated successfully',
      })
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={classData.name}
              required
              placeholder="Web Development Masterclass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={classData.description || ''}
              rows={4}
              placeholder="Describe what your class is about..."
            />
          </div>

          {/* Thumbnail Section */}
          <div className="space-y-3">
            <Label>Class Thumbnail Image</Label>
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
                    defaultValue={classData.thumbnail_url || ''}
                    disabled={!!thumbnailImageUrl && thumbnailImageUrl !== classData.thumbnail_url}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to an image that represents this class (recommended: 1200x400px)
                  </p>
                  {thumbnailImageUrl && thumbnailImageUrl !== classData.thumbnail_url && (
                    <p className="text-sm text-amber-600">
                      You already uploaded an image. Remove it to use a URL instead.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (USD/month)</Label>
            <Select name="price" defaultValue={classData.price.toString()}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Free</SelectItem>
                <SelectItem value="5">$5/month</SelectItem>
                <SelectItem value="10">$10/month</SelectItem>
                <SelectItem value="20">$20/month</SelectItem>
                <SelectItem value="30">$30/month</SelectItem>
                <SelectItem value="50">$50/month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_published">Published Status</Label>
              <div className="text-sm text-muted-foreground">
                Make this class visible to students
              </div>
            </div>
            <Switch
              id="is_published"
              name="is_published"
              defaultChecked={classData.is_published}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
