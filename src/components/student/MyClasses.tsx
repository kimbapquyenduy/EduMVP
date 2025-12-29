'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, GraduationCap, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface EnrolledClass {
  id: string
  class_id: string
  status: string
  joined_at: string
  classes: {
    id: string
    name: string
    description: string | null
    price: number
    thumbnail_url: string | null
    is_published: boolean
    teacher_id: string
    profiles: {
      full_name: string
    }
  }
}

interface MyClassesProps {
  userId: string
}

export function MyClasses({ userId }: MyClassesProps) {
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([])
  const [loading, setLoading] = useState(true)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadEnrolledClasses()
  }, [userId])

  const loadEnrolledClasses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        classes:class_id (
          *,
          profiles:teacher_id (full_name)
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })

    if (!error && data) {
      setEnrolledClasses(data as EnrolledClass[])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (enrolledClasses.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No enrolled classes yet</h3>
          <p className="text-muted-foreground mb-6">
            Browse available classes and join one to start learning!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enrolledClasses.map((enrollment) => {
        const classData = enrollment.classes

        return (
          <Card key={enrollment.id} className="clay-card overflow-hidden hover:shadow-lg transition-smooth">
            {classData.thumbnail_url ? (
              <div className="aspect-video bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
                <Image
                  src={classData.thumbnail_url}
                  alt={classData.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="h-16 w-16 text-white opacity-50" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{classData.name}</CardTitle>
                <Badge variant={classData.price > 0 ? 'default' : 'secondary'}>
                  {classData.price > 0 ? `$${classData.price}/mo` : 'Free'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {classData.description || 'No description'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Teacher:</strong> {classData.profiles?.full_name || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Joined:</strong> {new Date(enrollment.joined_at).toLocaleDateString()}
                </div>
                <Badge variant="outline" className="capitalize">
                  {enrollment.status}
                </Badge>
                <Button
                  className="w-full mt-2"
                  disabled={navigatingTo !== null}
                  onClick={() => {
                    setNavigatingTo(classData.id)
                    router.push(`/student/classes/${classData.id}`)
                  }}
                >
                  {navigatingTo === classData.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Going to class...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      View Class
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
