# EdTech Landing Design - Quick Reference
**For:** Community-Driven Learning Platform (Teachers + Students)
**Last Updated:** 2025-12-26

---

## DESIGN QUICK WINS (Highest ROI First)

### 1. Segmented Hero (Do First)
```
┌─────────────────────────────────────────────────────┐
│  Logo                    [Teachers | Students] Login │
├─────────────────────────────────────────────────────┤
│                                                      │
│   "The Platform Where Teachers Teach &         [Video]
│    Students Learn Together"                    [auto]
│                                                [loop]
│   [Start Teaching] [Browse Courses]            [muted]
│                                                      │
│   ✓ 10K+ educators | 500K+ students | 95% done    │
│                                                      │
└─────────────────────────────────────────────────────┘
```
**Why:** Reduces friction 40%+ (users see their path immediately)

### 2. Color Palette (Set Immediately)
```
Navy Blue:    #1e3a5f  (Primary, trust)
Teal:         #14b8a6  (CTAs, progress, interactive)
Gold:         #fbbf24  (Community, highlights, warmth)
Green:        #10b981  (Success, completion)
Gray:         #f3f4f6  (Backgrounds, neutrals)
Text:         #1f2937  (Dark gray, primary text)
```
Apply to ALL designs first.

### 3. Trust Signals (Below Hero)
Priority order:
1. **Video testimonial** (30s) with real teacher/student
2. **3-5 text testimonials** with photos + names
3. **Stats bar:** "500K+ students | 10K+ teachers | 95% completion"
4. *(Skip unless earned:)* Partner logos, awards, certifications

### 4. How-It-Works (3 Steps, Animated)
```
Teachers:  Create → Invite → Teach
Students:  Browse → Enroll → Learn

Each step: Icon + 1-2 sentence outcome
Scroll-triggered fade-in animation
```

### 5. Feature Cards (4-6 Total)
**Format:** Icon + Benefit Title + 1-2 sentence outcome
```
❌ "Advanced video hosting infrastructure"
✓ "Engage students with interactive video lessons"

❌ "Real-time analytics dashboard"
✓ "Track student progress at a glance"
```

### 6. Testimonials Section (Double Format)
**Top:** 2-3 video testimonials (15-30 seconds each)
**Bottom:** 3-5 text testimonials (2-3 sentences, with photo + name)

### 7. Community Activity (Social Proof)
Live activity feed showing:
- "3 teachers uploaded courses in last 24 hours"
- Recent successful student outcomes
- "Teacher of week" spotlight

### 8. CTAs (Multiple, Aligned to Stage)
```
Hero:           "Start Teaching" | "Browse Courses"
Post-Features:  "See How It Works"
Pre-Signup:     "Get Started Free"
Post-Testimonials: "Join 10K+ Educators"
```

---

## MICRO-INTERACTIONS CHECKLIST

Quick wins for "alive" feeling:

- [ ] **Hero headline:** Fade in + slide down (300ms) on page load
- [ ] **Stats counter:** Numbers count up when scrolled into view (2s animation)
- [ ] **Feature cards:** Fade in + slide up (staggered 100ms each) on scroll
- [ ] **Card hover:** Lift effect + shadow on mouse over (100ms)
- [ ] **CTA buttons:** Color shift + slight scale on hover (200ms)
- [ ] **Testimonial:** Fade in on scroll, avatar slides from left
- [ ] **Form focus:** Border color shift to teal, slight lift
- [ ] **Activity feed:** New items slide in from top (300ms)
- [ ] **Mobile:** Disable parallax, reduce animation count 50%

**Tools:**
- React → Framer Motion
- Vanilla JS → AOS or GSAP
- CSS → Tailwind transitions + keyframes

---

## COLOR USAGE GUIDE

