'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUserClasses } from '@/hooks/useUserClasses'
import { useClassMembers } from '@/hooks/useClassMembers'
import { MessageSquarePlus, Loader2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StartDMDialogProps {
  userId: string
  userRole: string
}

/**
 * Dialog for starting a new DM conversation
 * User selects class first, then picks a classmate to message
 * Checks for existing conversation before creating new one
 */
export function StartDMDialog({ userId, userRole }: StartDMDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const { classes, loading: classesLoading } = useUserClasses(userId)
  const { members, loading: membersLoading } = useClassMembers(selectedClassId, userId)

  // Reset state when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedClassId(null)
      setSelectedUserId(null)
      setError(null)
    }
  }

  const handleStartDM = async () => {
    if (!selectedClassId || !selectedUserId) return
    setCreating(true)
    setError(null)

    try {
      // Use atomic RPC function that handles:
      // 1. Security validation (caller & target are class members)
      // 2. Existing conversation check (returns existing if found)
      // 3. Conversation + participants creation in one transaction
      const { data: conversationId, error: rpcError } = await supabase.rpc(
        'create_dm_conversation',
        {
          p_class_id: selectedClassId,
          p_target_user_id: selectedUserId,
        }
      )

      if (rpcError) {
        console.error('Failed to create conversation:', rpcError)
        setError(rpcError.message || 'Failed to create conversation')
        setCreating(false)
        return
      }

      // Navigate to conversation (new or existing)
      router.push(`/${userRole.toLowerCase()}/messages?conversation=${conversationId}`)
      setOpen(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setCreating(false)
    }
  }

  const selectedMember = members.find((m) => m.id === selectedUserId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Class Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Class</label>
            {classesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                You are not enrolled in any classes yet.
              </div>
            ) : (
              <Select
                onValueChange={(value) => {
                  setSelectedClassId(value)
                  setSelectedUserId(null) // Reset member when class changes
                }}
                value={selectedClassId || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.name}
                        <Badge variant="outline" className="text-xs">
                          {c.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Member Picker */}
          {selectedClassId && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Member</label>
              {membersLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  No other members in this class.
                </div>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedUserId(m.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                        selectedUserId === m.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{m.full_name || m.email}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {m.role}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected member preview */}
          {selectedMember && (
            <div className="p-3 bg-muted/50 rounded-md text-sm">
              <span className="text-muted-foreground">Message to: </span>
              <span className="font-medium">
                {selectedMember.full_name || selectedMember.email}
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleStartDM}
            disabled={!selectedClassId || !selectedUserId || creating}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Conversation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
