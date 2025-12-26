# Phase 3: Realtime Messaging - Supabase Subscriptions

**Parent Plan**: [plan.md](./plan.md)
**Dependencies**: [Phase 2](./phase-02-ui-components.md) (UI components)
**Status**: Blocked (waiting on Phase 2)
**Priority**: Medium

---

## Overview

Add realtime message updates using Supabase Realtime. Messages appear instantly without page refresh.

## Key Insights

1. Current `MessagingInterface` uses polling via `loadMessages()` on selection
2. Supabase Realtime uses postgres_changes for INSERT events
3. Channel per conversation - prevents cross-conversation noise
4. Must cleanup subscriptions on unmount/conversation change
5. RLS already filters messages - realtime respects same policies

## Requirements

- [ ] R1: New messages appear in realtime
- [ ] R2: Conversation list updates with new message preview
- [ ] R3: Proper subscription cleanup on unmount
- [ ] R4: Handle channel errors gracefully
- [ ] R5: Mark messages as read on view

## Architecture

```
MessagingInterface
├── useRealtimeMessages(conversationId)
│   ├── Subscribe: postgres_changes on messages table
│   ├── Filter: conversation_id = selectedConversation
│   └── Cleanup: unsubscribe on unmount/change
└── useConversationUpdates(userId)
    ├── Subscribe: postgres_changes on messages
    ├── Filter: conversations user participates in
    └── Update: conversation list preview + unread count

Channel naming:
- messages:{conversationId} - For active thread
- conversations:{userId} - For sidebar updates
```

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useRealtimeMessages.ts` | Create | Subscribe to message thread |
| `src/hooks/useConversationUpdates.ts` | Create | Subscribe to new messages across convos |
| `src/components/shared/MessagingInterface.tsx` | Modify | Integrate realtime hooks |

## Implementation Steps

### Step 1: Create useRealtimeMessages Hook

```typescript
// src/hooks/useRealtimeMessages.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  profiles?: {
    full_name: string
    email: string
    role: string
  }
}

interface UseRealtimeMessagesOptions {
  conversationId: string | null
  onNewMessage: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
}

export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onMessageUpdate
}: UseRealtimeMessagesOptions) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId) return

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch full message with profile
          const { data } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(full_name, email, role)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            onNewMessage(data as Message)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessageUpdate?.(payload.new as Message)
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId, onNewMessage, onMessageUpdate, supabase])

  return null
}
```

### Step 2: Create useConversationUpdates Hook

```typescript
// src/hooks/useConversationUpdates.ts
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseConversationUpdatesOptions {
  userId: string
  onNewMessage: () => void  // Trigger conversation list refresh
}

export function useConversationUpdates({
  userId,
  onNewMessage
}: UseConversationUpdatesOptions) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`user-conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Check if user is participant in this conversation
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('id')
            .eq('conversation_id', payload.new.conversation_id)
            .eq('user_id', userId)
            .single()

          if (participant) {
            onNewMessage()
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, onNewMessage, supabase])
}
```

### Step 3: Update MessagingInterface

Integrate hooks into existing component:

```typescript
// Add to MessagingInterface.tsx

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { useConversationUpdates } from '@/hooks/useConversationUpdates'
import { useCallback } from 'react'

// Inside component:
const handleNewMessage = useCallback((message: Message) => {
  setMessages(prev => {
    // Prevent duplicates
    if (prev.some(m => m.id === message.id)) return prev
    return [...prev, message]
  })
}, [])

const handleConversationUpdate = useCallback(() => {
  loadConversations()
}, [])

// Subscribe to active conversation
useRealtimeMessages({
  conversationId: selectedConversation?.id || null,
  onNewMessage: handleNewMessage
})

// Subscribe to all user's conversations for sidebar updates
useConversationUpdates({
  userId,
  onNewMessage: handleConversationUpdate
})
```

### Step 4: Optimize Message Sending

Remove redundant `loadMessages()` after send - realtime handles it:

```typescript
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!newMessage.trim() || !selectedConversation) return

  setSending(true)
  const { error } = await supabase.from('messages').insert({
    conversation_id: selectedConversation.id,
    sender_id: userId,
    content: newMessage.trim(),
    is_read: false,
  })

  if (!error) {
    setNewMessage('')
    // Remove: loadMessages(selectedConversation.id)
    // Realtime subscription handles new message display
  }
  setSending(false)
}
```

### Step 5: Auto-scroll on New Message

Ensure scroll to bottom on new realtime messages:

```typescript
// Update handleNewMessage
const handleNewMessage = useCallback((message: Message) => {
  setMessages(prev => {
    if (prev.some(m => m.id === message.id)) return prev
    return [...prev, message]
  })
  // Scroll after state update
  setTimeout(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}, [])
```

## Todo List

- [ ] Create `src/hooks/useRealtimeMessages.ts`
- [ ] Create `src/hooks/useConversationUpdates.ts`
- [ ] Update `MessagingInterface.tsx` - integrate hooks
- [ ] Remove redundant `loadMessages()` after send
- [ ] Add auto-scroll on realtime message
- [ ] Test: Send message appears instantly for sender
- [ ] Test: Send message appears for recipient without refresh
- [ ] Test: Conversation list updates with new message preview
- [ ] Test: Channel cleanup on conversation switch
- [ ] Test: Channel cleanup on component unmount

## Success Criteria

- Messages appear instantly for all conversation participants
- Conversation sidebar updates with latest message preview
- No memory leaks (channels properly cleaned up)
- No duplicate messages in UI
- Unread count updates in realtime

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Channel leak on fast switching | Medium | Medium | Ref-based cleanup pattern |
| Duplicate messages in state | Low | Medium | ID check before adding |
| Network disconnect | Medium | Low | Status callback + reconnect |
| Rate limiting on updates | Low | Low | Debounce conversation refresh |

## Security Considerations

1. **RLS Enforcement** - Realtime respects RLS policies
2. **Channel Isolation** - Each user's subscription filtered by auth
3. **No Message Spoofing** - INSERT requires auth + participant check
4. **Read Status** - Only update own read status

## Performance Considerations

1. **Single Channel Per Conversation** - No broadcast spam
2. **Filtered Subscriptions** - `filter: conversation_id=eq.X` reduces payload
3. **Lazy Profile Fetch** - Only fetch profile for new messages
4. **Debounced List Refresh** - Prevent rapid conversation list queries

## Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| User A sends to User B | B sees message instantly |
| User switches conversation | Old channel closed, new channel opened |
| User closes messages page | All channels cleaned up |
| Network disconnect | Status callback logs error |
| Rapid messages | All appear in order, no duplicates |

## Next Steps

After completion:
1. Load test with multiple simultaneous users
2. Monitor Supabase Realtime usage in dashboard
3. Consider typing indicators (future enhancement)
4. Consider online presence (future enhancement)
