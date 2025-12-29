# Documentation Index - EduMVP Tier Management System

**Last Updated**: December 28, 2025
**Phase**: Phase 1 - Teacher Tier Management

---

## Quick Navigation

### For Feature Overviews
- **FEATURES_PHASE_1.md** - Complete feature guide with UI/UX details
- **PROJECT_SUMMARY.md** - Project-level overview & progress

### For Architecture & Design
- **TIER_MANAGEMENT_ARCHITECTURE.md** - System design, data flows, security
- **TIER_MANAGEMENT_ARCHITECTURE.md** - Component structure & API spec

### For Reports & Changes
- **plans/reports/DOCUMENTATION_UPDATE_COMPLETE.md** - Completion summary
- **plans/reports/docs-manager-251228-teacher-tier-management.md** - Detailed change report
- **plans/reports/docs-manager-summary-251228.md** - Manager summary

### For Setup & Quick Start
- **QUICK_START.md** - Initial project setup
- **SETUP_GUIDE.md** - Development environment
- **MIGRATION_GUIDE.md** - Database migration guide

---

## Document Purposes

### FEATURES_PHASE_1.md
**Best for**: Understanding the tier management feature
**Contains**:
- Feature overview
- 4-tier structure explanation
- Configuration options
- User experience flows
- API examples
- Database schema
- Testing strategy

**Read if**: You're implementing Phase 2, need to understand tier system, or testing the feature.

---

### TIER_MANAGEMENT_ARCHITECTURE.md
**Best for**: Deep technical understanding
**Contains**:
- System architecture diagrams
- Data flow visualizations
- Component structure details
- API layer specification
- Database constraints & indexes
- Security considerations
- Error handling patterns
- State machine diagram

**Read if**: You're debugging, optimizing, or extending the tier system.

---

### plans/reports/DOCUMENTATION_UPDATE_COMPLETE.md
**Best for**: Quick overview of what was updated
**Contains**:
- Change summary
- File locations
- Feature overview
- API quick reference
- Integration verification
- Statistics

**Read if**: You need a high-level summary or want to understand the integration.

---

### plans/reports/docs-manager-251228-teacher-tier-management.md
**Best for**: Detailed change documentation
**Contains**:
- Component integration details
- Architecture overview
- Database schema reference
- API documentation
- UI/UX behavior
- Integration checklist
- Phase 2 roadmap

**Read if**: You're reviewing changes or need detailed API documentation.

---

### plans/reports/docs-manager-summary-251228.md
**Best for**: Manager & architect perspective
**Contains**:
- Changes made summary
- Files modified list
- Coverage assessment
- Key technical details
- Integration points
- Documentation quality checklist
- Next steps for Phase 2

**Read if**: You're managing the project or planning Phase 2.

---

## Code File References

### TierPricingForm Component
**Location**: `src/components/teacher/TierPricingForm.tsx`
**Purpose**: Teacher tier configuration UI
**Related Docs**: FEATURES_PHASE_1.md, TIER_MANAGEMENT_ARCHITECTURE.md

### Tier Management API
**Location**: `src/app/api/tiers/[classId]/route.ts`
**Methods**: GET (fetch), PUT (update)
**Related Docs**: All architect documents

### Settings Page Integration
**Location**: `src/app/teacher/classes/[classId]/settings/page.tsx`
**Change**: Added TierPricingForm component (lines 66-68)
**Related Docs**: TIER_MANAGEMENT_ARCHITECTURE.md

### Database Types
**Location**: `src/lib/types/database.types.ts`
**Type**: SubscriptionTier interface
**Related Docs**: FEATURES_PHASE_1.md

---

## Database Schema References

### subscription_tiers Table
**Fields**:
- id (UUID, primary key)
- class_id (UUID, foreign key)
- tier_level (0-3)
- name (string)
- price (integer, >= 0)
- lesson_unlock_count (integer or null)
- is_enabled (boolean)
- created_at, updated_at (timestamps)

**Related Docs**: FEATURES_PHASE_1.md, TIER_MANAGEMENT_ARCHITECTURE.md

---

## Development Workflow

### Reading Order for New Developers

