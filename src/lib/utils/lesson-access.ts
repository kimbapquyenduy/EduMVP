import { SubscriptionTier, TierPurchase } from '@/lib/types/database.types'

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
 * @param freeTierLessonCount - Number of free lessons (from database, default 0)
 * @returns 'unlocked' if accessible, 'locked' if not
 */
export function getLessonAccessStatus(
  lessonIndex: number,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean,
  freeTierLessonCount: number = 0
): LessonAccessStatus {
  // Teachers always have full access
  if (isTeacher) return 'unlocked'

  // Free lessons (configured by teacher)
  if (lessonIndex < freeTierLessonCount) return 'unlocked'

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
 * @param freeTierLessonCount - Number of free lessons (from database, default 0)
 * @returns Number of accessible lessons (Infinity for unlimited)
 */
export function getUnlockableCount(
  tier: SubscriptionTier | null,
  freeTierLessonCount: number = 0
): number {
  if (!tier) return freeTierLessonCount
  return tier.lesson_unlock_count ?? Infinity
}

/**
 * Get the unlock count for display purposes
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @param freeTierLessonCount - Number of free lessons (from database, default 0)
 * @returns Number of unlocked lessons or 'all' for unlimited
 */
export function getUnlockedLessonCount(
  tierPurchase: TierPurchaseWithTier | null,
  freeTierLessonCount: number = 0
): number | 'all' {
  if (!tierPurchase) return freeTierLessonCount
  return tierPurchase.tier.lesson_unlock_count ?? 'all'
}

/**
 * Calculate number of accessible lessons for progress display
 *
 * @param totalLessons - Total number of lessons in the course/class
 * @param tierPurchase - User's tier purchase (null if none)
 * @param isTeacher - Whether the user is the class teacher
 * @param freeTierLessonCount - Number of free lessons (from database, default 0)
 * @returns Number of accessible lessons
 */
export function getAccessibleLessonCount(
  totalLessons: number,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean,
  freeTierLessonCount: number = 0
): number {
  if (isTeacher) return totalLessons

  if (!tierPurchase) {
    return Math.min(freeTierLessonCount, totalLessons)
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
 * Note: All values are now teacher-configurable via the database.
 * The values below are just defaults used by the create_default_tiers() trigger.
 *
 * | Tier        | Default lesson_unlock_count | Description           |
 * |-------------|-----------------------------|-----------------------|
 * | Free (0)    | 0 (configurable)            | Teacher sets count    |
 * | Tier 1      | 5 (configurable)            | Cơ bản                |
 * | Tier 2      | 10 (configurable)           | Tiêu chuẩn            |
 * | Tier 3      | NULL (unlimited)            | Trọn bộ               |
 */
export const DEFAULT_TIER_LESSON_COUNTS = {
  free: 0,
  tier1: 5,
  tier2: 10,
  tier3: null, // unlimited
} as const
