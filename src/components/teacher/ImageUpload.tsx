'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImageUploadProps {
  onUploadComplete: (url: string) => void
  currentUrl?: string | null
}

export function ImageUpload({ onUploadComplete, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageUrl, setImageUrl] = useState(currentUrl || '')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, WebP, etc.)',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    setProgress(0)
    setFileName(file.name)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('course-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-images')
        .getPublicUrl(data.path)

      setImageUrl(publicUrl)
      onUploadComplete(publicUrl)
      setProgress(100)

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setImageUrl('')
    setFileName('')
    setProgress(0)
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {!imageUrl ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />

          <label
            htmlFor="image-upload"
            className={`
              flex flex-col items-center justify-center w-full h-32
              border-2 border-dashed rounded-lg cursor-pointer
              hover:bg-muted/50 transition-colors
              ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-muted-foreground/25'}
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3 w-full px-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="w-full max-w-xs">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center mt-2 text-muted-foreground">
                    Uploading {fileName}... {progress}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP (Max 5MB)
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Image uploaded</p>
                <p className="text-xs text-muted-foreground">{fileName || 'Image file'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Preview */}
          <div className="mt-3 rounded-lg overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt="Thumbnail preview"
              className="w-full h-40 object-cover"
            />
          </div>
        </div>
      )}
    </div>
  )
}
