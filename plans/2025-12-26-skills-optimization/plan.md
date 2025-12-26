# Skills Optimization Plan

**Date:** 2025-12-26
**Status:** Pending Approval
**Scope:** Optimize 5 core skills for EduMVP (Next.js + Supabase + React + TypeScript)

---

## Overview

Optimize existing skills to better support EduMVP development stack. Create new Supabase skill, add missing automation scripts, reduce redundancy, and improve UI patterns.

## Phases

| Phase | Name | Priority | Status | Details |
|-------|------|----------|--------|---------|
| 1 | [High-Impact Additions](phase-01-high-impact-additions.md) | High | Done | New supabase skill + frontend-development scripts |
| 2 | [Reduce Redundancy](phase-02-reduce-redundancy.md) | Medium | Pending | Consolidate backend-development + add supabase ref to databases |
| 3 | [UI Optimization](phase-03-ui-optimization.md) | Low | Pending | Font optimization + MUI v7 patterns |

## Summary Metrics

| Metric | Before | After |
|--------|--------|-------|
| Skills with scripts | 3/5 | 5/5 |
| Skills with tests | 3/5 | 5/5 |
| Supabase coverage | 0% | 100% |
| Total skill size | ~6.6MB | ~1.5MB |
| Redundant content | ~30% | ~5% |

## Deliverables

### Phase 1 (High Priority)
- [x] New `supabase` skill (SKILL.md + 6 references + 2 scripts + tests)
- [x] `frontend-development/scripts/` (component generator + feature scaffolder + tests)

### Phase 2 (Medium Priority)
- [ ] Consolidated `backend-development` references (11 → 7 files)
- [ ] New `databases/references/supabase-postgres.md`
- [ ] Cross-references between skills

### Phase 3 (Low Priority)
- [ ] External font references in `ui-styling`
- [ ] New `ui-styling/references/mui-v7-patterns.md`
- [ ] Size reduction from 5.8MB to ~300KB

## Success Criteria

1. All 5 skills have automation scripts with tests
2. Supabase patterns documented for RLS, Auth, Realtime, Storage
3. No duplicate content between skills (use cross-references)
4. Total skill directory size reduced by >75%
5. MUI v7 patterns available alongside shadcn

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing skill references | Medium | Test all skills after changes |
| Script compatibility (Windows/Mac/Linux) | Low | Use Python, avoid bash |
| Font removal affects design workflow | Low | Keep CDN links as fallback |

---

## Next Steps

1. Review phase details in linked files
2. Approve or request changes
3. Implement phase-by-phase
