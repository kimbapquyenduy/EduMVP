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
  profiles: ProfileData | ProfileData[] | null
}

interface MembershipWithProfile {
  profiles: ProfileData | ProfileData[] | null
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
        // Handle both single object and array cases from Supabase join
        const teacherProfile = typedClassData?.profiles
          ? (Array.isArray(typedClassData.profiles) ? typedClassData.profiles[0] : typedClassData.profiles)
          : null
        if (teacherProfile && teacherProfile.id !== currentUserId) {
          all.push({
            id: teacherProfile.id,
            full_name: teacherProfile.full_name,
            email: teacherProfile.email,
            role: 'teacher'
          })
        }

        // Add students (exclude current user)
        typedStudentData?.forEach(m => {
          const profile = m.profiles
            ? (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)
            : null
          if (profile && profile.id !== currentUserId) {
            all.push({
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
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
