# Phase 2: UI Components - Test Scenarios

**Status**: Active
**Components**: `useUserClasses`, `useClassMembers`, `StartDMDialog`, `MessagingInterface`

---

## 1. Hook Unit Tests (Mock Supabase)

### Test: `useUserClasses`

#### TC1.1: Load classes for teacher
- **Setup**: Mock user as teacher with 2 classes owned
- **Expected**:
  - `classes` array includes both owned classes with `role: 'teacher'`
  - `loading` transitions `true → false`
  - Classes fetched via `eq('teacher_id', userId)`

#### TC1.2: Load classes for student
- **Setup**: Mock user enrolled in 3 classes
- **Expected**:
  - `classes` includes student classes with `role: 'student'`
  - Filters by `status: 'ACTIVE'` only
  - Correctly unpacks nested `classes(id, name)` from membership

#### TC1.3: Mixed role - teacher + student
- **Setup**: User is teacher of 1 class AND student in 2 classes
- **Expected**: Array contains 3 total items, 1 as teacher, 2 as student

#### TC1.4: No classes
- **Setup**: New user with no classes
- **Expected**: Empty array, `loading: false`

#### TC1.5: Supabase error handling
- **Setup**: Mock Supabase query to fail
- **Expected**: Handle gracefully (empty array), no crash, error logged

### Test: `useClassMembers`

#### TC2.1: Get all members (teacher + students)
- **Setup**: Class with 1 teacher + 5 students
- **Expected**:
  - Array of 6 members (1 teacher + 5 students)
  - Teacher has `role: 'teacher'`
  - Students have `role: 'student'`
  - All include `id, full_name, email`

#### TC2.2: Exclude current user from list
- **Setup**: Current user is teacher in their own class with 3 students
- **Expected**:
  - Only 3 students in list (teacher excluded)
  - Empty check works when teacher is alone

#### TC2.3: Exclude current user (student role)
- **Setup**: Current user is student in class with 1 teacher + 4 other students
- **Expected**:
  - List has 5 members (1 teacher + 4 classmates)
  - Own ID filtered out

#### TC2.4: Reset when classId becomes null
- **Setup**: Hook initially has `classId`, then set to null
- **Expected**: `members` array clears to `[]`

#### TC2.5: Loading state transitions
- **Setup**: Trigger fetch
- **Expected**: `loading: false → true → false`

#### TC2.6: Null/missing profile fields
- **Setup**: Student record missing `full_name` (null)
- **Expected**: Gracefully handle, use email as fallback display

---

## 2. Component Rendering Tests

### Test: `StartDMDialog`

#### TC3.1: Dialog button renders
- **Setup**: Render with valid props
- **Expected**:
  - "New Message" button visible with icon
  - Dialog trigger works (opens/closes)

#### TC3.2: Classes loading state
- **Setup**: `useUserClasses` in loading state
- **Expected**:
  - Loading spinner shown
  - "Loading classes..." text visible
  - Select input disabled

#### TC3.3: Classes empty state
- **Setup**: User has 0 classes
- **Expected**:
  - "You are not enrolled in any classes yet." message
  - Select input hidden
  - Member picker hidden

#### TC3.4: Class selector renders correctly
- **Setup**: User has 2 teacher classes + 1 student class
- **Expected**:
  - Select shows all 3 classes
  - Each shows name + role badge
  - Selections update state correctly

#### TC3.5: Member picker conditionally shows
- **Setup**: Class selected
- **Expected**: Member picker appears below class selector

#### TC3.6: Members loading state
- **Setup**: Class selected, members loading
- **Expected**:
  - Loading spinner shown
  - "Loading members..." text visible

#### TC3.7: Members empty state
- **Setup**: Class selected but only user in class
- **Expected**:
  - "No other members in this class." message
  - Icon shown
  - Submit button disabled

#### TC3.8: Command input filters members
- **Setup**: Render with 5 members, type in search
- **Expected**:
  - Search filters by name/email
  - CommandEmpty shown if no matches
  - Selection highlights item with `bg-primary/10`

#### TC3.9: Selected member preview
- **Setup**: Select a member
- **Expected**:
  - Preview box shows "Message to: [name]"
  - Updates when selection changes

#### TC3.10: Error message displays
- **Setup**: Trigger error state
- **Expected**: Red error box shown with message

#### TC3.11: Submit button disabled states
- **Setup**: Various missing selections
- **Expected**:
  - Disabled if no class selected
  - Disabled if no member selected
  - Disabled if `creating: true`
  - Enabled only when both selected + not creating

