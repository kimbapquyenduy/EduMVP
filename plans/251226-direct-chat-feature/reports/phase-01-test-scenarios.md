# Phase 1 Test Scenarios: Class-Restricted DM Database Schema

**Date**: 2025-12-26
**Migration**: `supabase/005_ADD_CLASS_DM_SUPPORT.sql`
**Status**: Ready for Manual Testing

---

## SQL Syntax Validation

### Schema Changes
- [x] `ALTER TABLE conversations ADD COLUMN class_id` - Nullable FK, backward compatible
- [x] `CREATE INDEX idx_conversations_class_id` - Performance index added
- [x] `DROP POLICY` statements - Safely removes old policies
- [x] New RLS policies created with explicit conditions
- [x] `find_existing_dm()` function - PL/pgSQL syntax valid, SECURITY DEFINER set

**Status**: Migration syntax validated. Ready to deploy.

---

## RLS Policy Test Cases

### Test Setup
**Test Data Needed**:
- Teacher: `teacher_user_id` (creates class)
- Student A: `student_a_id` (enrolled in ClassX)
- Student B: `student_b_id` (enrolled in ClassX)
- Student C: `student_c_id` (enrolled in ClassY, different class)
- ClassX: `class_x_id` with `teacher_user_id`
- ClassY: `class_y_id` with `teacher_user_id`

---

### 1. Cross-Class DM Blocking

**Scenario**: Student A (ClassX) attempts DM with Student C (ClassY)

```sql
-- As Student A, attempt to create conversation in ClassY (not a member)
INSERT INTO conversations (class_id)
VALUES ('class_y_id');

-- Expected: PERMISSION DENIED
-- Reason: Student A not in memberships for ClassY
```

**Manual Test**: [ ] Blocked  [ ] Need fix

---

### 2. Teacher Can DM Students

**Scenario**: Teacher initiates conversation with Student A (same class)

```sql
-- As teacher, create conversation in ClassX
INSERT INTO conversations (class_id)
VALUES ('class_x_id')
RETURNING id AS conversation_id;

-- Add Student A as participant
INSERT INTO conversation_participants
(conversation_id, user_id)
VALUES ('conversation_id', 'student_a_id');

-- Expected: SUCCESS
-- Reason: Teacher validated via classes.teacher_id = 'teacher_user_id'
```

**Manual Test**: [ ] Allowed  [ ] Need fix

---

### 3. Students Can DM Teacher

**Scenario**: Student A initiates conversation with Teacher

```sql
-- As Student A (in ClassX), create conversation
INSERT INTO conversations (class_id)
VALUES ('class_x_id')
RETURNING id AS conversation_id;

-- Add teacher as participant
INSERT INTO conversation_participants
(conversation_id, user_id)
VALUES ('conversation_id', 'teacher_user_id');

-- Expected: SUCCESS
-- Reason: Student A in memberships with status='ACTIVE' for ClassX
-- Teacher is class owner (can be added)
```

**Manual Test**: [ ] Allowed  [ ] Need fix

---

### 4. Students Can DM Classmates

**Scenario**: Student A DMs Student B (same class, both active members)

```sql
-- As Student A, create conversation in ClassX
INSERT INTO conversations (class_id)
VALUES ('class_x_id')
RETURNING id AS conversation_id;

-- Add Student B (same class) as participant
INSERT INTO conversation_participants
(conversation_id, user_id)
VALUES ('conversation_id', 'student_b_id');

-- Expected: SUCCESS
-- Reason: Both students in memberships for ClassX with status='ACTIVE'
```

**Manual Test**: [ ] Allowed  [ ] Need fix

---

### 5. Expired Member Cannot DM

**Scenario**: Student with EXPIRED membership attempts DM

```sql
-- Student with status='EXPIRED' in ClassX tries to create conversation
INSERT INTO conversations (class_id)
VALUES ('class_x_id');

-- Expected: PERMISSION DENIED
-- Reason: RLS checks m.status = 'ACTIVE' (expired members excluded)
```

**Manual Test**: [ ] Blocked  [ ] Need fix

---

### 6. Non-Member Cannot Add Participant

**Scenario**: Student C (ClassY) attempts to add someone to ClassX conversation

```sql
-- As Student C, attempt to add participant to ClassX conversation
INSERT INTO conversation_participants
(conversation_id, user_id)
VALUES ('classX_conversation_id', 'student_a_id');

-- Expected: PERMISSION DENIED
-- Reason: RLS validates target user is classmate (not applicable here)
```

**Manual Test**: [ ] Blocked  [ ] Need fix

---

## Duplicate Conversation Prevention

### Test Case: `find_existing_dm()` Function

```sql
-- Create first DM between Student A and B in ClassX
SELECT find_existing_dm(
  'class_x_id',
  'student_a_id',
  'student_b_id'
) AS existing_dm_id;

-- Expected: NULL (first call)

-- Create conversation and add both participants
INSERT INTO conversations (class_id)
VALUES ('class_x_id') RETURNING id AS conv_id;

INSERT INTO conversation_participants (conversation_id, user_id)
VALUES
  ('conv_id', 'student_a_id'),
  ('conv_id', 'student_b_id');

-- Call function again
SELECT find_existing_dm(
  'class_x_id',
  'student_a_id',
  'student_b_id'
) AS existing_dm_id;

-- Expected: Returns 'conv_id' (prevents duplicate creation)
```

**Manual Test**: [ ] Returns NULL on first call  [ ] Returns ID on second call  [ ] Need fix

---

## Backward Compatibility Test

### Nullable class_id Handling

```sql
-- Existing conversations (created before migration) have class_id = NULL
-- Can still view them via existing RLS policy:
-- "Users can view own conversations" → checks participation only

-- Verify old conversations are still accessible
SELECT * FROM conversations
WHERE class_id IS NULL
AND EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.conversation_id = conversations.id
  AND cp.user_id = 'any_user_id'
);

-- Expected: Returns old conversations (unaffected by new policies)
```

**Manual Test**: [ ] Old convos still accessible  [ ] Need fix

---

## Performance Validation

### Index Verification

```sql
-- Verify index exists and is being used
SELECT indexname FROM pg_indexes
WHERE tablename = 'conversations'
AND indexname = 'idx_conversations_class_id';

-- Expected: 1 row (index created successfully)

-- Check index usage (after queries)
SELECT * FROM pg_stat_user_indexes
WHERE indexrelname = 'idx_conversations_class_id';

-- Expected: idx_scan > 0 (index is being used)
```

**Manual Test**: [ ] Index exists  [ ] Index scanned  [ ] Need fix

---

## Checklist Summary

- [ ] Migration deployed to dev environment
- [ ] Schema column exists: `conversations.class_id`
- [ ] Index created: `idx_conversations_class_id`
- [ ] RLS policy "Class members can create conversations" enforced
- [ ] RLS policy "Only classmates can be added" enforced
- [ ] Cross-class DM blocked
- [ ] Teacher-student DM allowed
- [ ] Student-teacher DM allowed
- [ ] Student-student DM allowed (same class)
- [ ] Expired member DM blocked
- [ ] `find_existing_dm()` returns NULL initially
- [ ] `find_existing_dm()` returns ID for existing DM
- [ ] Old conversations remain accessible (backward compat)
- [ ] Performance index validated

---

## Unresolved Questions

- None at this phase (schema is isolated, no dependencies)

---

## Next Phase

**Phase 2** (UI Components): DM creation UI, conversation list, participant selection with class validation
