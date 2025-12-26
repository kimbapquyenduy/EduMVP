'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, Crown } from 'lucide-react'

interface Member {
  id: string
  status: string
  joined_at: string
  user: {
    full_name: string | null
    email: string
  }
}

interface Teacher {
  full_name: string | null
  email: string
  created_at: string
}

interface MembersTabProps {
  classId?: string
  schoolId?: string
}

export function MembersTab({ classId, schoolId }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)

  const entityId = classId || schoolId
  const entityType = classId ? 'class_id' : 'school_id'

  useEffect(() => {
    loadMembers()
  }, [entityId])

  const loadMembers = async () => {
    if (!entityId) return
    const supabase = createClient()

    // Fetch teacher info from class (only if classId provided)
    if (classId) {
      const { data: classData } = await supabase
        .from('classes')
        .select(`
          created_at,
          profiles:teacher_id (
            full_name,
            email
          )
        `)
        .eq('id', classId)
        .single()

      if (classData?.profiles) {
        setTeacher({
          full_name: (classData.profiles as any).full_name,
          email: (classData.profiles as any).email,
          created_at: classData.created_at,
        })
      }
    }

    // Fetch members
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        id,
        status,
        joined_at,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq(entityType, entityId)
      .order('joined_at', { ascending: false })

    if (!error && data) {
      const transformedData = data.map((item: any) => ({
        id: item.id,
        status: item.status,
        joined_at: item.joined_at,
        user: {
          full_name: item.profiles?.full_name,
          email: item.profiles?.email,
        },
      }))
      setMembers(transformedData)
    }
    setLoading(false)
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return <div className="text-center py-12">Loading members...</div>
  }

  // Total count: teacher + students
  const totalMembers = (teacher ? 1 : 0) + members.length

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          {totalMembers} Member{totalMembers !== 1 ? 's' : ''}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Teacher and students in this class
        </p>
      </div>

      <div className="grid gap-3">
        {/* Teacher Card - Always first with distinctive styling */}
        {teacher && (
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="ring-2 ring-primary ring-offset-2 h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                      {getInitials(teacher.full_name, teacher.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">
                        {teacher.full_name || 'Teacher'}
                      </p>
                      <Crown className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {teacher.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(teacher.created_at)}
                    </p>
                  </div>
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-white border-0">
                    Teacher
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Members */}
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(member.user.full_name, member.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user.full_name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                  <Badge variant={member.status === 'PREMIUM' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty state only if no teacher and no members */}
        {!teacher && members.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No members yet</h3>
              <p className="text-muted-foreground">
                Share your class link to get students to join
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
