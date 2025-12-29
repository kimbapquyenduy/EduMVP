# Documentation Index - EduMVP Tier Management System

**Last Updated**: December 29, 2025
**Phase**: Phase 1 & 2 Complete (Tier Configuration & Lesson Locking)

---

## Quick Navigation

### For Quick Overview
- **TIER_LESSON_LOCKING_UPDATE.md** - Phase 2 summary (what changed, why, how)
- **FEATURES_PHASE_1.md** - Complete feature guide

### For Technical Deep Dives
- **TIER_MANAGEMENT_ARCHITECTURE.md** - Complete system design

### For Setup & Getting Started
- **QUICK_START.md** - Initial project setup
- **SETUP_GUIDE.md** - Development environment

---

## What Changed from Phase 1 to Phase 2

### Old Model
- lesson_unlock_count on tiers table
- "First N lessons" approach

### New Model
- required_tier_level on lessons table
- Per-lesson tier assignment
- More flexible teacher control

---

## Core Access Control (Tier Hierarchy)

User Tier N can access content requiring tier 0 to N:
- Tier 0 → [0]
- Tier 1 → [0, 1]
- Tier 2 → [0, 1, 2]
- Tier 3 → [0, 1, 2, 3]
- Teachers → always full access

---

## Component Locations

- **TierPricingForm**: src/components/teacher/TierPricingForm.tsx
- **LessonTierSelector**: src/components/teacher/LessonTierSelector.tsx (NEW)
- **StudentCourseViewer**: src/components/student/StudentCourseViewer.tsx

---

## Database Changes

### lessons table (Phase 2 Addition)
```sql
ALTER TABLE lessons ADD COLUMN required_tier_level INTEGER
  CHECK (required_tier_level IN (0, 1, 2, 3) OR required_tier_level IS NULL);
```

NULL = inherit course tier, 0-3 = specific tier required

---

## API Endpoints

### GET /api/tiers/[classId]
Public (no auth), returns 4 tiers, auto-creates defaults

### PUT /api/tiers/[classId]
Auth required (teacher only), updates tier config

---

## File Summary

| File | Type | Status |
|------|------|--------|
| TIER_LESSON_LOCKING_UPDATE.md | Phase Summary | NEW |
| TIER_MANAGEMENT_ARCHITECTURE.md | Architecture | UPDATED |
| FEATURES_PHASE_1.md | Feature Doc | Current |

---

**Last Updated**: 2025-12-29
**Status**: Phase 1 & 2 Complete

