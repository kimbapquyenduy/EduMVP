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
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { School } from '@/lib/types/database.types'

interface EditSchoolFormProps {
  school: School
}

export function EditSchoolForm({ school }: EditSchoolFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      is_active: formData.get('is_active') === 'on',
      cover_image: formData.get('cover_image') as string || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', school.id)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'School updated successfully',
      })
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">School Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={school.name}
              required
              placeholder="Web Development Masterclass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={school.description || ''}
              rows={4}
              placeholder="Describe what your school is about..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <Input
              id="cover_image"
              name="cover_image"
              type="url"
              defaultValue={school.cover_image || ''}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Direct link to an image (recommended: 1200x400px)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price (USD/month)</Label>
            <Select name="price" defaultValue={school.price.toString()}>
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
              <Label htmlFor="is_active">Active Status</Label>
              <div className="text-sm text-muted-foreground">
                Make this school visible to students
              </div>
            </div>
            <Switch
              id="is_active"
              name="is_active"
              defaultChecked={school.is_active}
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
