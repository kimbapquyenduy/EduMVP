'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageSquare, Search, ChevronDown, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useConversationUpdates } from '@/hooks/useConversationUpdates'

// =============================================================================
// TYPES
// =============================================================================

interface Message {
  id: string
  content: string
  created_at: string
  is_read: boolean
  sender_id: string
}

interface Conversation {
  id: string
  created_at: string
  messages: Message[]
  conversation_participants: Array<{
    user_id: string
    profiles: {
      id: string
      full_name: string
      email: string
      role: string
    }
  }>
}

interface ChatDropdownProps {
  userId: string
  userRole: 'TEACHER' | 'STUDENT'
}

type FilterType = 'all' | 'unread'

// =============================================================================
// COMPONENT
// =============================================================================

export function ChatDropdown({ userId, userRole }: ChatDropdownProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [open, setOpen] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const supabase = createClient()

  // Load unread count only (lightweight - for badge)
  const loadUnreadCount = useCallback(async () => {
    // Get conversation IDs where user is a participant
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!participations?.length) {
      setUnreadCount(0)
      return
    }

    const conversationIds = participations.map(p => p.conversation_id)

    // Count unread messages in user's conversations
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }, [userId, supabase])

  // Load full conversations (heavy - only when dropdown opened)
  const loadConversations = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants(
          user_id,
          profiles:user_id(id, full_name, email, role)
        ),
        messages(
          id,
          content,
          created_at,
          is_read,
          sender_id
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setConversations(data as Conversation[])
    }
    setLoading(false)
  }, [userId, supabase])

  // Realtime updates - only refresh unread count, reload full data if open
  const handleConversationUpdate = useCallback(() => {
    loadUnreadCount()
    if (open) {
      loadConversations()
    }
  }, [loadUnreadCount, loadConversations, open])

  useConversationUpdates({
    userId,
    onNewMessage: handleConversationUpdate,
  })

  // Load only unread count on mount (lightweight)
  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  // Load full conversations when popover opens (deferred heavy loading)
  useEffect(() => {
    if (open && !hasLoadedOnce) {
      loadConversations()
      setHasLoadedOnce(true)
    } else if (open) {
      loadConversations()
    }
  }, [open, hasLoadedOnce, loadConversations])

  // Get other participant in conversation
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.conversation_participants.find(
      (p) => p.profiles.id !== userId
    )?.profiles
  }

  // Get last message from conversation
  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages?.length) return null
    // Sort by date to get the most recent
    const sorted = [...conversation.messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sorted[0]
  }

  // Count unread messages
  const getUnreadCount = (conversation: Conversation) => {
    return conversation.messages?.filter(
      (m) => !m.is_read && m.sender_id !== userId
    ).length || 0
  }

  // Total unread - use lightweight count state (updated separately)
  // Fall back to computed count if conversations are loaded
  const totalUnread = conversations.length > 0
    ? conversations.reduce((acc, conv) => acc + getUnreadCount(conv), 0)
    : unreadCount

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadMessageIds = conversations.flatMap((conv) =>
      conv.messages
        .filter((m) => !m.is_read && m.sender_id !== userId)
        .map((m) => m.id)
    )

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessageIds)

      loadConversations()
      loadUnreadCount()
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherParticipant(conv)
    const matchesSearch = !searchQuery ||
      otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filter === 'all' || getUnreadCount(conv) > 0

    return matchesSearch && matchesFilter
  })

  // Format timestamp like Skool (2d, 3d, etc.)
  const formatTime = (dateStr: string) => {
    const distance = formatDistanceToNow(new Date(dateStr), { addSuffix: false })
    // Shorten "2 days" to "2d", "3 hours" to "3h", etc.
    return distance
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace('about ', '')
      .replace('less than a minute', 'now')
  }

  const messagesPath = userRole === 'TEACHER' ? '/teacher/messages' : '/student/messages'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-muted"
          aria-label="Open messages"
        >
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] p-0 shadow-lg border border-border/50"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold text-foreground">Chats</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              disabled={totalUnread === 0}
            >
              Mark all as read
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {filter === 'all' ? 'All' : 'Unread'}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unread')}>
                  Unread
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const lastMessage = getLastMessage(conversation)
              const unreadCount = getUnreadCount(conversation)
              const hasUnread = unreadCount > 0

              return (
                <Link
                  key={conversation.id}
                  href={`${messagesPath}?conversation=${conversation.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    hasUnread && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700 font-medium text-sm">
                      {otherUser?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm truncate',
                        hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      )}>
                        {otherUser?.full_name || 'Unknown User'}
                      </span>
                      {lastMessage && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm text-muted-foreground flex-shrink-0">
                            {formatTime(lastMessage.created_at)}
                          </span>
                        </>
                      )}
                    </div>
                    <p className={cn(
                      'text-sm truncate mt-0.5',
                      hasUnread ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {hasUnread && (
                    <div className="flex-shrink-0 mt-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />
                    </div>
                  )}
                </Link>
              )
            })
          )}
        </div>

        {/* Footer - View all link */}
        <div className="border-t px-4 py-3">
          <Link
            href={messagesPath}
            onClick={() => setOpen(false)}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            View all messages
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
