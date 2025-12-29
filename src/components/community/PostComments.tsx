'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CommentInput } from './CommentInput'
import { sanitizeUserContent } from '@/lib/utils/sanitize'

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

interface PostCommentsProps {
  postId: string
  currentUserId: string
  onCommentAdded: () => void
}

const INITIAL_DISPLAY_COUNT = 3

export function PostComments({ postId, currentUserId, onCommentAdded }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const supabase = createClient()
  const isMountedRef = useRef(true)

  // Cleanup on unmount to prevent state updates
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:author_id (full_name, email, role)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!isMountedRef.current) return

    if (!error && data) {
      setComments(data as Comment[])
    }
    setLoading(false)
  }

  const handleCommentAdded = (newComment: Comment) => {
    setComments(prev => [...prev, newComment])
    onCommentAdded()
  }

  const displayedComments = showAll ? comments : comments.slice(0, INITIAL_DISPLAY_COUNT)
  const hiddenCount = comments.length - INITIAL_DISPLAY_COUNT

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <>
          {displayedComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {comment.profiles.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{comment.profiles.full_name}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                  {sanitizeUserContent(comment.content)}
                </p>
              </div>
            </div>
          ))}

          {/* Show More Button */}
          {!showAll && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(true)}
              className="w-full text-muted-foreground"
            >
              Show {hiddenCount} more comment{hiddenCount > 1 ? 's' : ''}
            </Button>
          )}
        </>
      )}

      {/* Comment Input */}
      <CommentInput
        postId={postId}
        currentUserId={currentUserId}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  )
}
