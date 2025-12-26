'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'

export interface ClassMember {
  id: string
  full_name: string | null
  email: string
  role: 'teacher' | 'student'
}

// Type for Supabase join results
interface ProfileData {
  id: string
  full_name: string | null
  email: string
}

interface ClassWithTeacher {
  teacher_id: string
  profiles: ProfileData | null
}

interface MembershipWithProfile {
  profiles: ProfileData | null
}

/**
 * Hook to fetch all members of a class (teacher + students)
 * Excludes current user from the list (can't DM yourself)
 * Used for class-scoped DM member picker
 */
export function useClassMembers(classId: string | null, currentUserId: string) {
  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    if (!classId) {
      setMembers([])
      return
    }

    async function fetchMembers() {
      const supabase = createClient()
      setLoading(true)

      try {
        // Get teacher info from class
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('teacher_id, profiles:teacher_id(id, full_name, email)')
          .eq('id', classId)
          .single()

        if (classError) throw classError

        // Get students with active membership
        const { data: studentData, error: studentError } = await supabase
          .from('memberships')
          .select('profiles:user_id(id, full_name, email)')
          .eq('class_id', classId)
          .eq('status', 'ACTIVE')

        if (studentError) throw studentError

        // Bail if unmounted
        if (!isMountedRef.current) return

        const all: ClassMember[] = []
        const typedClassData = classData as ClassWithTeacher | null
        const typedStudentData = studentData as MembershipWithProfile[] | null

        // Add teacher (if not current user)
        if (typedClassData?.profiles && typedClassData.profiles.id !== currentUserId) {
          all.push({
            id: typedClassData.profiles.id,
            full_name: typedClassData.profiles.full_name,
            email: typedClassData.profiles.email,
            role: 'teacher'
          })
        }

        // Add students (exclude current user)
        typedStudentData?.forEach(m => {
          if (m.profiles && m.profiles.id !== currentUserId) {
            all.push({
              id: m.profiles.id,
              full_name: m.profiles.full_name,
              email: m.profiles.email,
              role: 'student'
            })
          }
        })

        setMembers(all)
        setError(null)
      } catch (err) {
        if (!isMountedRef.current) return
        console.error('Failed to fetch class members:', err)
        setError('Failed to load class members')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchMembers()

    return () => {
      isMountedRef.current = false
    }
  }, [classId, currentUserId])

  return { members, loading, error }
}
