# Class-Restricted Direct Messaging Patterns

**Date**: 2025-12-26
**Context**: EduMVP - Educational platform with classes & memberships

---

## 1. Database Schema Enhancement

Current schema has conversations/messages/participants. **Missing**: class linkage.

**Recommended Pattern:**

Add `class_id` column to conversations table to enforce class-scoped messaging:

```sql
ALTER TABLE conversations ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
CREATE INDEX idx_conversations_class_id ON conversations(class_id);
```

**Why**: Simplifies RLS policies, improves query efficiency, makes UI member-picking trivial (just filter by class).

---

## 2. RLS Policy - Class-Membership Check

**Core Pattern**: Only allow DM initiation between class members.

```sql
-- Users can create conversations only with classmates
CREATE POLICY "Users can start conversations with classmates"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure conversation has a class
  class_id IS NOT NULL AND
  -- Verify user is member of that class
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.class_id = conversations.class_id
    AND m.user_id = auth.uid()
    AND m.status = 'ACTIVE'
  )
);

-- Users can only view conversations they're part of
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);
```

**Key Enforcement**: Check happens at `conversations` INSERT, not participant level.

---

## 3. Conversation Participant Validation

Prevent adding non-class-members as participants:

```sql
-- Only add classmates as participants
CREATE POLICY "Only classmates can be added"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  -- Current user must be in conversation
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  ) AND
  -- Target user must be in same class
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN memberships m ON m.class_id = c.class_id
    WHERE c.id = conversation_participants.conversation_id
    AND m.user_id = conversation_participants.user_id
    AND m.status = 'ACTIVE'
  )
);
```

---

## 4. Query Pattern - Class Members for DM Picker

**Efficient query to populate member picker**:

```sql
-- Get classmates (exclude current user, only ACTIVE members)
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.email
FROM profiles p
INNER JOIN memberships m ON m.user_id = p.id
WHERE m.class_id = $1
  AND m.status = 'ACTIVE'
  AND p.id != auth.uid()  -- Exclude self
ORDER BY p.full_name ASC;
```

**Runtime**: O(1) with `idx_memberships_class_id` + `idx_memberships_user_id`.

---

## 5. UI Component Pattern - Member Picker

**React pattern for "Start DM" flow**:

```typescript
// Hook to fetch classmates
const useClassMembers = (classId: string) => {
  const { data, isLoading } = useSuspenseQuery({
    queryKey: ['classMembers', classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .innerJoin('memberships', 'memberships.user_id', 'profiles.id')
        .eq('memberships.class_id', classId)
        .eq('memberships.status', 'ACTIVE')
        .neq('id', user.id)
        .order('full_name');
      return data;
    },
  });
  return { members: data, isLoading };
};

// Component - Start DM Modal
export const StartDMDialog = ({ classId, onClose }) => {
  const { members, isLoading } = useClassMembers(classId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleStartDM = async () => {
    // 1. Create conversation (RLS ensures classmate check)
    const { data: conv } = await supabase
      .from('conversations')
      .insert([{ class_id: classId }])
      .select()
      .single();

    // 2. Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: auth.uid() },
      { conversation_id: conv.id, user_id: selectedUserId },
    ]);

    // Navigate to conversation
    router.push(`/messages/${conv.id}`);
  };

  return (
    <Autocomplete
      options={members}
      getOptionLabel={(m) => m.full_name}
      value={members.find((m) => m.id === selectedUserId) || null}
      onChange={(_, option) => setSelectedUserId(option?.id || null)}
      renderInput={(params) => <TextField {...params} label="Select classmate" />}
    />
  );
};
```

---

## 6. Conversation Existence Check

Prevent duplicate DMs with same person:

```typescript
// Before creating conversation, check if one exists
const existingConversation = await supabase
  .from('conversations')
  .select('id')
  .eq('class_id', classId)
  .in('id',
    // Subquery: conversations both users are in
    supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', targetUserId)
  )
  .limit(1);

if (existingConversation.data?.length) {
  router.push(`/messages/${existingConversation.data[0].id}`);
  return;
}
```

---

## 7. Performance Summary

| Component | Approach | Time |
|-----------|----------|------|
| Fetch class members | Index on `memberships.class_id` | O(log n) |
| Check class membership in RLS | Indexed subquery | <1ms per insert |
| Participant validation | Indexed joins | <1ms per insert |
| Duplicate conversation check | Index on `class_id` + IN subquery | <2ms |

**Indexes needed**:
- `idx_memberships_class_id` (exists)
- `idx_conversations_class_id` (add)
- `idx_conversation_participants_user_id` (exists)

---

## 8. Implementation Checklist

- [ ] Add `class_id` to `conversations` table + index
- [ ] Update conversation RLS policies (class-membership check)
- [ ] Add participant insertion RLS policy
- [ ] Create `useClassMembers` hook
- [ ] Build `StartDMDialog` component with Autocomplete
- [ ] Implement duplicate conversation guard
- [ ] Test: Verify RLS blocks cross-class DMs

---

## Unresolved Questions

1. **Delete cascade behavior**: If teacher deletes class, should conversations be deleted or archived?
2. **Read status**: Track per-participant message reads or just presence indicators?
3. **Typing indicators**: Real-time presence via Supabase Realtime or polling fallback?
