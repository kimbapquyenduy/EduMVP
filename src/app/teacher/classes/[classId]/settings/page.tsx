import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/shared/AppHeader'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EditClassForm } from '@/components/teacher/EditClassForm'
import { DeleteClassButton } from '@/components/teacher/DeleteClassButton'
import { TierPricingForm } from '@/components/teacher/TierPricingForm'

export default async function ClassSettingsPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get teacher profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get class data
  const { data: classData } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('teacher_id', user.id)
    .single()

  if (!classData) redirect('/teacher/dashboard')

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader
        userEmail={user.email}
        userName={profile?.full_name || undefined}
        userRole={profile?.role}
        userId={user.id}
      />

      <div className="container mx-auto p-6 max-w-3xl">
        <Link href={`/teacher/classes/${classId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Class Settings</h1>
            <p className="text-muted-foreground">
              Manage your class information and settings
            </p>
          </div>

          <EditClassForm classData={classData} />

          {/* Subscription Tiers Section */}
          <div className="pt-6">
            <TierPricingForm classId={classId} />
          </div>

          <div className="pt-8 border-t">
            <h2 className="text-xl font-bold mb-2 text-destructive">Danger Zone</h2>
            <p className="text-muted-foreground mb-4">
              Once you delete a class, there is no going back. All courses and members will be removed.
            </p>
            <DeleteClassButton classId={classId} className={classData.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
