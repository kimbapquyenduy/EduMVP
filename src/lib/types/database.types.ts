// ============================================
// DATABASE TYPES FOR EDU PLATFORM MVP
// ============================================

export type UserRole = 'TEACHER' | 'STUDENT'
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
export type CourseTier = 'FREE' | 'PREMIUM'
export type PostCategory = 'DISCUSSION' | 'ANNOUNCEMENT' | 'QUESTION' | 'UPDATE'

// ============================================
// USER & PROFILE
// ============================================
export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ============================================
// CLASS (renamed from School)
// ============================================
export interface Class {
  id: string
  teacher_id: string
  name: string
  description: string | null
  price: number
  thumbnail_url: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

// ============================================
// MEMBERSHIP
// ============================================
export interface Membership {
  id: string
  class_id: string
  user_id: string
  status: MembershipStatus
  joined_at: string
  expires_at: string | null
}

// ============================================
// COURSE & LESSONS
// ============================================
export interface Course {
  id: string
  class_id: string
  title: string
  description: string | null
  tier: CourseTier
  order_index: number
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  pdf_url: string | null
  order_index: number
  duration_minutes: number | null
  created_at: string
  updated_at: string
}

export interface LessonProgress {
  id: string
  lesson_id: string
  user_id: string
  is_completed: boolean
  completed_at: string | null
  last_viewed_at: string
}

// ============================================
// COMMUNITY FEATURES
// ============================================
export interface Post {
  id: string
  class_id: string
  author_id: string
  category: PostCategory
  title: string | null
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface PostReaction {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface CommentReaction {
  id: string
  comment_id: string
  user_id: string
  created_at: string
}

// ============================================
// MESSAGING SYSTEM
// ============================================
export interface Conversation {
  id: string
  class_id: string
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  last_read_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  updated_at: string
}

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================
export interface ClassWithTeacher extends Class {
  teacher: Profile
}

export interface CourseWithProgress extends Course {
  completion_percentage?: number
  total_lessons?: number
  completed_lessons?: number
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress
}

export interface PostWithAuthor extends Post {
  author: Profile
  reaction_count?: number
  comment_count?: number
  user_has_reacted?: boolean
}

export interface CommentWithAuthor extends Comment {
  author: Profile
  reaction_count?: number
  user_has_reacted?: boolean
}

export interface ConversationWithParticipants extends Conversation {
  participants: (ConversationParticipant & { profile: Profile })[]
  last_message?: Message
  unread_count?: number
}

export interface MessageWithSender extends Message {
  sender: Profile
}
