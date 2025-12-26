# Phase 1 Skills Documentation

Quick reference for the two new agent skills added in Phase 1 to support development automation and Supabase integration patterns.

## 1. Supabase Skill

**Location**: `.claude/skills/supabase/`

**Purpose**: Provides patterns and utilities for Supabase integration in the Next.js frontend.

### Coverage
- **References** (6 guides in `references/`)
  - RLS Policies (Row-Level Security)
  - Auth Integration (login, signup, sessions)
  - Real-time subscriptions
  - Storage bucket management
  - TypeScript type generation
  - Server vs Client client patterns

- **Scripts** (in `scripts/`)
  - `generate_types.py` - Auto-generate TypeScript types from Supabase schema
  - `generate_rls_policy.py` - Generate RLS policy SQL templates

### Quick Commands

```bash
# Generate TypeScript types from database schema
python .claude/skills/supabase/scripts/generate_types.py \
  --project-ref <ref> \
  --output src/lib/types/database.types.ts

# Generate RLS policy template
python .claude/skills/supabase/scripts/generate_rls_policy.py \
  --table users \
  --role authenticated \
  --operation select
```

### When to Use
- Implementing authentication flows
- Creating/modifying Row-Level Security policies
- Setting up file uploads to Storage
- Implementing real-time features
- Generating database types for TypeScript

---

## 2. Frontend Development Skill

**Location**: `.claude/skills/frontend-development/`

**Purpose**: Modern React/TypeScript development guidelines with automation scripts for component and feature scaffolding.

### Coverage
- Component patterns (React.FC, lazy loading, Suspense)
- Data fetching with useSuspenseQuery (TanStack Query)
- File organization (features/ + components/)
- Styling with MUI v7 (sx prop)
- Routing with TanStack Router
- Performance optimization
- TypeScript best practices
- Common patterns (forms, auth, DataGrid)

### Automation Scripts (New in Phase 1)

#### Generate Component
```bash
# Basic component
python .claude/skills/frontend-development/scripts/generate_component.py \
  --name Button \
  --path src/components/ui

# Component with styles
python .claude/skills/frontend-development/scripts/generate_component.py \
  --name UserCard \
  --path src/components \
  --with-styles
```

**Generates**:
- TypeScript component with proper typing
- Optional CSS module for styles >100 lines
- Named export + default export pattern

#### Generate Feature
```bash
# Full feature scaffold
python .claude/skills/frontend-development/scripts/generate_feature.py \
  --name authentication \
  --path src/features

# Without API service layer
python .claude/skills/frontend-development/scripts/generate_feature.py \
  --name utils \
  --path src/features \
  --no-api
```

**Generates**:
```
src/features/{feature-name}/
├── api/          # API service layer
├── components/   # Feature components
├── hooks/        # Custom hooks
├── helpers/      # Utility functions
├── types/        # TypeScript types
└── index.ts      # Public exports
```

### When to Use
- Creating new React components or pages
- Building new features with proper structure
- Scaffolding repetitive component/feature boilerplate
- Implementing data fetching patterns
- Setting up routing or styling

---

## Integration Notes

Both skills are designed to accelerate Phase 1 and beyond:

1. **Supabase skill** handles backend/database concerns
2. **Frontend skill** handles UI/UX and component development

The generation scripts reduce boilerplate and ensure consistency across the codebase.

### Environment Variables

Supabase skill requires in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Server-side only
```

---

**Last Updated**: Phase 1 initialization
