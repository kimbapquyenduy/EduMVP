# Phase 1: Database Schema - Class-Restricted DM

**Parent Plan**: [plan.md](./plan.md)
**Dependencies**: None
**Status**: DONE (2025-12-26 22:15 UTC)
**Priority**: Critical

---

## Overview

Add `class_id` to `conversations` table. Update RLS policies to enforce class-membership validation.

## Key Insights

1. TypeScript types already have `class_id` - schema must catch up
2. Current RLS allows ANY authenticated user to create conversations (security gap)
3. Teacher membership validated via `classes.teacher_id`, not `memberships` table
4. Need unique constraint to prevent duplicate DMs

## Requirements

- [x] R1: Add `class_id` FK to conversations
- [ ] R2: RLS - Only classmates can create conversations
- [ ] R3: RLS - Only classmates can be added as participants
- [ ] R4: Prevent duplicate conversations (same class + same participants)
- [ ] R5: Index for query performance

## Architecture

```
conversations
├── id (UUID, PK)
├── class_id (UUID, FK → classes.id) ← ADD
├── created_at
└── updated_at

conversation_participants
├── id (UUID, PK)
├── conversation_id (FK)
├── user_id (FK)
└── joined_at

RLS Flow:
1. INSERT conversation → Check user is member of class_id
2. INSERT participant → Check target user is member of same class
3. SELECT conversation → Check user is participant (existing)
```

## Related Code Files

| File | Action | Purpose |
|------|--------|---------|
| `supabase/005_ADD_CLASS_DM_SUPPORT.sql` | Create | Migration script |
| `src/lib/types/database.types.ts` | Verify | Types already correct |

## Implementation Steps

### Step 1: Create Migration File

```sql
-- File: supabase/005_ADD_CLASS_DM_SUPPORT.sql

-- 1. Add class_id column (nullable for existing conversations)
ALTER TABLE conversations
ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- 2. Add index for performance
CREATE INDEX idx_conversations_class_id ON conversations(class_id);

-- 3. Drop existing permissive policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;

-- 4. New policy: Only class members can create conversations
CREATE POLICY "Class members can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  class_id IS NOT NULL AND
  (
    -- User is a student member
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.class_id = conversations.class_id
      AND m.user_id = auth.uid()
      AND m.status = 'ACTIVE'
    )
    OR
    -- User is the teacher
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = conversations.class_id
      AND c.teacher_id = auth.uid()
    )
  )
);

-- 5. Policy: View conversations user participates in
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);
```

### Step 2: Update Participant RLS

```sql
-- Drop existing
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Only add classmates as participants
CREATE POLICY "Only classmates can be added"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Target user must be class member (student or teacher)
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND (
      -- Target is student member
      EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.class_id = c.class_id
        AND m.user_id = conversation_participants.user_id
        AND m.status = 'ACTIVE'
      )
      OR
      -- Target is teacher
      EXISTS (
        SELECT 1 FROM classes cls
        WHERE cls.id = c.class_id
        AND cls.teacher_id = conversation_participants.user_id
      )
    )
  )
);
```

### Step 3: Add Duplicate Prevention Function

```sql
-- Function to check existing conversation
CREATE OR REPLACE FUNCTION find_existing_dm(
  p_class_id UUID,
  p_user1_id UUID,
  p_user2_id UUID
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.class_id = p_class_id
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = p_user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_user2_id
  )
  AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
  LIMIT 1;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Completed Tasks

- [x] Create `supabase/005_ADD_CLASS_DM_SUPPORT.sql` (160 lines)
- [x] Add `class_id` column with FK constraint
- [x] Create index on `class_id`
- [x] Update INSERT policy for conversations
- [x] Update INSERT policy for participants
- [x] Add `find_existing_dm` function
- [x] Verify TypeScript types (already include `class_id` nullable)

## Success Criteria

- `class_id` column exists and indexed
- RLS blocks conversation creation without class membership
- RLS blocks adding non-classmates as participants
- `find_existing_dm` returns existing conversation ID
- Existing conversations still accessible (nullable migration)

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Existing conversations break | High | Low | class_id nullable, backfill strategy |
| RLS too restrictive | Medium | Medium | Thorough testing before deploy |
| Index bloat | Low | Low | Standard UUID index size |

## Security Considerations

1. **RLS Enforcement** - All checks at DB level, not application
2. **SECURITY DEFINER** - `find_existing_dm` runs as definer to access all conversations
3. **Cascade Delete** - Class deletion removes all conversations
4. **No Cross-Class Leakage** - Double validation (conversation + participant level)

## Next Steps

After completion:
1. Run migration in dev environment
2. Test all RLS scenarios
3. Proceed to Phase 2 (UI Components)