#### TC3.12: Dialog closes on cancel
- **Setup**: Open dialog, press Escape
- **Expected**:
  - Dialog closes
  - All state resets (selections, errors)

### Test: `MessagingInterface` (Header Integration)

#### TC4.1: Start DM button in header
- **Setup**: Render component with valid props
- **Expected**: StartDMDialog rendered in CardHeader next to title

#### TC4.2: Props passed correctly
- **Setup**: Render with `userId="123"`, `userRole="TEACHER"`
- **Expected**: StartDMDialog receives both props

---

## 3. Integration Test Scenarios (Manual)

### Scenario A: Happy Path - Create New DM

1. Teacher opens Messages page
2. Clicks "New Message" button
3. Selects their class from dropdown
4. Types member name in search (search filters)
5. Clicks member from list
6. Verifies preview shows correct name + role
7. Clicks "Start Conversation"
8. Navigates to `/teacher/messages?conversation=[conv_id]`
9. Conversation appears in list with other participant
10. Can immediately send message

**Expected Outcomes**:
- Conversation created with class_id
- Both participants added to conversation_participants
- Navigation works (role-aware: TEACHER/STUDENT)
- New conversation selectable in list

### Scenario B: Duplicate Conversation Detection

1. Student starts DM with classmate (creates conversation A)
2. Student initiates second DM with same classmate
3. Clicks "New Message" again
4. Selects same class + member
5. RPC function detects existing conversation
6. Redirects to conversation A instead of creating new
7. No duplicate created

**Expected Outcomes**:
- `find_existing_dm` RPC returns existing `conversation.id`
- No new conversation entry created
- Router navigates to existing conversation
- Prevents UI from showing "Creating..." beyond redirect

### Scenario C: Cross-Role DM (Student→Teacher)

1. Student opens Messages
2. Clicks "New Message"
3. Selects class they're enrolled in
4. Searches for + selects their teacher
5. Creates conversation with teacher
6. Teacher sees new conversation in their messages list
7. Conversation marked with class name/context

**Expected Outcomes**:
- Teacher included in member list correctly
- Conversation scoped to class (prevents cross-class messaging)
- Both users can see conversation

### Scenario D: Error Handling

#### Sub D1: RPC Error (find_existing_dm fails)
- Error message shows: "Failed to check existing conversations"
- Button stays active, user can retry

#### Sub D2: Conversation Insert Fails
- Error message shows: "Failed to create conversation"
- Button stays active, user can retry

#### Sub D3: Participants Insert Fails
- Error message shows: "Failed to add participants"
- Orphaned conversation cleanup? (TBD: Phase 3)

### Scenario E: Class Context Switching

1. User is teacher in Class A + student in Class B
2. Opens "New Message"
3. Selects Class A (teacher role)
4. Sees members of Class A
5. Changes selection to Class B
6. Member list resets and loads Class B members
7. Previous selection cleared

**Expected Outcomes**:
- Class change triggers new member fetch
- `selectedUserId` resets on class change
- Member list reflects correct class
- No lingering stale data

---

## 4. Test Data Requirements

### Mock Classes
```
class_teacher1 (id: "c1")
  teacher_id: user_teacher1
  name: "React 101"

class_student1 (id: "c2")
  teacher_id: user_teacher2
  name: "Advanced TypeScript"

class_student2 (id: "c3")
  teacher_id: user_teacher2
  name: "Design Systems"
```

### Mock Users
```
user_teacher1 (role: TEACHER)
  full_name: "John Teacher"
  email: teacher@example.com

user_student1 (role: STUDENT)
  full_name: "Alice Student"
  email: student1@example.com

user_student2 (role: STUDENT)
  full_name: "Bob Student"
  email: student2@example.com
```

### Mock Memberships
```
membership: user_student1 → class_student1 (status: ACTIVE)
membership: user_student1 → class_student2 (status: ACTIVE)
membership: user_student2 → class_student1 (status: ACTIVE)
```

---

## 5. Unresolved Questions

- **Q1**: Should orphaned conversations (created but no participants added) be cleaned up automatically, or is this handled in Phase 3?
- **Q2**: Should "New Message" button be disabled when user has 0 classes?
- **Q3**: Should member list paginate/virtualize for classes with 1000+ students?
- **Q4**: Does `find_existing_dm` RPC exist and handle all edge cases?
- **Q5**: Should inactive memberships be included in member list, or only ACTIVE?
