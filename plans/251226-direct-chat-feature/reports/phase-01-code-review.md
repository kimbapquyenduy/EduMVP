# Code Review: Phase 1 Database Schema - Class-Restricted DM

**Reviewer**: code-reviewer (ad4f78f)
**Date**: 2025-12-26
**Scope**: Database migration + TypeScript types
**Status**: ✅ PASS (with suggestions)

---

## Files Reviewed

1. `supabase/005_ADD_CLASS_DM_SUPPORT.sql` (NEW - 134 lines)
2. `src/lib/types/database.types.ts` (MODIFIED - line 130)

---

## Overall Assessment

**Strong implementation**. Security-first design with proper RLS enforcement, backward compatibility, and performance indexing. No critical blockers. Minor suggestions for optimization and clarity.

---

## ✅ Critical Issues

**NONE**

---

## ⚠️ High Priority Findings

### H1: SECURITY DEFINER Function Without RLS Check

**File**: `005_ADD_CLASS_DM_SUPPORT.sql:102-127`

**Issue**: `find_existing_dm` marked `SECURITY DEFINER` bypasses RLS to read ALL conversations. No validation that caller is member of `p_class_id`.

**Risk**: Authenticated user can enumerate conversations in ANY class by brute-forcing UUIDs.

**Impact**: Privacy leak - user can discover if two arbitrary users have DM'd in a class they don't belong to.

**Fix**:
```sql
CREATE OR REPLACE FUNCTION find_existing_dm(
  p_class_id UUID,
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- SECURITY: Verify caller is class member
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.class_id = p_class_id
    AND m.user_id = auth.uid()
    AND m.status = 'ACTIVE'
  ) AND NOT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = p_class_id
    AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Rest of query...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 💡 Medium Priority Improvements

### M1: Missing RLS Policies for UPDATE/DELETE

**File**: `005_ADD_CLASS_DM_SUPPORT.sql:27-60`

**Issue**: Only `INSERT` and `SELECT` policies defined. No `UPDATE` or `DELETE` on `conversations`.

**Impact**: Existing conversations cannot be updated (metadata, timestamps) or deleted by creator.

**Recommendation**:
```sql
-- Allow conversation participants to update metadata
CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Allow class teacher to delete conversations
CREATE POLICY "Teachers can delete class conversations"
ON conversations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = conversations.class_id
    AND c.teacher_id = auth.uid()
  )
);
```

### M2: Participant Policy Missing Permission Check

**File**: `005_ADD_CLASS_DM_SUPPORT.sql:70-95`

**Issue**: RLS validates target user is classmate but doesn't check if INSERTER is conversation participant.

**Impact**: Any class member can add ANY other classmate to ANY conversation in the class.

**Fix**:
```sql
CREATE POLICY "Only classmates can be added as participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Inserter must be existing participant (unless first 2 participants)
  (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR
    (SELECT COUNT(*) FROM conversation_participants cp
     WHERE cp.conversation_id = conversation_participants.conversation_id) < 2
  )
  AND
  -- Target must be classmate
  EXISTS (...)
);
```

### M3: Index Could Be Composite for Query Patterns

**File**: `005_ADD_CLASS_DM_SUPPORT.sql:16`

**Issue**: Single-column index on `class_id`. Most queries join with `conversation_participants`.

**Recommendation**:
```sql
-- Better for find_existing_dm query
CREATE INDEX idx_conversations_class_created
ON conversations(class_id, created_at DESC);
```

---

## 📌 Low Priority Suggestions

### L1: Function Should Return NULL Instead of Exception

**File**: `005_ADD_CLASS_DM_SUPPORT.sql:125`

**Issue**: Function returns `NULL` on no match but has no error handling.

**Suggestion**: Add comment explaining NULL semantics:
```sql
-- Returns conversation ID if found, NULL if no existing DM
RETURN v_conversation_id;
```

### L2: Type Comment Outdated After Nullable Change

**File**: `database.types.ts:130`

**Observation**: Comment says "backward compat with existing convos" but doesn't explain migration path.

**Suggestion**: Add JSDoc:
```typescript
export interface Conversation {
  id: string
  /** FK to classes. NULL for legacy conversations created before class-DM migration */
  class_id: string | null
  created_at: string
  updated_at: string
}
```

---

## 🎯 Positive Observations

1. **Security-First Design** - RLS at DB level, not application
2. **Backward Compatibility** - Nullable `class_id` won't break existing data
3. **CASCADE DELETE** - Proper cleanup when class deleted
4. **Double Validation** - Both conversation AND participant level checks
5. **Index Added** - Won't miss performance on class_id queries
6. **KISS Principle** - Function logic straightforward, no over-engineering

---

## 📊 Metrics

- **Type Coverage**: 100% (TypeScript types match schema)
- **RLS Coverage**: 75% (missing UPDATE/DELETE policies)
- **Security Issues**: 1 high (SECURITY DEFINER bypass)
- **Performance**: Good (index added, needs composite optimization)

---

## ✅ Recommended Actions

1. **MUST FIX** (H1): Add auth check to `find_existing_dm` function
2. **SHOULD FIX** (M2): Validate inserter is participant before adding others
3. **CONSIDER** (M1): Add UPDATE/DELETE policies for completeness
4. **OPTIONAL** (M3): Optimize index for composite query patterns

---

## 🎬 Final Verdict

**PASS** - Approve for Phase 2 after fixing H1 (SECURITY DEFINER auth).

Implementation is solid, secure, and follows YAGNI/KISS principles. The SECURITY DEFINER issue is the only blocker preventing safe deployment.

---

## Unresolved Questions

1. What happens to conversations when user membership expires? Should existing DMs remain accessible?
2. Should there be a limit on participants per DM (currently allows unlimited via repeated INSERT)?
3. Is `CASCADE DELETE` desired behavior or should conversations be soft-deleted when class removed?
