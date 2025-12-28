'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseConversationUpdatesOptions {
  userId: string
  onNewMessage: () => void // Triggers conversation list refresh
}

/**
 * Hook for realtime updates to user's conversation list.
 * Listens for new messages across all conversations user participates in.
 * Useful for updating sidebar with latest message preview and unread counts.
 */
export function useConversationUpdates({
  userId,
  onNewMessage
}: UseConversationUpdatesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const retryCountRef = useRef(0)
  const maxRetries = 3

  // Stable callback ref
  const onNewMessageRef = useRef(onNewMessage)
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const setupChannel = useCallback(() => {
    if (!userId) return

    const supabase = supabaseRef.current

    // Cleanup previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Use unique channel name to avoid conflicts
    const channelName = `user-conversations-${userId}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
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
            onNewMessageRef.current()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Retry with exponential backoff
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++
            const delay = Math.pow(2, retryCountRef.current) * 1000
            setTimeout(setupChannel, delay)
          }
        } else if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0
        }
      })

    channelRef.current = channel
  }, [userId])

  useEffect(() => {
    setupChannel()

    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [setupChannel])
}
