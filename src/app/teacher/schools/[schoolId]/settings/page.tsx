import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EditSchoolForm } from '@/components/teacher/EditSchoolForm'
import { DeleteSchoolButton } from '@/components/teacher/DeleteSchoolButton'

export default async function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>
}) {
  const { schoolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get school data
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .eq('teacher_id', user.id)
    .single()

  if (!school) redirect('/teacher/dashboard')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
      />

      <div className="container mx-auto p-6 max-w-3xl">
        <Link href={`/teacher/schools/${schoolId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to School
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">School Settings</h1>
            <p className="text-muted-foreground">
              Manage your school information and settings
            </p>
          </div>

          <EditSchoolForm school={school} />

          <div className="pt-8 border-t">
            <h2 className="text-xl font-bold mb-2 text-destructive">Danger Zone</h2>
            <p className="text-muted-foreground mb-4">
              Once you delete a school, there is no going back. All courses and members will be removed.
            </p>
            <DeleteSchoolButton schoolId={schoolId} schoolName={school.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
