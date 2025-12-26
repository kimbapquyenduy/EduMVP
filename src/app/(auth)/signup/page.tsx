'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, BookOpen } from 'lucide-react'
import Link from 'next/link'

type UserRole = 'TEACHER' | 'STUDENT'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return

    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Redirect based on role
    router.push(role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard')
  }

  // Step 1: Role Selection
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Join EDU Platform</h1>
            <p className="text-muted-foreground">Choose your role to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Teacher Card */}
            <Card
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
              onClick={() => setRole('TEACHER')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">I am a Teacher</CardTitle>
                <CardDescription className="text-base">
                  Share your knowledge and build your teaching community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Create unlimited classes & communities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Upload videos & PDF materials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Set premium content tiers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Engage with students via community feed</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Student Card */}
            <Card
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
              onClick={() => setRole('STUDENT')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">I am a Student</CardTitle>
                <CardDescription className="text-base">
                  Learn from experts and join learning communities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Join multiple classes & communities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Access free learning content</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Unlock premium courses & materials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Chat directly with teachers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Step 2: Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Sign Up as {role === 'TEACHER' ? 'Teacher' : 'Student'}
              </CardTitle>
              <CardDescription className="mt-1">
                Create your account to get started
              </CardDescription>
            </div>
            {role === 'TEACHER' ? (
              <GraduationCap className="w-8 h-8 text-primary" />
            ) : (
              <BookOpen className="w-8 h-8 text-primary" />
            )}
          </div>
          <button
            onClick={() => setRole(null)}
            className="text-sm text-primary hover:underline mt-2 text-left"
          >
            ← Change role
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
