# Phase 2: UI Components - Start DM Dialog & Member Picker

**Parent Plan**: [plan.md](./plan.md)
**Dependencies**: [Phase 1](./phase-01-database-schema.md) (database schema)
**Status**: Blocked (waiting on Phase 1)
**Priority**: High

---

## Overview

Add "Start New Conversation" button with class-scoped member picker. Prevent duplicate conversations via DB function.

## Key Insights

1. `MembersTab.tsx` fetches members well - reuse query pattern
2. `MessagingInterface.tsx` lacks class context - needs prop enhancement
3. Teacher included via separate query (not in memberships)
4. Autocomplete from shadcn/ui + Command component

## Requirements

- [ ] R1: "New Message" button in MessagingInterface
- [ ] R2: Class selector (user's enrolled classes)
- [ ] R3: Member picker (classmates only, exclude self)
- [ ] R4: Check existing conversation before creating
- [ ] R5: Navigate to conversation after creation

## Architecture

```
MessagingInterface
├── [New Message] button (top right)
└── StartDMDialog (modal)
    ├── ClassSelector (dropdown)
    │   └── Fetch user's classes (memberships + owned)
    └── ClassMemberPicker (autocomplete)
        └── Fetch class members (students + teacher)

Flow:
1. User clicks "New Message"
2. Select class from dropdown
3. Search/select classmate
4. Check existing DM via find_existing_dm()
5. If exists → navigate to it
6. If not → create conversation + participants → navigate
```

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/shared/MessagingInterface.tsx` | Modify | Add New Message button |
| `src/components/shared/StartDMDialog.tsx` | Create | Modal with class + member selection |
| `src/components/shared/ClassMemberPicker.tsx` | Create | Autocomplete for classmates |
| `src/hooks/useUserClasses.ts` | Create | Fetch user's classes |
| `src/hooks/useClassMembers.ts` | Create | Fetch class members |

## Implementation Steps

### Step 1: Create useUserClasses Hook

```typescript
// src/hooks/useUserClasses.ts
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface UserClass {
  id: string
  name: string
  role: 'teacher' | 'student'
}

export function useUserClasses(userId: string) {
  const [classes, setClasses] = useState<UserClass[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchClasses() {
      // Classes where user is teacher
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', userId)

      // Classes where user is student
      const { data: studentClasses } = await supabase
        .from('memberships')
        .select('classes(id, name)')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')

      const all: UserClass[] = [
        ...(teacherClasses?.map(c => ({ ...c, role: 'teacher' as const })) || []),
        ...(studentClasses?.map(m => ({
          id: (m.classes as any).id,
          name: (m.classes as any).name,
          role: 'student' as const
        })) || [])
      ]

      setClasses(all)
      setLoading(false)
    }
    fetchClasses()
  }, [userId])

  return { classes, loading }
}
```

### Step 2: Create useClassMembers Hook

```typescript
// src/hooks/useClassMembers.ts
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface ClassMember {
  id: string
  full_name: string | null
  email: string
  role: 'teacher' | 'student'
}

export function useClassMembers(classId: string | null, currentUserId: string) {
  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!classId) {
      setMembers([])
      return
    }

    async function fetchMembers() {
      setLoading(true)

      // Get teacher
      const { data: classData } = await supabase
        .from('classes')
        .select('teacher_id, profiles:teacher_id(id, full_name, email)')
        .eq('id', classId)
        .single()

      // Get students
      const { data: studentData } = await supabase
        .from('memberships')
        .select('profiles:user_id(id, full_name, email)')
        .eq('class_id', classId)
        .eq('status', 'ACTIVE')

      const all: ClassMember[] = []

      // Add teacher (if not current user)
      if (classData?.profiles && (classData.profiles as any).id !== currentUserId) {
        all.push({
          id: (classData.profiles as any).id,
          full_name: (classData.profiles as any).full_name,
          email: (classData.profiles as any).email,
          role: 'teacher'
        })
      }

      // Add students (exclude current user)
      studentData?.forEach(m => {
        const profile = m.profiles as any
        if (profile.id !== currentUserId) {
          all.push({
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role: 'student'
          })
        }
      })

      setMembers(all)
      setLoading(false)
    }

    fetchMembers()
  }, [classId, currentUserId])

  return { members, loading }
}
```

### Step 3: Create StartDMDialog Component

```typescript
// src/components/shared/StartDMDialog.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem
} from '@/components/ui/command'
import { useUserClasses } from '@/hooks/useUserClasses'
import { useClassMembers } from '@/hooks/useClassMembers'
import { MessageSquarePlus, Loader2 } from 'lucide-react'

