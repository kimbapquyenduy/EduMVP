import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { MessagingInterface } from '@/components/shared/MessagingInterface'

export default async function StudentMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'STUDENT') redirect('/teacher/messages')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile.full_name || undefined}
        userRole={profile.role}
        userId={user.id}
      />

      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <MessagingInterface userId={user.id} userRole={profile.role} />
      </div>
    </div>
  )
}
