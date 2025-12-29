import { SubscriptionTier, TierPurchase, TierLevel } from '@/lib/types/database.types'

export type LessonAccessStatus = 'unlocked' | 'locked'

export interface TierPurchaseWithTier extends TierPurchase {
  tier: SubscriptionTier
}

/**
 * Get user's current tier level from their purchase
 * Returns 0 (Free) if no purchase
 */
export function getUserTierLevel(tierPurchase: TierPurchaseWithTier | null): TierLevel {
  return tierPurchase?.tier.tier_level ?? 0
}

/**
 * Determine if content is accessible based on tier hierarchy
 * User with tier N can access all content requiring tier 0 to N
 *
 * @param requiredTierLevel - Tier level required for content (0-3)
 * @param tierPurchase - User's tier purchase (null if none = tier 0)
 * @param isTeacher - Whether the user is the class teacher
 * @returns 'unlocked' if accessible, 'locked' if not
 */
export function getContentAccessStatus(
  requiredTierLevel: TierLevel,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean
): LessonAccessStatus {
  // Teachers always have full access
  if (isTeacher) return 'unlocked'

  // Get user's tier level (0 if no purchase)
  const userTierLevel = getUserTierLevel(tierPurchase)

  // User can access content if their tier >= required tier
  return userTierLevel >= requiredTierLevel ? 'unlocked' : 'locked'
}

/**
 * Determine if a lesson is accessible
 * Lesson inherits course tier if its own tier is null
 *
 * @param lessonTierLevel - Lesson's required tier (null = use course tier)
 * @param courseTierLevel - Course's required tier
 * @param tierPurchase - User's tier purchase (null if none)
 * @param isTeacher - Whether the user is the class teacher
 * @returns 'unlocked' if accessible, 'locked' if not
 */
export function getLessonAccessStatus(
  lessonTierLevel: TierLevel | null,
  courseTierLevel: TierLevel,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean
): LessonAccessStatus {
  // Use lesson tier if set, otherwise inherit from course
  const requiredTier = lessonTierLevel ?? courseTierLevel
  return getContentAccessStatus(requiredTier, tierPurchase, isTeacher)
}

/**
 * Determine if a course is accessible
 *
 * @param courseTierLevel - Course's required tier level
 * @param tierPurchase - User's tier purchase (null if none)
 * @param isTeacher - Whether the user is the class teacher
 * @returns 'unlocked' if accessible, 'locked' if not
 */
export function getCourseAccessStatus(
  courseTierLevel: TierLevel,
  tierPurchase: TierPurchaseWithTier | null,
  isTeacher: boolean
): LessonAccessStatus {
  return getContentAccessStatus(courseTierLevel, tierPurchase, isTeacher)
}

/**
 * Check if user can upgrade to a higher tier
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns true if user can upgrade
 */
export function canUpgrade(tierPurchase: TierPurchaseWithTier | null): boolean {
  const userTierLevel = getUserTierLevel(tierPurchase)
  return userTierLevel < 3
}

/**
 * Get the next tier level for upgrade
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns Next tier level (1, 2, or 3)
 */
export function getNextTierLevel(tierPurchase: TierPurchaseWithTier | null): 1 | 2 | 3 {
  const current = getUserTierLevel(tierPurchase)
  return Math.min(current + 1, 3) as 1 | 2 | 3
}

/**
 * Get all accessible tier levels for a user
 * User with tier N can access tiers 0, 1, ..., N
 *
 * @param tierPurchase - User's tier purchase (null if none)
 * @returns Array of accessible tier levels
 */
export function getAccessibleTierLevels(tierPurchase: TierPurchaseWithTier | null): TierLevel[] {
  const userTierLevel = getUserTierLevel(tierPurchase)
  return [0, 1, 2, 3].filter((level) => level <= userTierLevel) as TierLevel[]
}

/**
 * Tier display names (default - teachers can customize)
 */
export const DEFAULT_TIER_NAMES: Record<TierLevel, string> = {
  0: 'Miễn phí',
  1: 'Cơ bản',
  2: 'Tiêu chuẩn',
  3: 'Trọn bộ',
}

/**
 * Get tier name from subscription tier or default
 */
export function getTierName(tier: SubscriptionTier | null, level: TierLevel): string {
  if (tier?.name) return tier.name
  return DEFAULT_TIER_NAMES[level]
}
