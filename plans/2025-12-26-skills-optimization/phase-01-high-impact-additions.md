# Phase 1: High-Impact Additions

**Date:** 2025-12-26
**Priority:** High
**Status:** Done (2025-12-26)
**Estimated Files:** ~20 new files

---

## Context

- [Main Plan](plan.md)
- Current gap: No Supabase skill despite being core to EduMVP
- frontend-development lacks automation scripts (only skill without scripts)

## Overview

Create standalone `supabase` skill covering RLS, Auth, Realtime, Storage. Add missing automation scripts to `frontend-development` skill.

---

## Part A: Create Supabase Skill

### Key Insights

- EduMVP uses Supabase for: Auth, PostgreSQL, Storage, (future: Realtime)
- Existing `databases` skill covers generic PostgreSQL but not Supabase-specific patterns
- RLS policies critical for teacher/student access control
- Type generation from schema already exists in project

### Requirements

1. SKILL.md (<100 lines) with clear trigger conditions
2. References for: RLS, Auth, Realtime, Storage, Types, Middleware
3. Scripts for: type generation, RLS policy generator
4. Tests for all scripts

### Architecture

```
.claude/skills/supabase/
├── SKILL.md                           # Main skill file (<100 lines)
├── references/
│   ├── supabase-rls-policies.md       # Row-Level Security patterns
│   ├── supabase-auth-integration.md   # Auth with Next.js middleware
│   ├── supabase-realtime.md           # Subscriptions, presence, broadcast
│   ├── supabase-storage.md            # Bucket policies, file uploads
│   ├── supabase-type-generation.md    # Database types, Zod schemas
│   └── supabase-server-client.md      # Server vs Client patterns
├── scripts/
│   ├── generate_types.py              # Generate TypeScript types from schema
│   ├── generate_rls_policy.py         # Scaffold RLS policies
│   ├── test_generate_types.py
│   └── test_generate_rls_policy.py
└── .env.example
```

### Related Code Files

- `src/lib/supabase/client.ts` - Client-side Supabase
- `src/lib/supabase/server.ts` - Server-side Supabase
- `src/lib/supabase/middleware.ts` - Middleware helper
- `src/lib/types/database.types.ts` - Generated types
- `middleware.ts` - Auth middleware

### Implementation Steps

1. Initialize skill using `skill-creator/scripts/init_skill.py`
2. Write SKILL.md with Supabase-specific triggers
3. Create 6 reference files covering all Supabase features
4. Implement `generate_types.py` script
5. Implement `generate_rls_policy.py` script
6. Write tests for both scripts
7. Create `.env.example` with required variables
8. Test skill activation with sample prompts

### SKILL.md Content Outline

```yaml
---
name: supabase
description: >
  Supabase integration patterns for Next.js applications. Covers Row-Level Security
  (RLS) policies, authentication with middleware, real-time subscriptions, storage
  bucket management, and TypeScript type generation. Use when implementing auth flows,
  protecting data with RLS, uploading files, or setting up real-time features.
version: 1.0.0
---
```

**Sections:**
- When to use (triggers)
- Quick reference (common patterns)
- Reference links for deep dives
- Script usage examples

---

## Part B: Frontend Development Scripts

### Key Insights

- Only skill among 5 without automation scripts
- Component creation is repetitive (React.FC + TypeScript + Props)
- Feature scaffolding follows consistent pattern (components/, hooks/, utils/)

### Requirements

1. Component generator script with TypeScript template
2. Feature scaffolder for directory structure
3. Tests for both scripts
4. Cross-platform (Python, not bash)

### Architecture

```
.claude/skills/frontend-development/
├── scripts/
│   ├── generate_component.py          # Creates React.FC component
│   ├── generate_feature.py            # Creates feature directory structure
│   ├── test_generate_component.py
│   └── test_generate_feature.py
└── .env.example (if needed)
```

### Implementation Steps

1. Create `scripts/` directory in frontend-development
2. Implement `generate_component.py`:
   - Input: component name, path, props interface
   - Output: ComponentName.tsx with React.FC template
3. Implement `generate_feature.py`:
   - Input: feature name
   - Output: feature directory with components/, hooks/, utils/, index.ts
4. Write comprehensive tests
5. Update SKILL.md to reference new scripts

### Script Specifications

**generate_component.py:**
```python
# Usage: python generate_component.py --name Button --path src/components/ui
# Output: src/components/ui/Button.tsx
```

**generate_feature.py:**
```python
# Usage: python generate_feature.py --name authentication --path src/features
# Output:
#   src/features/authentication/
#   ├── components/
#   ├── hooks/
#   ├── utils/
#   └── index.ts
```

---

## Todo List

- [ ] Initialize supabase skill directory
- [ ] Write supabase/SKILL.md
- [ ] Create supabase-rls-policies.md
- [ ] Create supabase-auth-integration.md
- [ ] Create supabase-realtime.md
- [ ] Create supabase-storage.md
- [ ] Create supabase-type-generation.md
- [ ] Create supabase-server-client.md
- [ ] Implement generate_types.py + tests
- [ ] Implement generate_rls_policy.py + tests
- [ ] Create frontend-development/scripts/ directory
- [ ] Implement generate_component.py + tests
- [ ] Implement generate_feature.py + tests
- [ ] Update frontend-development/SKILL.md
- [ ] Test all scripts manually
- [ ] Verify skill activation with sample prompts

## Success Criteria

1. `supabase` skill activates on auth/RLS/storage prompts
2. All 4 scripts execute without errors
3. All tests pass
4. Generated code follows project conventions
5. Scripts work on Windows + Mac + Linux

## Security Considerations

- Scripts must not expose API keys in generated code
- RLS generator must create deny-by-default policies
- Type generation uses local CLI, not remote API

## Next Steps

After Phase 1 completion:
- Proceed to [Phase 2: Reduce Redundancy](phase-02-reduce-redundancy.md)
- Test supabase skill with EduMVP codebase
