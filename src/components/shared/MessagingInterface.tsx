'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Loader2, User, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { StartDMDialog } from '@/components/shared/StartDMDialog'

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

export function MessagingInterface({ userId, userRole }: MessagingInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
  }, [userId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)

    // Get all conversations where user is a participant
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(
          profiles(id, full_name, email, role)
        ),
        messages(
          id,
          content,
          created_at,
          is_read,
          sender_id
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setConversations(data as Conversation[])
    }
    setLoading(false)
  }

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id(full_name, email, role)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as Message[])

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
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
      loadMessages(selectedConversation.id)
      loadConversations()
    }
    setSending(false)
  }

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.conversation_participants.find(
      (p) => p.profiles.id !== userId
    )?.profiles
  }

  const getLastMessage = (conversation: Conversation) => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return 'No messages yet'
    }
    return conversation.messages[0].content
  }

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.messages?.filter(
      (m) => !m.is_read && m.sender_id !== userId
    ).length || 0
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations
            </CardTitle>
            <StartDMDialog userId={userId} userRole={userRole} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation)
              const unreadCount = getUnreadCount(conversation)

              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {otherUser?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">
                          {otherUser?.full_name || 'Unknown User'}
                        </span>
                        {unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs mb-1">
                        {otherUser?.role}
                      </Badge>
                      <p className="text-sm text-muted-foreground truncate">
                        {getLastMessage(conversation)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getOtherParticipant(selectedConversation)?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {getOtherParticipant(selectedConversation)?.full_name || 'Unknown User'}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {getOtherParticipant(selectedConversation)?.role}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === userId
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <CardContent className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />
                <Button type="submit" disabled={!newMessage.trim() || sending}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
