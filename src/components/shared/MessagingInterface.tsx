'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Send,
  Loader2,
  Search,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  Inbox,
  MessageCircle,
  Sparkles,
  MoreVertical,
  Phone,
  Video,
  Info,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { StartDMDialog } from '@/components/shared/StartDMDialog'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import { useConversationUpdates } from '@/hooks/useConversationUpdates'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// =============================================================================
// TYPES
// =============================================================================

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

interface Conversation {
  id: string
  created_at: string
  messages: Message[]
  conversation_participants: Array<{
    profiles: {
      id: string
      full_name: string
      email: string
      role: string
    }
  }>
}

interface MessagingInterfaceProps {
  userId: string
  userRole: string
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

interface MessageGroup {
  senderId: string
  senderName: string
  senderRole: string
  messages: Message[]
  isOwn: boolean
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Groups consecutive messages from same sender for cleaner UI
 */
function groupMessages(messages: Message[], userId: string): MessageGroup[] {
  if (!messages.length) return []

  const groups: MessageGroup[] = []
  let currentGroup: MessageGroup | null = null

  for (const message of messages) {
    const isOwn = message.sender_id === userId

    if (currentGroup && currentGroup.senderId === message.sender_id) {
      currentGroup.messages.push(message)
    } else {
      if (currentGroup) groups.push(currentGroup)
      currentGroup = {
        senderId: message.sender_id,
        senderName: message.profiles?.full_name || 'Unknown',
        senderRole: message.profiles?.role || 'user',
        messages: [message],
        isOwn,
      }
    }
  }

  if (currentGroup) groups.push(currentGroup)
  return groups
}

/**
 * Format timestamp for conversation list
 */
function formatConversationTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, 'HH:mm')
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  return format(date, 'dd/MM')
}

/**
 * Get message status based on read state
 */
function getMessageStatus(message: Message, isOwn: boolean): MessageStatus {
  if (!isOwn) return 'read'
  if (message.is_read) return 'read'
  return 'delivered'
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Typing indicator with animated dots
 * Exported for use when typing presence is implemented
 */
export function TypingIndicator({ userName }: { userName: string }) {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{userName} is typing</span>
          <span className="flex gap-0.5 ml-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Message status indicator icons
 */
function MessageStatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3 text-primary-foreground/50" />
    case 'sent':
      return <Check className="h-3 w-3 text-primary-foreground/70" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-300" />
    default:
      return null
  }
}

/**
 * Online status indicator dot
 */
function OnlineIndicator({ isOnline = false }: { isOnline?: boolean }) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      )}
    />
  )
}

/**
 * Empty state for no conversations
 */
function EmptyConversationsState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        Start a new conversation to connect with teachers or students
      </p>
    </div>
  )
}

/**
 * Empty state for no messages in conversation
 */
function EmptyMessagesState({ otherUserName }: { otherUserName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <MessageCircle className="h-12 w-12 text-primary/50" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Start the conversation</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
        Send your first message to {otherUserName} and begin your conversation
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Messages are private between you two</span>
      </div>
    </div>
  )
}

/**
 * Empty state for no selected conversation
 */
function NoConversationSelectedState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6">
        <MessageSquare className="h-14 w-14 text-muted-foreground/40" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Choose a conversation from the list to start messaging
      </p>
    </div>
  )
}

/**
 * Single message bubble with status and animations
 */
