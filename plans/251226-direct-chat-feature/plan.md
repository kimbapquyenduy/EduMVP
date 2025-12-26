# Class-Restricted Direct Messaging - Implementation Plan

**Created**: 2025-12-26
**Status**: Phase 1 Complete
**Priority**: High

---

## Summary

Add class-scoped DM capability. Users can only message members of shared classes. Includes realtime updates via Supabase.

## Current State

| Component | Status | Gap |
|-----------|--------|-----|
| `conversations` table | Exists | Missing `class_id` column |
| `conversation_participants` | Exists | OK |
| `messages` table | Exists | OK |
| RLS policies | Exists | No class-membership validation |
| `MessagingInterface.tsx` | 324 lines | No "start DM", no realtime |
| TypeScript types | Has `class_id` | Schema mismatch |

## Phases

| Phase | File | Priority | Status | Progress |
|-------|------|----------|--------|----------|
| 1 | [phase-01-database-schema.md](./phase-01-database-schema.md) | Critical | DONE | 100% |
| 2 | [phase-02-ui-components.md](./phase-02-ui-components.md) | High | Pending | 0% |
| 3 | [phase-03-realtime-messaging.md](./phase-03-realtime-messaging.md) | Medium | Blocked | 0% |

**Dependencies**: Phase 2 requires Phase 1. Phase 3 requires Phase 2.

## Key Decisions

1. **class_id on conversations** - Simpler RLS, clear class scope, prevents cross-class DM
2. **Unique constraint** - Prevent duplicate conversations (class_id + user pair)
3. **Teacher as member** - Teacher included via `classes.teacher_id` check, not `memberships`
4. **Realtime channel per conversation** - Isolated, scalable

## Files to Modify

- `supabase/005_ADD_CLASS_DM_SUPPORT.sql` (create)
- `src/components/shared/MessagingInterface.tsx` (modify)
- `src/components/shared/StartDMDialog.tsx` (create)
- `src/components/shared/ClassMemberPicker.tsx` (create)
- `src/hooks/useRealtimeMessages.ts` (create)
- `src/hooks/useClassMembers.ts` (create)

## Success Criteria

- [ ] Users can only DM members of shared classes
- [ ] "Start DM" button with class-scoped member picker
- [ ] Messages appear in realtime (no page refresh)
- [ ] Duplicate conversations prevented
- [ ] RLS blocks cross-class DM attempts

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration breaks existing conversations | High | Add `class_id` as nullable, backfill later |
| Realtime subscription leaks | Medium | Proper cleanup in useEffect |
| Performance on large classes | Low | Indexed queries, pagination |

---

## Research References

- [Supabase Realtime Patterns](./research/researcher-01-supabase-realtime.md)
- [Class-Restricted DM Patterns](./research/researcher-02-class-dm-patterns.md)
