# Conversation Creation RLS Failure Investigation

**Date:** 2025-12-28
**Issue:** Users cannot create new conversations despite applying membership RLS fixes
**Status:** ROOT CAUSE IDENTIFIED

---

## Executive Summary

**Root Cause:** RLS policy recursion when inserting `conversation_participants` - policy queries own table during INSERT causing infinite recursion/permission denial.

**Impact:** Complete conversation creation failure. Users cannot start DMs.

**Fix Priority:** CRITICAL - core messaging feature broken.

---

## Timeline of Events

1. **Migration 004** applied `is_class_member()` helper to fix memberships visibility
2. **Migration 005** added class-scoped DM with strict RLS policies
3. Conversation creation now fails at `conversation_participants` INSERT step

---

## Technical Analysis

### Conversation Creation Flow (StartDMDialog.tsx:66-131)

```typescript
1. Check existing DM via find_existing_dm() RPC     ✓ WORKS
2. INSERT into conversations table                   ✓ WORKS
3. INSERT into conversation_participants (2 rows)    ✗ FAILS
4. Navigate to conversation                          ✗ NOT REACHED
```

### RLS Policy Analysis

**File:** `supabase/005_ADD_CLASS_DM_SUPPORT.sql:70-108`

**Policy:** "Only classmates can be added as participants"

```sql
CREATE POLICY "Only classmates can be added as participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- SECURITY: Inserter must be existing participant OR first 2 participants
  (
    EXISTS (
      SELECT 1 FROM conversation_participants cp    -- ← RECURSION HERE
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
    OR
    -- Allow first 2 participants (conversation creator + target)
    (SELECT COUNT(*) FROM conversation_participants cp  -- ← RECURSION HERE
     WHERE cp.conversation_id = conversation_participants.conversation_id) < 2
  )
  AND
  -- Target user must be class member validation...
)
```

**Problem:** RLS policy queries `conversation_participants` table **during INSERT INTO conversation_participants**

### Why It Fails

1. **Initial State:** New conversation has 0 participants
2. **First INSERT:** User tries to add themselves
   - Policy checks: "Is user existing participant?" → NO (table empty)
   - Policy checks: "Is count < 2?" → **QUERIES SAME TABLE BEING INSERTED**
   - RLS applies to subquery → **Recursion or permission denied**
3. **Result:** INSERT rejected despite logic being valid

### Evidence from Code

**StartDMDialog.tsx:109-114** - Sequential INSERT (not batch):
```typescript
const { error: participantsError } = await supabase
  .from('conversation_participants')
  .insert([
    { conversation_id: conv.id, user_id: userId },        // ← First row fails
    { conversation_id: conv.id, user_id: selectedUserId }, // ← Never reached
  ])
```

**Migration 005:82-84** - Count query triggers RLS on same table:
```sql
(SELECT COUNT(*) FROM conversation_participants cp
 WHERE cp.conversation_id = conversation_participants.conversation_id) < 2
```

---

## Root Cause

**RLS policy on `conversation_participants` queries itself during INSERT, causing recursion or permission denial.**

The policy needs to check existing participants to allow "first 2", but RLS blocks the subquery from reading the table it's inserting into.

---

## Recommended Solutions

### Option 1: SECURITY DEFINER Function (Preferred)

Create helper function that bypasses RLS for participant count:

```sql
CREATE OR REPLACE FUNCTION get_participant_count(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM conversation_participants
          WHERE conversation_id = p_conversation_id);
END;
$$;

-- Update policy to use function:
WITH CHECK (
  (
    get_participant_count(conversation_participants.conversation_id) < 2
    OR EXISTS (SELECT 1 FROM conversation_participants cp
               WHERE cp.conversation_id = conversation_participants.conversation_id
               AND cp.user_id = auth.uid())
  )
  AND
  -- ... rest of validation
)
```

**Pros:** Clean, maintains security, avoids recursion
**Cons:** Requires new migration

### Option 2: Temporary Permissive Policy

Allow authenticated users to INSERT participants, rely on application logic:

```sql
DROP POLICY "Only classmates can be added as participants" ON conversation_participants;

CREATE POLICY "Authenticated users can add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Only validate target is class member
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND (
      EXISTS (SELECT 1 FROM memberships m
              WHERE m.class_id = c.class_id
              AND m.user_id = conversation_participants.user_id
              AND m.status = 'ACTIVE')
      OR
      EXISTS (SELECT 1 FROM classes cls
              WHERE cls.id = c.class_id
              AND cls.teacher_id = conversation_participants.user_id)
    )
  )
);
```

**Pros:** Simple, unblocks users immediately
**Cons:** Weaker security (no participant count validation at DB level)

### Option 3: Server-Side RPC Function

Move conversation creation to RPC function with SECURITY DEFINER:

```sql
CREATE OR REPLACE FUNCTION create_dm_conversation(
  p_class_id UUID,
  p_target_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  -- Security: Verify both users are class members
  -- ... validation logic ...

  -- Create conversation
  INSERT INTO conversations (class_id)
  VALUES (p_class_id)
  RETURNING id INTO v_conversation_id;

  -- Add participants (bypasses RLS)
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_caller_id),
    (v_conversation_id, p_target_user_id);

  RETURN v_conversation_id;
END;
$$;
```

**Pros:** Full control, strongest security
**Cons:** Requires frontend refactor (StartDMDialog.tsx)

---

## Immediate Actions

1. **Apply Option 1 (SECURITY DEFINER helper)** - Best balance of security + simplicity
2. **Test conversation creation** with class members
3. **Verify participant count limit** works (prevents 3rd participant)

---

## Long-Term Improvements

- **Add database constraint:** `UNIQUE(conversation_id, user_id)` already exists, add `CHECK` for max 2 participants
- **Application-level validation:** Check participant count before INSERT (faster feedback)
- **RLS audit:** Review all policies for self-referential queries

---

## Supporting Evidence

### Files Analyzed

- `src/components/shared/StartDMDialog.tsx` - Frontend conversation creation
- `src/hooks/useClassMembers.ts` - Member fetching (works correctly)
- `supabase/001_FULL_SCHEMA.sql` - Initial RLS policies
- `supabase/004_FIX_MEMBERSHIP_RLS_FOR_CLASS_MEMBERS.sql` - `is_class_member()` helper
- `supabase/005_ADD_CLASS_DM_SUPPORT.sql` - Class DM migration with problematic policy

### RLS Policies for conversation_participants

**Current Policies:**
1. SELECT: "Users can view conversation participants" ✓ OK
2. INSERT: "Only classmates can be added as participants" ✗ RECURSIVE

**conversations Table Policies:**
1. SELECT: "Users can view own conversations" ✓ OK
2. INSERT: "Class members can create conversations" ✓ OK

---

## Unresolved Questions

1. Are there browser console errors showing exact Supabase error message?
2. Has `find_existing_dm()` RPC been tested separately (does it work)?
3. Do we want to enforce 2-participant limit at DB level or app level?

---

**Next Step:** Apply Option 1 migration to fix RLS recursion.
