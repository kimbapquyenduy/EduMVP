# Phase 2: Reduce Redundancy

**Date:** 2025-12-26
**Priority:** Medium
**Status:** Pending
**Estimated Files:** ~8 modified, ~4 deleted

---

## Context

- [Main Plan](plan.md)
- [Phase 1: High-Impact Additions](phase-01-high-impact-additions.md)
- backend-development has 11 reference files (5,103 lines) with redundancy
- databases skill lacks Supabase-specific PostgreSQL patterns

## Overview

Consolidate bloated backend-development references from 11 → 7 files. Add Supabase PostgreSQL reference to databases skill. Establish cross-references between skills to avoid duplication.

---

## Part A: Consolidate Backend Development

### Key Insights

- backend-debugging.md (904 lines) + backend-code-quality.md (659 lines) = 1,563 lines combined
- Authentication content overlaps with `better-auth` skill
- Database content overlaps with `databases` skill
- Some files are minimal (backend-technologies.md = 256 lines)

### Current Structure (11 files, 5,103 lines)

```
references/
├── backend-api-design.md          (512 lines) - KEEP
├── backend-architecture.md        (467 lines) - KEEP
├── backend-authentication.md      (398 lines) - REDIRECT to better-auth
├── backend-code-quality.md        (659 lines) - MERGE
├── backend-debugging.md           (904 lines) - MERGE
├── backend-devops.md              (423 lines) - KEEP (references devops skill)
├── backend-microservices.md       (489 lines) - KEEP
├── backend-performance.md         (378 lines) - KEEP
├── backend-security.md            (361 lines) - KEEP
├── backend-technologies.md        (256 lines) - EXPAND or MERGE
└── backend-testing.md             (256 lines) - KEEP
```

### Target Structure (7 files, ~3,800 lines)

```
references/
├── backend-api-design.md          (512 lines) - unchanged
├── backend-architecture.md        (467 lines) - unchanged
├── backend-code-quality-debugging.md (800 lines) - MERGED
├── backend-devops.md              (423 lines) - add cross-ref to devops skill
├── backend-microservices.md       (489 lines) - unchanged
├── backend-performance.md         (378 lines) - unchanged
├── backend-security.md            (361 lines) - unchanged
└── backend-testing.md             (350 lines) - expanded with tech selection
```

### Changes Required

1. **Merge:** backend-debugging.md + backend-code-quality.md → backend-code-quality-debugging.md
   - Remove duplicate linting/testing content
   - Consolidate error handling patterns
   - Target: 800 lines (down from 1,563)

2. **Remove:** backend-authentication.md
   - Add note in SKILL.md: "For authentication, see `better-auth` skill"
   - Delete file entirely

3. **Remove:** backend-technologies.md
   - Merge relevant content into backend-testing.md
   - Technology selection info → backend-architecture.md

4. **Update:** SKILL.md cross-references
   ```markdown
   ## Related Skills
   - Authentication: See `better-auth` skill
   - Database design: See `databases` skill
   - Deployment: See `devops` skill
   ```

---

## Part B: Add Supabase Reference to Databases

### Key Insights

- databases skill covers PostgreSQL generically
- No Supabase-specific patterns (RLS with auth.uid(), policies, functions)
- Bridge gap until supabase skill is fully adopted

### New File

```
.claude/skills/databases/references/supabase-postgres.md
```

### Content Outline (~300 lines)

```markdown
# Supabase PostgreSQL Patterns

## RLS with auth.uid()
- Policy patterns for user-owned data
- Multi-role access (teacher/student example)
- Deny-by-default setup

## Supabase Functions
- Edge functions vs database functions
- When to use each
- Security definer vs invoker

## Supabase Triggers
- Real-time integration
- Audit logging patterns
- Cascading updates

## Performance with Supabase
- Connection pooling (Supavisor)
- Index strategies for RLS
- Query optimization

## Cross-Reference
> For comprehensive Supabase integration, see `supabase` skill
```

### Update databases/SKILL.md

Add reference to new file and cross-reference to supabase skill.

---

## Implementation Steps

### Part A: Backend Consolidation

1. Read backend-debugging.md and backend-code-quality.md
2. Identify duplicate/overlapping content
3. Create merged backend-code-quality-debugging.md
4. Move technology content from backend-technologies.md
5. Delete: backend-authentication.md, backend-technologies.md
6. Update SKILL.md with cross-references
7. Test skill activation

### Part B: Supabase Reference

1. Create supabase-postgres.md in databases/references/
2. Add RLS patterns from EduMVP codebase
3. Include Supabase-specific functions/triggers
4. Update databases/SKILL.md
5. Test with database-related prompts

---

## Todo List

- [ ] Read backend-debugging.md + backend-code-quality.md
- [ ] Create backend-code-quality-debugging.md (merged)
- [ ] Merge backend-technologies.md content
- [ ] Delete backend-authentication.md
- [ ] Delete backend-technologies.md
- [ ] Update backend-development/SKILL.md with cross-refs
- [ ] Create databases/references/supabase-postgres.md
- [ ] Update databases/SKILL.md
- [ ] Verify no broken references
- [ ] Test skill activation

## Success Criteria

1. backend-development reduced from 11 → 7 reference files
2. Total line count reduced by ~25% (5,103 → ~3,800)
3. No duplicate content between skills
4. Cross-references work correctly
5. Supabase PostgreSQL patterns documented

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken references in SKILL.md | Medium | Grep for old filenames after deletion |
| Lost useful content in merge | Low | Review both files carefully before merge |
| Cross-refs not activated | Low | Test with specific prompts |

## Next Steps

After Phase 2 completion:
- Proceed to [Phase 3: UI Optimization](phase-03-ui-optimization.md)
- Verify backend-development skill still activates correctly
