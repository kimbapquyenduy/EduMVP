# Codebase Standards & Library Utilization Review

**Date:** 2025-12-26
**Project:** EduMVP
**Status:** Analysis Complete

---

## Executive Summary

| Category | Status | Severity |
|----------|--------|----------|
| Library Utilization | ⚠️ Poor | High |
| Type Safety | ⚠️ Fair | Medium |
| Form Handling | ⚠️ Inconsistent | Medium |
| Performance | ⚠️ Concerning | High |
| Code Quality | ✅ Good | Low |

---

## 1. UNUSED LIBRARIES (Critical)

Libraries installed but **never imported or used**:

| Library | Version | Status | Impact |
|---------|---------|--------|--------|
| `sonner` | ^2.0.7 | ❌ Never used | Custom useToast used instead |
| `zod` | ^4.2.1 | ❌ Never used | No schema validation implemented |
| `@hookform/resolvers` | ^5.2.2 | ❌ Never used | Form validation not integrated |

### Recommendation
Either:
- **Option A:** Remove unused dependencies to reduce bundle size
- **Option B:** Implement proper form validation with Zod + react-hook-form

---

## 2. UNDERUTILIZED LIBRARIES

### react-hook-form
- **Location:** `src/components/ui/form.tsx` has full setup
- **Problem:** NO forms actually use it
- **Current Pattern:** Manual `useState` for each field (verbose, no validation)

**Example of current approach** ([login/page.tsx:15-18](src/app/(auth)/login/page.tsx#L15-L18)):
```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
```

**Should be:**
```tsx
const form = useForm<LoginSchema>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' }
})
```

### Supabase Real-time
- Real-time subscriptions available but never used
- Could enable live updates for messages, class changes

### date-fns
- Only used in 1 file: `MessagingInterface.tsx`
- Consider using for all date formatting (created_at displays)

### TipTap
- Used correctly in `RichTextEditor.tsx`
- ✅ Properly utilized

---

## 3. CRITICAL BUG: Toast Configuration

**File:** [use-toast.ts:12](src/hooks/use-toast.ts#L12)
```typescript
const TOAST_REMOVE_DELAY = 1000000  // ~17 MINUTES!
```

**Should be:**
```typescript
const TOAST_REMOVE_DELAY = 5000  // 5 seconds
```

---

## 4. PERFORMANCE ISSUE: N+1 Query

**File:** [BrowseClasses.tsx:72-93](src/components/student/BrowseClasses.tsx#L72-L93)

**Problem:** For each class, makes 2 separate database queries:
```typescript
allClasses.map(async (classItem) => {
  const { count: coursesCount } = await supabase.from('courses').select(...)
  const { count: membersCount } = await supabase.from('memberships').select(...)
})
```

**Impact:** Loading 10 classes = 20+ database queries

**Solution:** Use Supabase aggregates or single query with joins:
```typescript
const { data } = await supabase
  .from('classes')
  .select(`
    *,
    profiles:teacher_id (full_name),
    courses(count),
    memberships(count)
  `)
```

---

## 5. TYPE SAFETY ISSUES

Files using `: any` type (violates TypeScript best practices):

| File | Line | Issue |
|------|------|-------|
| [CourseContentViewer.tsx:12](src/components/shared/CourseContentViewer.tsx#L12) | `school?: any` | Should define School type |
| [ImageUpload.tsx:86](src/components/teacher/ImageUpload.tsx#L86) | `error: any` | Use `unknown` + type guard |
| [MembersTab.tsx:50](src/components/teacher/MembersTab.tsx#L50) | `item: any` | Define proper Member type |
| [PDFUpload.tsx:90](src/components/teacher/PDFUpload.tsx#L90) | `error: any` | Use `unknown` + type guard |
| [VideoUpload.tsx:91](src/components/teacher/VideoUpload.tsx#L91) | `error: any` | Use `unknown` + type guard |

---

## 6. FORM HANDLING INCONSISTENCY

Current state across codebase:

| Pattern | Usage | Files |
|---------|-------|-------|
| Manual useState | 100% | All forms |
| react-hook-form | 0% | None |
| Zod validation | 0% | None |
| HTML5 validation only | 100% | All forms |

**Impact:**
- No client-side validation before submit
- No type-safe form data
- Verbose, repetitive code
- Error handling is manual and inconsistent

---

## 7. MISSING STANDARDS COMPLIANCE

Per development-rules.md:

| Rule | Compliance |
|------|------------|
| File naming (kebab-case) | ✅ Compliant |
| File size < 200 lines | ⚠️ Some files exceed |
| Try-catch error handling | ⚠️ Inconsistent |
| Security standards | ⚠️ No input sanitization |

---

## Prioritized Recommendations

### High Priority (Should Fix)
1. **Fix toast delay bug** - Change 1000000 to 5000 in use-toast.ts
2. **Fix N+1 query** - Refactor BrowseClasses.tsx to use aggregate query
3. **Remove or use Zod/Sonner** - Clean up unused dependencies

### Medium Priority (Should Improve)
4. **Implement react-hook-form** - Use existing form.tsx components
5. **Fix `: any` types** - Add proper type definitions
6. **Add input validation** - Use Zod schemas for all forms

### Low Priority (Nice to Have)
7. **Add Supabase real-time** - For messaging and live updates
8. **Standardize date formatting** - Use date-fns consistently
9. **Add error boundaries** - For better error handling

---

## Bundle Size Impact

Removing unused libraries would save:
- `sonner`: ~15KB
- `zod` (if not used): ~50KB
- `@hookform/resolvers`: ~5KB

**Total potential savings:** ~70KB (gzipped: ~20KB)

---

## Unresolved Questions

1. Is Sonner intended to replace custom useToast, or vice versa?
2. Should forms be migrated to react-hook-form + Zod pattern?
3. Are real-time features planned for messaging?
