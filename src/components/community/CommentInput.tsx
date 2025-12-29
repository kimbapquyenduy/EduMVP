'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'

interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles: {
    full_name: string
    email: string
    role: string
  }
}

interface CommentInputProps {
  postId: string
  currentUserId: string
  onCommentAdded: (comment: Comment) => void
}

const MAX_COMMENT_LENGTH = 5000

export function CommentInput({ postId, currentUserId, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return

    setSubmitting(true)

    // First get user profile for optimistic update
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, role')
      .eq('id', currentUserId)
      .single()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: currentUserId,
        content: content.trim(),
      })
      .select()
      .single()

    if (!error && data && profile) {
      // Create full comment object for optimistic update
      const newComment: Comment = {
        ...data,
        profiles: profile,
      }
      onCommentAdded(newComment)
      setContent('')
    }

    setSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => {
            if (e.target.value.length <= MAX_COMMENT_LENGTH) {
              setContent(e.target.value)
            }
          }}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          className="resize-none text-sm"
          disabled={submitting}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      {content.length > MAX_COMMENT_LENGTH * 0.8 && (
        <div className="text-xs text-muted-foreground text-right">
          {content.length}/{MAX_COMMENT_LENGTH}
        </div>
      )}
    </div>
  )
}
