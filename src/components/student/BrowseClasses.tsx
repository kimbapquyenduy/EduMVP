'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { GraduationCap, Users, BookOpen, Loader2, Check, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Class {
  id: string
  teacher_id: string
  name: string
  description: string | null
  price: number
  thumbnail_url: string | null
  is_published: boolean
  created_at: string
  profiles: {
    full_name: string
  }
  courses_count: number
  members_count: number
  is_enrolled: boolean
}

interface BrowseClassesProps {
  userId: string
}

export function BrowseClasses({ userId }: BrowseClassesProps) {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadClasses()
  }, [userId])

  const loadClasses = async () => {
    setLoading(true)

    // Get all published classes with denormalized counts (bypasses RLS visibility issue)
    const { data: allClasses, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        profiles:teacher_id (full_name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (classesError || !allClasses) {
      setLoading(false)
      return
    }

    // Get user's memberships
    const { data: memberships } = await supabase
      .from('memberships')
      .select('class_id')
      .eq('user_id', userId)

    const enrolledClassIds = new Set(memberships?.map((m) => m.class_id) || [])

    // Map classes with enrollment status - counts come from denormalized columns
    const classesWithCounts = allClasses.map((classItem) => ({
      ...classItem,
      courses_count: classItem.course_count || 0,
      members_count: classItem.member_count || 0,
      is_enrolled: enrolledClassIds.has(classItem.id),
    }))

    setClasses(classesWithCounts as Class[])
    setLoading(false)
  }

  const handleJoinClass = async (classId: string) => {
    setJoining(classId)

    const { error } = await supabase.from('memberships').insert({
      class_id: classId,
      user_id: userId,
      status: 'ACTIVE',
    })

    if (!error) {
      loadClasses()
      router.refresh()
    }
    setJoining(null)
  }

  const filteredClasses = classes.filter((classItem) =>
    classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classItem.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classItem.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search classes by name, description, or teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 focus-visible:ring-primary"
        />
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No classes found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'No published classes available yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="clay-card overflow-hidden hover:shadow-lg transition-smooth">
              {classItem.thumbnail_url && (
                <div className="aspect-video bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
                  <img
                    src={classItem.thumbnail_url}
                    alt={classItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {!classItem.thumbnail_url && (
                <div className="aspect-video bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <GraduationCap className="h-16 w-16 text-white opacity-50" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg">{classItem.name}</CardTitle>
                  <Badge variant={classItem.price > 0 ? 'default' : 'secondary'}>
                    {classItem.price > 0 ? `$${classItem.price}/mo` : 'Free'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {classItem.description || 'No description'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <strong>Teacher:</strong> {classItem.profiles?.full_name || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {classItem.members_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {classItem.courses_count}
                    </div>
                  </div>
                  {classItem.is_enrolled ? (
                    <Button className="w-full" variant="outline" disabled>
                      <Check className="mr-2 h-4 w-4" />
                      Enrolled
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleJoinClass(classItem.id)}
                      disabled={joining === classItem.id}
                    >
                      {joining === classItem.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>Join Class</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
