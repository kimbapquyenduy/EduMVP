'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'

export default function NewSchoolPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: createError } = await supabase
      .from('schools')
      .insert({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        teacher_id: user.id,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    router.push(`/teacher/schools/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="container mx-auto p-6">
          <Link href="/teacher/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Create New School</h1>
          <p className="text-muted-foreground mt-1">
            Set up your learning community and start teaching
          </p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>School Details</CardTitle>
            <CardDescription>
              Fill in the information about your school. You can edit this later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div>
                <Label htmlFor="name">
                  School Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Web Development Masterclass"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a clear, descriptive name for your school
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What will students learn in this school?"
                  rows={5}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe what students will learn and why they should join
                </p>
              </div>

              <div>
                <Label htmlFor="price">Membership Price</Label>
                <Select
                  value={formData.price}
                  onValueChange={(value) => setFormData({ ...formData, price: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Free</SelectItem>
                    <SelectItem value="5">$5/month</SelectItem>
                    <SelectItem value="10">$10/month</SelectItem>
                    <SelectItem value="20">$20/month</SelectItem>
                    <SelectItem value="50">$50/month</SelectItem>
                    <SelectItem value="99">$99/month</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>MVP Note:</strong> This is a simulation. No actual payment processing
                    will occur. This setting controls which content tier students can access.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !formData.name} className="flex-1">
                  {loading ? 'Creating...' : 'Create School'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Your school will be created and set to active</li>
              <li>✓ You can add courses and learning materials</li>
              <li>✓ Students can discover and join your school</li>
              <li>✓ You can manage members and post to the community feed</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
