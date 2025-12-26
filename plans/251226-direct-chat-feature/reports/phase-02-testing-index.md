# Phase 2: UI Components - Testing Index

**Created**: 2025-12-26
**Plan**: [plans/251226-direct-chat-feature/plan.md](../plan.md)
**Phase**: [Phase 2 - UI Components](../phase-02-ui-components.md)

---

## Test Documentation Files

### 1. Test Scenarios Document
**File**: `phase-02-test-scenarios.md` (~150 lines)

**Purpose**: Comprehensive test case specifications with setup/expected behavior

**Contents**:
- **Section 1**: Hook unit tests (14 test cases)
  - useUserClasses: 5 scenarios (mixed roles, empty, errors, etc.)
  - useClassMembers: 6 scenarios (exclusions, loading, errors, etc.)

- **Section 2**: Component rendering tests (12 test cases)
  - StartDMDialog: 11 rendering scenarios (loading, empty, filtering, errors)
  - MessagingInterface: 1 integration check (button in header)

- **Section 3**: Integration test scenarios (5 manual paths)
  - Scenario A: Happy path create DM
  - Scenario B: Duplicate detection
  - Scenario C: Cross-role messaging (Student→Teacher)
  - Scenario D: Error handling (RPC, insert, participant failures)
  - Scenario E: Class context switching

- **Section 4**: Test data specifications
  - Mock classes, users, memberships with IDs

