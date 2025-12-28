// Test file to verify unlock logic
// Run with: node test-unlock-logic.js

function getLessonAccessStatus(lessonIndex, tierPurchase, isTeacher, freeTierLessonCount = 0) {
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

function getAccessibleLessonCount(totalLessons, tierPurchase, isTeacher, freeTierLessonCount = 0) {
  if (isTeacher) return totalLessons

  if (!tierPurchase) {
    return Math.min(freeTierLessonCount, totalLessons)
  }

  if (tierPurchase.tier.lesson_unlock_count === null) {
    return totalLessons
  }

  return Math.min(tierPurchase.tier.lesson_unlock_count, totalLessons)
}

// Test scenarios
console.log('=== Test Scenarios ===\n')

// Scenario 1: No tier purchase, freeTierLessonCount = 0
console.log('Scenario 1: Student with NO purchase, 0 free lessons, 10 total lessons')
const scenario1 = {
  tierPurchase: null,
  freeTierLessonCount: 0,
  totalLessons: 10,
  isTeacher: false
}
const accessibleCount1 = getAccessibleLessonCount(
  scenario1.totalLessons,
  scenario1.tierPurchase,
  scenario1.isTeacher,
  scenario1.freeTierLessonCount
)
const hasLockedLessons1 = accessibleCount1 < scenario1.totalLessons
console.log(`  accessibleCount: ${accessibleCount1}`)
console.log(`  hasLockedLessons: ${hasLockedLessons1}`)
console.log(`  UnlockPrompt should show: ${hasLockedLessons1 ? 'YES' : 'NO'}`)
console.log()

// Scenario 2: No tier purchase, freeTierLessonCount = 3
console.log('Scenario 2: Student with NO purchase, 3 free lessons, 10 total lessons')
const scenario2 = {
  tierPurchase: null,
  freeTierLessonCount: 3,
  totalLessons: 10,
  isTeacher: false
}
const accessibleCount2 = getAccessibleLessonCount(
  scenario2.totalLessons,
  scenario2.tierPurchase,
  scenario2.isTeacher,
  scenario2.freeTierLessonCount
)
const hasLockedLessons2 = accessibleCount2 < scenario2.totalLessons
console.log(`  accessibleCount: ${accessibleCount2}`)
console.log(`  hasLockedLessons: ${hasLockedLessons2}`)
console.log(`  UnlockPrompt should show: ${hasLockedLessons2 ? 'YES' : 'NO'}`)
console.log()

// Scenario 3: Tier 1 purchase (5 lessons)
console.log('Scenario 3: Student with Tier 1 (5 lessons), 10 total lessons')
const scenario3 = {
  tierPurchase: { tier: { lesson_unlock_count: 5 } },
  freeTierLessonCount: 0,
  totalLessons: 10,
  isTeacher: false
}
const accessibleCount3 = getAccessibleLessonCount(
  scenario3.totalLessons,
  scenario3.tierPurchase,
  scenario3.isTeacher,
  scenario3.freeTierLessonCount
)
const hasLockedLessons3 = accessibleCount3 < scenario3.totalLessons
console.log(`  accessibleCount: ${accessibleCount3}`)
console.log(`  hasLockedLessons: ${hasLockedLessons3}`)
console.log(`  UnlockPrompt should show: ${hasLockedLessons3 ? 'YES' : 'NO'}`)
console.log()

// Scenario 4: Tier 3 purchase (unlimited)
console.log('Scenario 4: Student with Tier 3 (unlimited), 10 total lessons')
const scenario4 = {
  tierPurchase: { tier: { lesson_unlock_count: null } },
  freeTierLessonCount: 0,
  totalLessons: 10,
  isTeacher: false
}
const accessibleCount4 = getAccessibleLessonCount(
  scenario4.totalLessons,
  scenario4.tierPurchase,
  scenario4.isTeacher,
  scenario4.freeTierLessonCount
)
const hasLockedLessons4 = accessibleCount4 < scenario4.totalLessons
console.log(`  accessibleCount: ${accessibleCount4}`)
console.log(`  hasLockedLessons: ${hasLockedLessons4}`)
console.log(`  UnlockPrompt should show: ${hasLockedLessons4 ? 'YES' : 'NO'}`)
console.log()

// Test lesson access status for Scenario 1
console.log('=== Lesson Access Details for Scenario 1 (No purchase, 0 free) ===')
for (let i = 0; i < scenario1.totalLessons; i++) {
  const status = getLessonAccessStatus(i, scenario1.tierPurchase, scenario1.isTeacher, scenario1.freeTierLessonCount)
  console.log(`  Lesson ${i}: ${status}`)
}
