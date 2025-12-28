'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Loader2, MessageSquare, Bell } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { ChatDropdown } from './ChatDropdown'

interface AppHeaderProps {
  userEmail?: string
  userName?: string
  userRole?: 'TEACHER' | 'STUDENT'
  userId?: string
}

export function AppHeader({ userEmail, userName, userRole, userId }: AppHeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setLoggingOut(false)
    } else {
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      })
      router.push('/login')
      router.refresh()
    }
  }

  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.slice(0, 2).toUpperCase() || 'U'

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={userRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'} className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src="/Neurons-AI-Logo-Wide-900-x-300-px-Transparent.png"
            alt="NeuronsAI"
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          {userRole && (
            <div className="hidden sm:block mr-2">
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="text-sm font-medium capitalize">{userRole.toLowerCase()}</div>
            </div>
          )}

          {/* Chat Dropdown - Skool style */}
          {userId && userRole && (
            <ChatDropdown userId={userId} userRole={userRole} />
          )}

          {/* Notifications Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={userRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={userRole === 'TEACHER' ? '/teacher/messages' : '/student/messages'} className="cursor-pointer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Messages</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={loggingOut} className="text-destructive focus:text-destructive cursor-pointer">
                {loggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
