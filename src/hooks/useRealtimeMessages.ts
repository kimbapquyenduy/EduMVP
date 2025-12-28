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
  profiles: {
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

/**
 * Hook for realtime message subscription on a specific conversation.
 * Subscribes to INSERT and UPDATE events on the messages table.
 * Properly cleans up channels on unmount or conversation change.
 */
export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onMessageUpdate
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())

  // Stable callback refs to avoid dependency issues
  const onNewMessageRef = useRef(onNewMessage)
  const onMessageUpdateRef = useRef(onMessageUpdate)

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
    onMessageUpdateRef.current = onMessageUpdate
  }, [onNewMessage, onMessageUpdate])

  useEffect(() => {
    if (!conversationId) return

    const supabase = supabaseRef.current

    // Cleanup previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
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
          // Fetch full message with profile data
          const { data } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(full_name, email, role)')
            .eq('id', payload.new.id)
            .single()

          if (data && data.profiles) {
            // Handle both array and object cases from Supabase join
            const profiles = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
            if (profiles) {
              onNewMessageRef.current({ ...data, profiles } as Message)
            }
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
          onMessageUpdateRef.current?.(payload.new as Message)
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[useRealtimeMessages] Channel error for conversation:', conversationId)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [conversationId])
}