1. **Start**: PROJECT_SUMMARY.md (big picture)
2. **Overview**: FEATURES_PHASE_1.md (what's built)
3. **Deep Dive**: TIER_MANAGEMENT_ARCHITECTURE.md (how it works)
4. **Reference**: Component source code
5. **Changes**: plans/reports/DOCUMENTATION_UPDATE_COMPLETE.md (what was updated)

### For Specific Tasks

**Implementing Phase 2 Student Purchase**:
→ FEATURES_PHASE_1.md (understand current tier system)
→ TIER_MANAGEMENT_ARCHITECTURE.md (understand data flow)
→ plans/reports/docs-manager-summary-251228.md (see "Next Documentation Tasks")

**Debugging API Issues**:
→ plans/reports/docs-manager-251228-teacher-tier-management.md (API reference)
→ TIER_MANAGEMENT_ARCHITECTURE.md (error handling patterns)
→ API route source code

**Optimizing Performance**:
→ TIER_MANAGEMENT_ARCHITECTURE.md (performance section)
→ Component source code

**Testing the Feature**:
→ FEATURES_PHASE_1.md (testing considerations)
→ TIER_MANAGEMENT_ARCHITECTURE.md (testing strategy)

---

## API Quick Reference

### GET /api/tiers/[classId]
- **Purpose**: Fetch tier configuration
- **Auth**: None
- **Returns**: Array of 4 SubscriptionTier objects
- **Docs**: plans/reports/docs-manager-251228-teacher-tier-management.md

### PUT /api/tiers/[classId]
- **Purpose**: Update tier configuration
- **Auth**: Required (teacher only)
- **Body**: Array of tier updates
- **Returns**: Updated tiers array
- **Docs**: plans/reports/docs-manager-251228-teacher-tier-management.md

---

## Tier System Quick Reference

| Tier | Name | Price | Lessons | Toggle |
|------|------|-------|---------|--------|
| 0 | Miễn phí | 0 | 0* | No |
| 1 | Cơ bản | 50K* | 5* | Yes |
| 2 | Tiêu chuẩn | 100K* | 10* | Yes |
| 3 | Trọn bộ | 200K* | ∞* | Yes |

*Configurable by teacher

**Full Details**: FEATURES_PHASE_1.md

---

## Related Documentation

### Previous Phases
- **PHASE_1_SKILLS.md** - Phase 1 tooling & skills
- **UPDATE_STATUS.md** - Schools → Classes migration status
- **MIGRATION_GUIDE.md** - Database migration details

### Project Setup
- **QUICK_START.md** - Getting started
- **SETUP_GUIDE.md** - Environment setup
- **README.md** - Project overview

---

## Standards & Conventions

### Code Naming
- Snake_case for database fields (tier_level, lesson_unlock_count)
- camelCase for JavaScript variables & functions
- PascalCase for React components & TypeScript types

### API Responses
- Success: 200 with data
- Client error: 400/403/404
- Server error: 500
- Always include error message in response

### UI Labels
- Vietnamese labels in all user-facing text
- Format numbers using Vietnamese locale (50.000 instead of 50000)
- Currency shown as ₫ (Vietnamese Dong)

### Tier Structure
- Always 4 tiers per class (Free, Basic, Standard, Premium)
- Tier 0 always free and enabled
- Tiers auto-created if missing
- lesson_unlock_count of null means unlimited

---

## Maintenance Notes

**Last Review**: December 28, 2025
**Review Frequency**: Before each phase release
**Owner**: Documentation Manager

### When to Update
- When API endpoints change
- When database schema changes
- When new features are added
- When bugs are fixed
- When code patterns change

### How to Update
1. Review code changes
2. Identify affected documentation
3. Update documentation files
4. Add entry to this index if new file
5. Commit with documentation changes

---

## Common Questions

**Q: Where do I find the tier configuration form?**
A: `src/components/teacher/TierPricingForm.tsx`. It's rendered in `/teacher/classes/[classId]/settings`.

**Q: How are tiers stored in the database?**
A: In the `subscription_tiers` table with one row per tier per class.

**Q: How many tiers can a class have?**
A: Always exactly 4 (Free, Basic, Standard, Premium). See FEATURES_PHASE_1.md.

**Q: What happens if tiers don't exist for a class?**
A: The GET endpoint auto-creates 4 default tiers. See TIER_MANAGEMENT_ARCHITECTURE.md.

**Q: Can the Free tier be disabled?**
A: No. Only tiers 1-3 can be toggled. Tier 0 is always enabled.

**Q: How is lesson_unlock_count used?**
A: It determines how many lessons students get access to when they subscribe to that tier. NULL means unlimited.

**More Questions?** See the detailed documentation files or review the source code.

---

## File Summary

| File | Type | Purpose | Read Time |
|------|------|---------|-----------|
| FEATURES_PHASE_1.md | Feature Doc | Feature overview & details | 10 min |
| TIER_MANAGEMENT_ARCHITECTURE.md | Architecture | Technical design & implementation | 15 min |
| DOCUMENTATION_UPDATE_COMPLETE.md | Report | Completion summary | 5 min |
| docs-manager-251228-teacher-tier-management.md | Change Report | Detailed changes & API docs | 10 min |
| docs-manager-summary-251228.md | Manager Summary | Changes & next steps | 8 min |

---

**Total Documentation**: 1,200+ lines
**Coverage**: Complete for Phase 1
**Status**: Current & maintained

Last updated: December 28, 2025