| Element | Color | Reason |
|---------|-------|--------|
| Logo, nav text | Navy (#1e3a5f) | Trust, authority |
| CTA buttons | Teal (#14b8a6) | Action, modern, contrasts |
| Success badges | Green (#10b981) | Completion, growth |
| Community highlights | Gold (#fbbf24) | Warmth, human connection |
| Backgrounds | White + Light Gray (#f3f4f6) | Clean, accessible |
| Body text | Dark gray (#1f2937) | Readable, not black |
| Secondary text | Medium gray (#6b7280) | Hierarchy |

**Accessibility:** Test contrast with WAVE (min 4.5:1 for text)

---

## MOBILE OPTIMIZATION (53% of Traffic)

- [ ] Hero CTA buttons: 44x44px minimum touch target
- [ ] Stack testimonials vertically (1 column)
- [ ] Disable parallax scrolling (battery drain)
- [ ] Reduce animation count 50%
- [ ] Text: 16px minimum (no pinch-to-zoom needed)
- [ ] Video backgrounds: Replace with static image
- [ ] Full-width buttons for primary CTAs
- [ ] Touch-friendly navigation (larger tap targets)

---

## TRUST SIGNALS: PRIORITY HIERARCHY

**Tier 1 (Must Have):**
- Video testimonial from real user (>70% conversion lift)
- Text testimonials with photos + specific results (>60% lift)
- Real student/teacher count with metrics

**Tier 2 (Strong):**
- How-it-works explanation (reduces friction)
- Community activity proof (shows platform is alive)
- Instructor credibility (background, experience)

**Tier 3 (Optional):**
- Partner logos (only if legitimate partnerships exist)
- Press mentions (only if published)
- Awards/certifications (only if earned)

**Anti-Trust (Avoid):**
- Stock photos of "happy graduates"
- Generic testimonials ("Great platform!")
- Inflated metrics
- Outdated design

---

## TESTIMONIALS: FORMAT TEMPLATE

### Video Format
```
Duration: 15-30 seconds
Content:
- Real person, clear audio/video
- Name, role, photo on screen
- Specific result or quote
- Example: "I've taught 200+ students on this platform"
```

### Text Format
```
┌────────────────────────────────┐
│ [Avatar]                       │
│ "Specific quote about result." │
│ - Name, Role/Context           │
└────────────────────────────────┘

Example: "In 3 months, I had 500 students enrolled."
         - Sarah Chen, High School Teacher
```

---

## SECTION ORDER (Proven Sequence)

1. **Hero** (audience segmentation + value prop)
2. **Trust bar** (stats + testimonial video)
3. **How-it-works** (3 animated steps)
4. **Feature cards** (4-6 outcomes)
5. **Testimonials** (video + text)
6. **Community** (activity, engagement proof)
7. **Pricing** (simple tiers, if applicable)
8. **FAQ** (teacher | student sections)
9. **Footer CTA** + Links

---

## COPY TEMPLATES (Quick Use)

### Hero Headline
- "The Platform Where Teachers Teach & Students Learn Together"
- "Create Courses, Build Community, Earn Impact"
- "Teach Your Way. Learn Your Pace."

### Feature Cards
- ❌ "Real-time video streaming" → ✓ "Engage students with live video lessons"
- ❌ "Discussion forums" → ✓ "Foster peer-to-peer learning"
- ❌ "Progress tracking" → ✓ "Know exactly where each student stands"

### CTA Copy
- "Start Teaching Free"
- "Browse 10K+ Courses"
- "See How It Works"
- "Join the Community"

### Stats/Metrics
- "500K+ students learning"
- "10K+ educators teaching"
- "95% course completion rate"
- "50K+ courses created"

---

## PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| Lighthouse Performance | >90 |
| Lighthouse Accessibility | >95 |
| Page Load Time (3G) | <3s |
| LCP (Largest Contentful Paint) | <2.5s |
| CLS (Cumulative Layout Shift) | <0.1 |
| Animation FPS | 60fps (or 120fps on high-refresh) |

**Test with:** Lighthouse, PageSpeed Insights, WebPageTest

---

## ACCESSIBILITY CHECKLIST

- [ ] Color contrast: 4.5:1 minimum (WCAG AA)
- [ ] Video captions: All testimonial videos
- [ ] Alt text: All images and icons
- [ ] Keyboard nav: Full site navigable without mouse
- [ ] Focus indicators: Visible on all interactive elements
- [ ] Reduced motion: Respect `prefers-reduced-motion` media query
- [ ] Font size: 16px minimum body text
- [ ] Form labels: Explicit, not placeholder-only
- [ ] Link text: Descriptive ("Learn more about X" not "Click here")

---

## TOOLS STACK (Recommended)

| Category | Tool | Why |
|----------|------|-----|
| Animation | Framer Motion (React) | Performant, easy API |
| Video | Mux or Cloudinary | CDN, optimization |
| Icons | Heroicons or Feather | Consistent, accessible |
| Colors | Tailwind config | Design tokens, consistency |
| Testing | Lighthouse + WAVE | Performance + accessibility |
| Forms | React Hook Form | Lightweight, accessible |
| Testimonials | Sanity or Airtable | Easy updates, no redeploy |

---

## COMMON PITFALLS (Avoid)

| Pitfall | Why Bad | Fix |
|---------|---------|-----|
| Auto-playing audio | Breaks accessibility | Muted video only |
| 10+ features listed | Cognitive overload | Top 4 benefits |
| Outdated design | Signals neglect | Annual refresh |
| Generic testimonials | Not credible | Specific results + metrics |
| Slow animations (>500ms) | Feels sluggish | Keep <300ms |
| Stock photos only | Fake, insincere | Mix real + illustrated |
| No mobile optimization | Lose 50% audience | Mobile-first design |
| Dark mode only | Excludes users | Light mode default |

---

## CONVERSION RATE BENCHMARKS

| Funnel Stage | Target | Notes |
|--------------|--------|-------|
| Hero CTA | 2-5% CTR | See teacher/student path |
| Signup | 5-10% | After "How it works" |
| Form completion | 60-75% | Teachers creating account |
| Trial → Paid | 10-15% | After free trial |
| Community engagement | 40%+ | First-time activity |

---

## NEXT STEPS (Implementation Order)

**Week 1:** Design hero + set color palette + add trust signals
**Week 2:** Build how-it-works + feature cards + testimonials section
**Week 3:** Add micro-interactions + polish hover effects + community feed
**Week 4:** Testing (accessibility, mobile, performance) + A/B test CTAs
