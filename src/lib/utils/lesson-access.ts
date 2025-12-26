import { SubscriptionTier, TierPurchase } from '@/lib/types/database.types'
import { FREE_LESSON_COUNT } from '@/lib/types/payment.types'

export type LessonAccessStatus = 'unlocked' | 'locked'

export interface TierPurchaseWithTier extends TierPurchase {
  tier: SubscriptionTier
}

/**
 * Determine if a lesson is accessible based on tier purchase
 *
 * @param lessonIndex - 0-indexed position of the lesson
 * @param tierPurchase - User's tier purchase (null if none)
 * @param isTeacher - Whether the user is the class teacher
 * @returns 'unlocked' if accessible, 'locked' if not
 */
export function getLessonAccessStatus(
  lessonIndex: number,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean
): LessonAccessStatus {
  // Teachers always have full access
  if (isTeacher) return 'unlocked'

  // Free lessons (first 3)
  if (lessonIndex < FREE_LESSON_COUNT) return 'unlocked'

  // No tier purchase = only free lessons
  if (!tierPurchase) return 'locked'

  // Tier 3 (unlimited) = full access
  if (tierPurchase.tier.lesson_unlock_count === null) return 'unlocked'

  // Check if lesson is within tier unlock count
  if (lessonIndex < tierPurchase.tier.lesson_unlock_count) return 'unlocked'

  return 'locked'
}

/**
 * Get the number of lessons accessible for a tier
 *
 * @param tier - Subscription tier (null = free)
 * @returns Number of accessible lessons (Infinity for unlimited)
 */
export function getUnlockableCount(tier: SubscriptionTier | null): number {
  if (!tier) return FREE_LESSON_COUNT
  return tier.lesson_unlock_count ?? Infinity
}

/**
 * Get the unlock count for display purposes
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns Number of unlocked lessons or 'all' for unlimited
 */
export function getUnlockedLessonCount(
  tierPurchase: TierPurchaseWithTier | null
): number | 'all' {
  if (!tierPurchase) return FREE_LESSON_COUNT
  return tierPurchase.tier.lesson_unlock_count ?? 'all'
}

/**
 * Calculate number of accessible lessons for progress display
 *
 * @param totalLessons - Total number of lessons in the course/class
 * @param tierPurchase - User's tier purchase (null if none)
 * @param isTeacher - Whether the user is the class teacher
 * @returns Number of accessible lessons
 */
export function getAccessibleLessonCount(
  totalLessons: number,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean
): number {
  if (isTeacher) return totalLessons

  if (!tierPurchase) {
    return Math.min(FREE_LESSON_COUNT, totalLessons)
  }

  if (tierPurchase.tier.lesson_unlock_count === null) {
    return totalLessons
  }

  return Math.min(tierPurchase.tier.lesson_unlock_count, totalLessons)
}

/**
 * Check if upgrade is available (not at max tier)
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns true if user can upgrade
 */
export function canUpgrade(tierPurchase: TierPurchaseWithTier | null): boolean {
  if (!tierPurchase) return true
  return tierPurchase.tier.tier_level < 3
}

/**
 * Get the next tier level for upgrade
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns Next tier level (1, 2, or 3)
 */
export function getNextTierLevel(
  tierPurchase: TierPurchaseWithTier | null
): 1 | 2 | 3 {
  if (!tierPurchase) return 1
  const current = tierPurchase.tier.tier_level
  return Math.min(current + 1, 3) as 1 | 2 | 3
}

/**
 * Format lesson access text for display
 *
 * @param accessibleCount - Number of accessible lessons
 * @param totalCount - Total lessons
 * @returns Formatted text like "5/20 bài học"
 */
export function formatLessonAccess(
  accessibleCount: number,
  totalCount: number
): string {
  if (accessibleCount >= totalCount) {
    return `${totalCount}/${totalCount} bài học`
  }
  return `${accessibleCount}/${totalCount} bài học`
}

/**
 * Tier access matrix for reference
 *
 * | Tier        | lesson_unlock_count | Accessible Lessons (0-indexed) |
 * |-------------|---------------------|--------------------------------|
 * | None (free) | 3                   | 0, 1, 2                        |
 * | Tier 1      | 5                   | 0, 1, 2, 3, 4                  |
 * | Tier 2      | 10                  | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9   |
 * | Tier 3      | NULL                | ALL                            |
 */
export const LESSON_ACCESS_MATRIX = {
  free: { count: FREE_LESSON_COUNT, description: 'Miễn phí' },
  tier1: { count: 5, description: 'Cơ bản' },
  tier2: { count: 10, description: 'Tiêu chuẩn' },
  tier3: { count: null, description: 'Trọn bộ' },
} as const
