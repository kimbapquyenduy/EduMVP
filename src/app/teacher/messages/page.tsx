import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AppHeader } from '@/components/shared/AppHeader'
import { Loader2 } from 'lucide-react'

// Dynamic import for code-splitting heavy messaging component
const MessagingInterface = dynamic(
  () => import('@/components/shared/MessagingInterface').then(mod => mod.MessagingInterface),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

export default async function MessagesPage() {
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