- **Section 5**: Unresolved questions (5 Q's)
  - RPC existence, role format, inactive memberships, cleanup, RLS validation

**Use Cases**:
- Baseline for test suite implementation
- Manual testing checklist
- QA reference for coverage verification

---

### 2. Code Analysis Document
**File**: `phase-02-analysis.md` (~200 lines)

**Purpose**: Technical review of Phase 2 implementation with risk assessment

**Contents**:
- **Section 1**: Implementation summary (3 new files, 3 modified)
- **Section 2**: Code quality per component
  - useUserClasses: 3 issues identified (deps, no filter, no error handling)
  - useClassMembers: 3 issues (deps, teacher query assumptions, nested complexity)
  - StartDMDialog: 5 issues (deps, RPC validation, role format, race condition, nav)
  - MessagingInterface: 2 issues (URL param handling, auto-select missing)
  - Page components: No issues

- **Section 3**: Data flow validation (8-step happy path)
  - Missing link: URL param auto-selection not implemented

- **Section 4**: Security check
  - Client-side: ✅ Good
  - Server-side: ⚠️ Pending Phase 1 RLS verification

- **Section 5**: Risk matrix (6 identified risks)
  - CRITICAL: RPC missing, race condition impacts, RLS bypass
  - HIGH: Dependency refetch, stale selection
  - LOW: Role format mismatch

- **Section 6**: Testing priority (3 tiers)
  - MUST TEST FIRST: 4 critical areas
  - SHOULD TEST: 4 areas
  - NICE TO TEST: 3 areas

- **Section 7**: Recommendations for production (6 items)
- **Section 8**: Files for code review

**Use Cases**:
- Code review guidance
- Testing prioritization
- Risk-based testing strategy
- Technical blockers identification

---

### 3. Test Summary Report
**File**: `phase-02-test-summary.md` (~180 lines)

**Purpose**: Executive summary and test execution planning

**Contents**:
- **Executive Summary**: Status and key risks
- **Implementation Status**: ✅ Completed vs ⚠️ Attention required
- **Test Scenarios Documentation**: Coverage overview (14+12+5 test cases)
- **Code Analysis**: 6 issues categorized by priority
- **Risk Assessment**: Probability vs impact matrix
- **Test Execution Plan**: 4 phases (Pre-Testing, Unit, Integration, Performance)
- **Success Criteria**: 12-point checklist
- **Dependencies on Phase 1**: 4 items to verify
- **Recommendations**: 4 tiers (CRITICAL → LOW)
- **Test Files Created**: List of 3 documents
- **Unresolved Questions**: 7 critical blockers

**Use Cases**:
- Project management reference
- Testing roadmap
- Stakeholder communication
- Blocker tracking

---

## Test Coverage Matrix

### Hooks (useUserClasses + useClassMembers)

| Test Category | Cases | Status | Notes |
|---------------|-------|--------|-------|
| Load operations | 6 | Specified | Classes + members fetching |
| Filtering | 4 | Specified | Active status, exclusions |
| Error handling | 3 | Specified | Network errors, missing data |
| State transitions | 2 | Specified | Loading states |
| Edge cases | 3 | Specified | Empty lists, null values |
| **TOTAL** | **18** | **100%** | Complete specifications |

### Component (StartDMDialog)

| Test Category | Cases | Status | Notes |
|---------------|-------|--------|-------|
| Rendering | 5 | Specified | Button, dialog, states |
| User interaction | 4 | Specified | Selection, search, preview |
| Loading states | 2 | Specified | Classes, members |
| Empty states | 3 | Specified | No classes, no members |
| Error handling | 2 | Specified | Display, recovery |
| Submit logic | 2 | Specified | Disabled states, creation |
| State management | 1 | Specified | Reset on close |
| **TOTAL** | **19** | **100%** | Complete specifications |

### Integration Paths

| Scenario | Type | Status | Notes |
|----------|------|--------|-------|
| Happy path | Manual | Specified | Create new DM |
| Duplicate detection | Manual | Specified | Redirect to existing |
| Cross-role | Manual | Specified | Student→Teacher |
| Error handling | Manual | Specified | RPC, insert, participant |
| Context switching | Manual | Specified | Class change |
| **TOTAL** | **5** | **100%** | Complete specifications |

---

## Critical Test Cases Priority

### Must Test First (Blocking)
1. **find_existing_dm RPC function**
   - Does it exist? (Phase 1 dependency)
   - Handles all edge cases?
   - Returns expected format?
   - Test: phase-02-test-scenarios.md Section 3, Scenario B

2. **Conversation auto-selection from URL**
   - Does MessagingInterface read `?conversation=` param?
   - Currently MISSING - needs implementation
   - Test: phase-02-test-scenarios.md Section 3, Scenario A step 8

3. **Dependency array stability**
   - Do hooks refetch unnecessarily?
   - Risk of infinite loops?
   - Test: phase-02-test-scenarios.md Section 1, TC1.5, TC2.5

4. **RLS enforcement**
   - Can user create cross-class DM? (should be blocked)
   - Can user see members of other classes? (should be blocked)
   - Test: phase-02-test-scenarios.md Section 3, Scenario B

### Should Test (High Value)
5. All 14 hook unit test cases
6. All 12 component rendering cases
7. Complete error path testing (5 sub-scenarios)
8. Navigation role-awareness (TEACHER vs STUDENT paths)

### Nice to Test (Optimization)
9. Performance with large datasets (1000+ students)
10. Race conditions (rapid button clicks)
11. Accessibility (keyboard navigation in command)

---

## Files Under Test

### Source Files (6 total)

**New Files (3)**:
1. `src/hooks/useUserClasses.ts` (56 lines)
   - Test: 5 cases in TC 1.1-1.5
   - Issues: Dependency array, no error handling, no active filter

2. `src/hooks/useClassMembers.ts` (80 lines)
   - Test: 6 cases in TC 2.1-2.6
   - Issues: Dependency array, teacher query assumptions, null handling

3. `src/components/shared/StartDMDialog.tsx` (268 lines)
   - Test: 12 cases in TC 3.1-3.12
   - Issues: Dependencies, RPC validation, race condition, nav linking

**Modified Files (3)**:
4. `src/components/shared/MessagingInterface.tsx`
   - Test: 2 cases in TC 4.1-4.2
   - Issues: URL param handling missing

5. `src/app/teacher/messages/page.tsx`
   - Test: Props passing (implicit in TC 4)
   - Issues: None detected

6. `src/app/student/messages/page.tsx`
   - Test: Props passing (implicit in TC 4)
   - Issues: None detected

---

## Test Execution Workflow

### Pre-Testing (Must Complete Before Tests)
1. Verify Phase 1 RPC function exists: `find_existing_dm`
2. Confirm RLS policies allow intended queries
3. Fix dependency arrays in both hooks
4. Add URL parameter handling to MessagingInterface
5. Add error states to hooks

### Running Unit Tests (When Test Framework Added)
```bash
# After setting up Jest/Vitest
npm test -- --testPathPattern="useUserClasses|useClassMembers|StartDMDialog"
npm test -- --coverage --testPathPattern="phase-02"
```

### Running Manual Integration Tests
1. Create test user accounts (teacher + students)
2. Enroll students in test classes
3. Execute Scenario A-E from phase-02-test-scenarios.md
4. Document results for each scenario
5. Verify RLS blocks invalid attempts
6. Test cross-browser (Chrome, Firefox, Safari)

### Performance Testing
1. Load classes: 100 items → measure time
2. Load members: 500 items → measure time
3. Monitor memory: Check for leaks during dialog open/close cycles
4. Measure dialog first-render time (target: <300ms)

---

## Success Metrics

### Code Quality
- ✅ Zero console errors or warnings during normal flow
- ✅ All dependencies properly declared
- ✅ Error states handled for all async operations
- ✅ No infinite loops or excessive refetches

### Functionality
- ✅ All 31 test cases pass
- ✅ 5 integration scenarios complete without errors
- ✅ Duplicate DM detection working
- ✅ Navigation role-aware (TEACHER/STUDENT)

### Security
- ✅ RLS prevents cross-class DM creation
- ✅ User cannot message non-classmates
- ✅ Conversations scoped to class

### Performance
- ✅ Dialog opens in <300ms
- ✅ Member search responds in <100ms
- ✅ No memory leaks on repeated use

### UX
- ✅ All loading states have spinners
- ✅ All empty states have helpful messages
- ✅ Error messages clear and actionable
- ✅ Dialog state resets on close

---

## Questions for Phase 1 Reviewer

Before testing can complete, answers needed:

1. **RPC Function**: Is `find_existing_dm(p_class_id, p_user1_id, p_user2_id)` implemented?
2. **User Role Format**: Is `profiles.role` stored as "TEACHER"/"STUDENT" or "teacher"/"student"?
3. **Inactive Members**: Should inactive memberships (status != 'ACTIVE') appear in picker?
4. **Teacher Filtering**: Should inactive teacher classes appear in class selector?
5. **RLS Validation**: Confirmed that teacher profile joins work in member queries?
6. **RLS Enforcement**: Confirmed that membership scoping prevents cross-class visibility?
7. **Orphaned Records**: If conversation created but participant insert fails, cleanup strategy?

---

## Next Steps

1. ✅ Test scenarios documented (phase-02-test-scenarios.md)
2. ✅ Code analysis completed (phase-02-analysis.md)
3. ✅ Test plan created (phase-02-test-summary.md)
4. ⏭️ **NEXT**: Get answers to Phase 1 questions
5. ⏭️ **NEXT**: Fix identified code issues
6. ⏭️ **NEXT**: Setup test framework (Jest/Vitest)
7. ⏭️ **NEXT**: Execute unit test suite
8. ⏭️ **NEXT**: Execute manual integration tests
9. ⏭️ **NEXT**: Performance validation
10. ⏭️ **NEXT**: Security penetration testing

---

## Reference Links

- **Plan Document**: [plan.md](../plan.md)
- **Phase 2 Spec**: [phase-02-ui-components.md](../phase-02-ui-components.md)
- **Phase 1 Schema**: [phase-01-database-schema.md](../phase-01-database-schema.md)
- **Phase 1 Tests**: [phase-01-test-scenarios.md](./phase-01-test-scenarios.md)
