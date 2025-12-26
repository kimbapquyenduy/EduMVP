'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'

export interface UserClass {
  id: string
  name: string
  role: 'teacher' | 'student'
}

// Type for Supabase join result
interface MembershipWithClass {
  classes: { id: string; name: string } | null
}

/**
 * Hook to fetch all classes a user belongs to (as teacher or student)
 * Used for class-scoped DM feature - user can only message classmates
 */
export function useUserClasses(userId: string) {
  const [classes, setClasses] = useState<UserClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    async function fetchClasses() {
      const supabase = createClient()
      try {
        // Classes where user is teacher
        const { data: teacherClasses, error: teacherError } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', userId)

        if (teacherError) throw teacherError

        // Classes where user is student (active membership)
        const { data: studentClasses, error: studentError } = await supabase
          .from('memberships')
          .select('classes(id, name)')
          .eq('user_id', userId)
          .eq('status', 'ACTIVE')

        if (studentError) throw studentError

        // Bail if unmounted
        if (!isMountedRef.current) return

        const all: UserClass[] = [
          ...(teacherClasses?.map(c => ({ ...c, role: 'teacher' as const })) || []),
          ...((studentClasses as MembershipWithClass[] | null)
            ?.filter(m => m.classes)
            .map(m => ({
              id: m.classes!.id,
              name: m.classes!.name,
              role: 'student' as const
            })) || [])
        ]

        setClasses(all)
        setError(null)
      } catch (err) {
        if (!isMountedRef.current) return
        console.error('Failed to fetch user classes:', err)
        setError('Failed to load classes')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    if (userId) {
      setLoading(true)
      fetchClasses()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [userId])

  return { classes, loading, error }
}