interface StartDMDialogProps {
  userId: string
  userRole: string
}

export function StartDMDialog({ userId, userRole }: StartDMDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { classes, loading: classesLoading } = useUserClasses(userId)
  const { members, loading: membersLoading } = useClassMembers(selectedClassId, userId)

  const handleStartDM = async () => {
    if (!selectedClassId || !selectedUserId) return
    setCreating(true)

    // Check for existing conversation
    const { data: existing } = await supabase.rpc('find_existing_dm', {
      p_class_id: selectedClassId,
      p_user1_id: userId,
      p_user2_id: selectedUserId
    })

    if (existing) {
      router.push(`/${userRole.toLowerCase()}/messages?conversation=${existing}`)
      setOpen(false)
      setCreating(false)
      return
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ class_id: selectedClassId })
      .select('id')
      .single()

    if (convError || !conv) {
      console.error('Failed to create conversation:', convError)
      setCreating(false)
      return
    }

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: userId },
      { conversation_id: conv.id, user_id: selectedUserId }
    ])

    router.push(`/${userRole.toLowerCase()}/messages?conversation=${conv.id}`)
    setOpen(false)
    setCreating(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Class Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Class</label>
            <Select onValueChange={setSelectedClassId} value={selectedClassId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Picker */}
          {selectedClassId && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Member</label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Search members..." />
                <CommandEmpty>No members found</CommandEmpty>
                <CommandGroup>
                  {members.map(m => (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => setSelectedUserId(m.id)}
                      className={selectedUserId === m.id ? 'bg-primary/10' : ''}
                    >
                      {m.full_name || m.email}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({m.role})
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </div>
          )}

          <Button
            onClick={handleStartDM}
            disabled={!selectedClassId || !selectedUserId || creating}
            className="w-full"
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              'Start Conversation'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 4: Update MessagingInterface

Add StartDMDialog to header:

```typescript
// In MessagingInterface.tsx - CardHeader section
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <MessageSquare className="h-5 w-5" />
      Conversations
    </CardTitle>
    <StartDMDialog userId={userId} userRole={userRole} />
  </div>
</CardHeader>
```

**Props change needed**:
```typescript
interface MessagingInterfaceProps {
  userId: string
  userRole: string  // ADD THIS
}
```

### Step 5: Update Message Pages

Pass userRole to MessagingInterface:

```typescript
// teacher/messages/page.tsx
<MessagingInterface userId={user.id} userRole="TEACHER" />

// student/messages/page.tsx
<MessagingInterface userId={user.id} userRole="STUDENT" />
```

## Todo List

- [ ] Create `src/hooks/useUserClasses.ts`
- [ ] Create `src/hooks/useClassMembers.ts`
- [ ] Create `src/components/shared/StartDMDialog.tsx`
- [ ] Update `MessagingInterface.tsx` - add button + userRole prop
- [ ] Update `teacher/messages/page.tsx` - pass userRole
- [ ] Update `student/messages/page.tsx` - pass userRole
- [ ] Test class selection shows correct classes
- [ ] Test member picker excludes current user
- [ ] Test duplicate check redirects to existing
- [ ] Test new conversation creation works

## Success Criteria

- "New Message" button visible in MessagingInterface header
- Class dropdown shows user's classes (as teacher + as student)
- Member picker shows classmates (teacher + students, excluding self)
- Selecting existing DM partner redirects to existing conversation
- New conversation navigates to messages with new thread selected

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Empty class list | Medium | Low | Show empty state message |
| Slow member load | Low | Low | Loading spinner |
| RPC function missing | High | Medium | Check Phase 1 complete |
| Command component missing | Medium | Low | Use Popover + Combobox fallback |

## Security Considerations

1. **Client-side validation** - UI prevents invalid selection
2. **Server-side enforcement** - RLS validates on insert (Phase 1)
3. **No user ID exposure** - Members fetched via secure query
4. **Role display** - Shows teacher/student badge for clarity

## Next Steps

After completion:
1. Manual test all user flows
2. Verify RLS blocks invalid attempts
3. Proceed to Phase 3 (Realtime Messaging)
