'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Heart, Pin, Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  class_id: string
  author_id: string
  category: 'DISCUSSION' | 'ANNOUNCEMENT' | 'QUESTION' | 'UPDATE'
  title: string | null
  content: string
  is_pinned: boolean
  created_at: string
  profiles: {
    full_name: string
    email: string
    role: string
  }
  post_reactions: Array<{ id: string }>
  comments: Array<{ id: string }>
}

interface CommunityTabProps {
  classId: string
}

export function CommunityTab({ classId }: CommunityTabProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostCategory, setNewPostCategory] = useState<Post['category']>('DISCUSSION')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadPosts()
  }, [classId, filterCategory])

  const loadPosts = async () => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (full_name, email, role),
        post_reactions:post_reactions(id),
        comments:comments(id)
      `)
      .eq('class_id', classId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (filterCategory !== 'ALL') {
      query = query.eq('category', filterCategory)
    }

    const { data, error } = await query

    if (!error && data) {
      setPosts(data as Post[])
    }
    setLoading(false)
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return

    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('posts').insert({
      class_id: classId,
      author_id: user.id,
      category: newPostCategory,
      content: newPostContent,
      is_pinned: false,
    })

    if (!error) {
      setNewPostContent('')
      setNewPostCategory('DISCUSSION')
      loadPosts()
    }
    setPosting(false)
  }

  const getCategoryColor = (category: Post['category']) => {
    switch (category) {
      case 'ANNOUNCEMENT':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'QUESTION':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
      case 'UPDATE':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Post Composer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Write something to your class..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Select
              value={newPostCategory}
              onValueChange={(value) => setNewPostCategory(value as Post['category'])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCUSSION">Discussion</SelectItem>
                <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                <SelectItem value="QUESTION">Question</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || posting}
            >
              {posting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <div className="flex gap-2">
          {['ALL', 'DISCUSSION', 'ANNOUNCEMENT', 'QUESTION', 'UPDATE'].map((cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory(cat)}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
            <p className="text-muted-foreground">
              Be the first to start a conversation!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className={post.is_pinned ? 'border-primary' : ''}>
              <CardContent className="pt-6">
                {/* Post Header */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar>
                    <AvatarFallback>
                      {post.profiles.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{post.profiles.full_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {post.profiles.role}
                      </Badge>
                      {post.is_pinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <Badge className={getCategoryColor(post.category)} variant="secondary">
                        {post.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                {post.title && (
                  <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap mb-4">
                  {post.content}
                </p>

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button variant="ghost" size="sm">
                    <Heart className="mr-2 h-4 w-4" />
                    {post.post_reactions.length}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {post.comments.length}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