function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isFirstInGroup,
  isLastInGroup,
  senderName,
}: {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  senderName: string
}) {
  const status = getMessageStatus(message, isOwn)

  return (
    <div
      className={cn(
        'flex animate-message-in',
        isOwn ? 'justify-end' : 'justify-start',
        isLastInGroup ? 'mb-4' : 'mb-1'
      )}
    >
      {/* Avatar placeholder for alignment */}
      {!isOwn && (
        <div className="w-8 mr-2 flex-shrink-0 flex items-end">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                {senderName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          'group relative max-w-[75%] lg:max-w-[65%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name for first message in group (incoming only) */}
        {!isOwn && isFirstInGroup && (
          <span className="text-xs text-muted-foreground ml-1 mb-1 block">
            {senderName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'relative px-4 py-2.5 transition-all duration-200',
            'hover:shadow-sm',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            // Rounded corners based on position in group
            isOwn
              ? cn(
                  'rounded-2xl',
                  isFirstInGroup && 'rounded-tr-2xl',
                  isLastInGroup && 'rounded-br-md',
                  !isFirstInGroup && !isLastInGroup && 'rounded-r-md'
                )
              : cn(
                  'rounded-2xl',
                  isFirstInGroup && 'rounded-tl-2xl',
                  isLastInGroup && 'rounded-bl-md',
                  !isFirstInGroup && !isLastInGroup && 'rounded-l-md'
                )
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>

          {/* Timestamp and status */}
          <div
            className={cn(
              'flex items-center gap-1.5 mt-1.5',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <span
              className={cn(
                'text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
                isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}
            >
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {isOwn && <MessageStatusIcon status={status} />}
          </div>
        </div>
      </div>

      {/* Avatar placeholder for own messages alignment */}
      {isOwn && <div className="w-8 ml-2 flex-shrink-0" />}
    </div>
  )
}

/**
 * Conversation list item
 */
function ConversationItem({
  conversation,
  isSelected,
  userId,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  userId: string
  onClick: () => void
}) {
  const otherUser = conversation.conversation_participants.find(
    (p) => p.profiles.id !== userId
  )?.profiles

  const lastMessage = conversation.messages?.[0]
  const unreadCount = conversation.messages?.filter(
    (m) => !m.is_read && m.sender_id !== userId
  ).length || 0

  // Simulate online status (would come from real data)
  const isOnline = Math.random() > 0.5

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'bg-primary/10 border border-primary/30 shadow-sm'
          : 'hover:bg-muted/60 border border-transparent hover:border-border/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
              {otherUser?.full_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <OnlineIndicator isOnline={isOnline} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={cn(
              'font-semibold truncate text-sm',
              unreadCount > 0 && 'text-foreground'
            )}>
              {otherUser?.full_name || 'Unknown User'}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lastMessage && (
                <span className="text-xs text-muted-foreground">
                  {formatConversationTime(lastMessage.created_at)}
                </span>
              )}
              {unreadCount > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mb-1">
            {otherUser?.role}
          </Badge>

          <p className={cn(
            'text-xs truncate',
            unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}>
            {lastMessage?.content || 'No messages yet'}
          </p>
        </div>
      </div>
    </button>
  )
}

/**
 * Auto-expanding textarea for message input
 */
interface AutoExpandingTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  disabled?: boolean
  maxLength?: number
}

const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
  ({ value, onChange, onKeyDown, placeholder, disabled, maxLength = 2000 }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    useEffect(() => {
      if (textareaRef.current) {
        // Reset height to auto to get proper scrollHeight
        textareaRef.current.style.height = 'auto'
        // Set to scrollHeight, capped at 6 rows (~144px)
        const maxHeight = 144
        const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight)
        textareaRef.current.style.height = `${newHeight}px`
      }
    }, [value, textareaRef])

    const showCharCount = value.length > maxLength * 0.8
    const isNearLimit = value.length > maxLength * 0.95

    return (
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-xl border border-input bg-background',
            'px-4 py-3 text-sm leading-relaxed',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            'min-h-[44px] max-h-[144px]'
          )}
          style={{ overflow: 'hidden' }}
        />
        {showCharCount && (
          <span
            className={cn(
              'absolute right-3 bottom-1 text-[10px]',
              isNearLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    )
  }
)
AutoExpandingTextarea.displayName = 'AutoExpandingTextarea'

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MessagingInterface({ userId, userRole }: MessagingInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileList, setShowMobileList] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const urlHandledRef = useRef<string | null>(null) // Track which URL conversation was handled
  const supabase = createClient()
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get('conversation')

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter((conv) => {
      const otherUser = conv.conversation_participants.find(
        (p) => p.profiles.id !== userId
      )?.profiles
      return (
        otherUser?.full_name?.toLowerCase().includes(query) ||
        otherUser?.email?.toLowerCase().includes(query)
      )
    })
  }, [conversations, searchQuery, userId])

  // Group messages for display
  const messageGroups = useMemo(
    () => groupMessages(messages, userId),
    [messages, userId]
  )

  // Realtime message handler - add new messages without duplicates
  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
    // Auto-scroll after state update
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // Realtime conversation list refresh
  const handleConversationUpdate = useCallback(() => {
    loadConversations()
  }, [])

  // Subscribe to active conversation messages
  useRealtimeMessages({
    conversationId: selectedConversation?.id || null,
    onNewMessage: handleNewMessage,
  })

  // Subscribe to all user's conversations for sidebar updates
  useConversationUpdates({
    userId,
    onNewMessage: handleConversationUpdate,
  })

  useEffect(() => {
    loadConversations()
  }, [userId])

  // Auto-select conversation from URL query parameter (only on initial load or URL change)
  useEffect(() => {
    // Skip if no URL param, still loading, or this URL was already handled
    if (!conversationIdFromUrl || loading || urlHandledRef.current === conversationIdFromUrl) return

    const conv = conversations.find((c) => c.id === conversationIdFromUrl)
    if (conv) {
      setSelectedConversation(conv)
      urlHandledRef.current = conversationIdFromUrl
    } else if (conversations.length >= 0) {
      // Conversation not in list (just created) - fetch it directly
      const fetchConversation = async () => {
        const { data } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_participants(
              user_id,
              profiles:user_id(id, full_name, email, role)
            ),
            messages(id, content, created_at, is_read, sender_id)
          `)
          .eq('id', conversationIdFromUrl)
          .single()

        if (data) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === data.id)) return prev
            return [data as Conversation, ...prev]
          })
          setSelectedConversation(data as Conversation)
        }
        urlHandledRef.current = conversationIdFromUrl
      }
      fetchConversation()
    }
  }, [conversationIdFromUrl, conversations, loading])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      // Hide mobile list when conversation is selected
      setShowMobileList(false)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
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
      `
      )
      .order('created_at', { ascending: false })

    if (!error && data) {
      setConversations(data as Conversation[])

      // Sync selectedConversation to new reference to prevent stale data
      setSelectedConversation(prev => {
        if (!prev) return null
        const updatedSelected = data.find(c => c.id === prev.id)
        return updatedSelected ? (updatedSelected as Conversation) : prev
      })
    } else if (error) {
      console.error('Error loading conversations:', error)
    }
    setLoading(false)
  }

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        profiles:sender_id(full_name, email, role)
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as Message[])

      // Mark messages as read in database
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)

      // Update local conversations state to reflect read status (clears unread badge)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.sender_id !== userId ? { ...msg, is_read: true } : msg
                ),
              }
            : conv
        )
      )
    }
  }

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
    }
    setSending(false)
    // Refocus input after sending
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as unknown as React.FormEvent)
    }
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.conversation_participants.find(
      (p) => p.profiles.id !== userId
    )?.profiles
  }

  const handleBackToList = () => {
    setShowMobileList(true)
    setSelectedConversation(null)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-0 lg:gap-6 h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <Card
        className={cn(
          'lg:col-span-1 flex flex-col overflow-hidden',
          'lg:flex',
          showMobileList ? 'flex' : 'hidden'
        )}
      >
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Messages
            </CardTitle>
            <StartDMDialog userId={userId} userRole={userRole} />
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No conversations found for "{searchQuery}"</p>
              </div>
            ) : (
              <EmptyConversationsState />
            )
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                userId={userId}
                onClick={() => setSelectedConversation(conversation)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card
        className={cn(
          'lg:col-span-2 flex flex-col overflow-hidden',
          'lg:flex',
          showMobileList ? 'hidden' : 'flex'
        )}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b py-3 px-4">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-9 w-9"
                  onClick={handleBackToList}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                      {getOtherParticipant(selectedConversation)?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineIndicator isOnline />
                </div>

                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-semibold truncate">
                    {getOtherParticipant(selectedConversation)?.full_name || 'Unknown User'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {getOtherParticipant(selectedConversation)?.role}
                    </Badge>
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>

                {/* Header Action Icons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Voice call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Video call"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="View info"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 lg:p-6"
            >
              {messages.length === 0 ? (
                <EmptyMessagesState
                  otherUserName={getOtherParticipant(selectedConversation)?.full_name || 'this user'}
                />
              ) : (
                <div className="space-y-0">
                  {messageGroups.map((group, groupIndex) => (
                    <div key={`group-${groupIndex}`}>
                      {group.messages.map((message, messageIndex) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={group.isOwn}
                          showAvatar={messageIndex === group.messages.length - 1}
                          isFirstInGroup={messageIndex === 0}
                          isLastInGroup={messageIndex === group.messages.length - 1}
                          senderName={group.senderName}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <CardContent className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <AutoExpandingTextarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={setNewMessage}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                  className={cn(
                    'h-11 w-11 rounded-xl flex-shrink-0 transition-all duration-200',
                    newMessage.trim()
                      ? 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg'
                      : 'bg-muted text-muted-foreground'
                  )}
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <NoConversationSelectedState />
          </CardContent>
        )}
      </Card>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes message-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-message-in {
          animation: message-in 0.25s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
