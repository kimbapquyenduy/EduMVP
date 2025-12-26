# Phase 3: UI Optimization

**Date:** 2025-12-26
**Priority:** Low
**Status:** ✅ COMPLETE (2025-12-26 21:45 UTC)
**Files Modified:** 2 (SKILL.md, canvas-design-system.md)
**Files Created:** 2 (README.md, mui-v7-patterns.md)
**Files Deleted:** 56 TTF font files

---

## Context

- [Main Plan](plan.md)
- [Phase 1: High-Impact Additions](phase-01-high-impact-additions.md)
- [Phase 2: Reduce Redundancy](phase-02-reduce-redundancy.md)
- ui-styling is 5.8MB due to 82 embedded font files
- EduMVP uses MUI v7 but skill only covers shadcn/ui

## Overview

Reduce ui-styling size from 5.8MB to ~300KB by externalizing fonts. Add MUI v7 patterns alongside existing shadcn/ui content.

---

## Part A: Font Optimization

### Key Insights

- 82 TTF font files in assets/fonts/ (~5.5MB)
- Fonts rarely loaded into context, just copied to projects
- Can be replaced with CDN links or Google Fonts references

### Current Structure

```
.claude/skills/ui-styling/
├── assets/
│   └── fonts/
│       ├── Inter-*.ttf (12 files)
│       ├── Roboto-*.ttf (12 files)
│       ├── Poppins-*.ttf (12 files)
│       ├── ... (46 more font files)
│       └── OFL.txt (licenses)
└── ... (5.8MB total)
```

### Target Structure

```
.claude/skills/ui-styling/
├── assets/
│   └── fonts/
│       └── README.md  # Links to Google Fonts / CDN
└── ... (~300KB total)
```

### fonts/README.md Content

```markdown
# Font Resources

## Recommended Fonts (Google Fonts)

### Sans-Serif
- [Inter](https://fonts.google.com/specimen/Inter) - Modern, clean
- [Roboto](https://fonts.google.com/specimen/Roboto) - Material Design
- [Poppins](https://fonts.google.com/specimen/Poppins) - Geometric, friendly

### Serif
- [Merriweather](https://fonts.google.com/specimen/Merriweather) - Readable
- [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) - Elegant

### Monospace
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) - Code
- [Fira Code](https://fonts.google.com/specimen/Fira+Code) - Ligatures

## Usage

### Next.js (next/font)
\`\`\`tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
\`\`\`

### Tailwind CSS
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
\`\`\`

### Self-Hosted
Download from [Google Fonts](https://fonts.google.com/) or [Fontsource](https://fontsource.org/)
```

---

## Part B: Add MUI v7 Patterns

### Key Insights

- EduMVP uses MUI v7 components alongside Tailwind
- Current ui-styling only covers shadcn/ui + Tailwind + Canvas
- MUI v7 has new Grid system, different theming approach

### New Reference File

```
.claude/skills/ui-styling/references/mui-v7-patterns.md
```

### Content Outline (~400 lines)

```markdown
# MUI v7 Patterns

## Theme Configuration
- createTheme with TypeScript
- Custom palette, typography, breakpoints
- Dark mode toggle

## Grid System (v7)
- New Grid2 component
- Container queries
- Responsive props

## Common Components
- TextField with validation
- DataGrid patterns
- Dialog with forms
- Snackbar notifications

## MUI + Tailwind Integration
- @tailwindcss/forms compatibility
- Overriding MUI styles with Tailwind
- When to use each

## Performance
- Tree-shaking imports
- Emotion vs styled-components
- SSR considerations

## Accessibility
- Built-in ARIA attributes
- Focus management
- Keyboard navigation
```

### Update SKILL.md

Add MUI v7 section:
```markdown
## MUI v7 Integration
For Material UI v7 patterns, see `references/mui-v7-patterns.md`
- Theme configuration
- Grid system (Grid2)
- Component patterns
- MUI + Tailwind integration
```

---

## Implementation Steps

### Part A: Font Optimization

1. Create `assets/fonts/README.md` with CDN links
2. Verify no scripts reference local font files
3. Delete all .ttf files (keep OFL.txt for license reference)
4. Update any references in SKILL.md
5. Test skill still works

### Part B: MUI v7 Patterns

1. Create `references/mui-v7-patterns.md`
2. Document theme configuration
3. Document Grid2 component
4. Add MUI + Tailwind integration section
5. Update SKILL.md with MUI section
6. Test skill activation with MUI prompts

---

## Todo List

- [x] Create assets/fonts/README.md with CDN links
- [x] Verify no scripts reference font files
- [x] Delete 56 TTF font files
- [x] Keep OFL.txt license file
- [x] Create references/mui-v7-patterns.md (291 lines)
- [x] Add theme configuration patterns
- [x] Add Grid2 patterns
- [x] Add MUI + Tailwind integration
- [x] Update SKILL.md (v1.1.0 with MUI section)
- [x] Test skill with MUI-related prompts
- [x] Verify size reduction (5.48MB → 0.33MB, 94% reduction)

## Success Criteria

1. ui-styling reduced from 5.8MB to ~300KB
2. Font README provides clear alternatives
3. MUI v7 patterns documented
4. MUI + Tailwind integration explained
5. Skill activates on both shadcn and MUI prompts

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Font deletion breaks workflows | Low | README provides alternatives |
| MUI patterns conflict with shadcn | Low | Document when to use each |
| Size calculation incorrect | Low | Verify with du -sh after |

## Security Considerations

- External font CDNs may track users
- Document self-hosting option for privacy-conscious projects
- No API keys or secrets in font configuration

## Next Steps

After Phase 3 completion:
- All optimizations complete
- Run full skill test suite
- Update skills catalog
- Document changes in changelog
