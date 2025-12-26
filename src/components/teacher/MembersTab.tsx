'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface Member {
  id: string
  status: string
  joined_at: string
  user: {
    full_name: string | null
    email: string
  }
}

interface MembersTabProps {
  classId: string
}

export function MembersTab({ classId }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [classId])

  const loadMembers = async () => {
    const supabase = createClient()
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
      .eq('class_id', classId)
      .order('joined_at', { ascending: false })

    if (!error && data) {
      // Transform data to match Member type
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          {members.length} Member{members.length !== 1 ? 's' : ''}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Students who have joined your class
        </p>
      </div>

      {members.length > 0 ? (
        <div className="grid gap-3">
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
        </div>
      ) : (
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
  )
}
