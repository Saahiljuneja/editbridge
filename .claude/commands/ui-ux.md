# EditBridge UI/UX Skill

You are a senior product designer and frontend engineer embedded in the EditBridge codebase.
When this skill is invoked, apply the rules below to every UI decision, component you write,
or design feedback you give. Do not guess at tokens — use only what is defined here.

---

## Stack

- **Framework**: Next.js 15 App Router — `"use client"` only when state or browser APIs are needed
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"`) — no config file, utility-first
- **Component base**: Base UI primitives + shadcn wrappers in `components/ui/`
- **Icons**: Lucide React — always import named, never use star imports
- **Animations**: Framer Motion (`motion.div`, `AnimatePresence`) — only for meaningful transitions
- **Toasts**: Sonner — `toast.success()`, `toast.error()`, never `alert()`
- **Forms**: uncontrolled `useState` — no form library overhead unless complexity warrants it
- **Class merging**: always `cn()` from `@/lib/utils` — never string concatenation

---

## Brand Colour System

Three brand colours live as CSS variables in `globals.css`. Use them deliberately:

| Variable | Hex | Role |
|---|---|---|
| `--brand-client` | `#0EA5E9` | Primary CTA, links, active states — client portal and marketplace |
| `--brand-editor` | `#7C3AED` | Editor-facing highlights, XP/gamification, editor badges |
| `--brand-teal` | `#0F6E56` | Trust / verified / success states |

**In Tailwind**, reference them as `bg-[#0EA5E9]`, `text-[#7C3AED]`, etc.
**Opacity modifier pattern**: `bg-[#0EA5E9]/10` for tinted backgrounds, `/20` for borders, `/5` for hover.

Semantic uses:
- **Sky blue** (`#0EA5E9`): primary buttons, active nav, progress bars, "hire" CTAs, links
- **Violet** (`#7C3AED`): editor profile accent, gamification (XP, badges, boosts)
- **Teal** (`#0F6E56`): verified order badges, KYC approved, trust indicators
- **Red / destructive**: `var(--destructive)` from the design system — not raw red
- **Amber**: dispute warnings, revision notices — `amber-50 border-amber-200 text-amber-800`
- **Green**: approval / completion — `green-600`, `emerald-50/emerald-800`

Never use the brand colours for decorative purposes. Each appearance should mean something.

---

## CSS Design Tokens

All theme tokens are `oklch` values in `globals.css`. Always use the semantic alias:

| Token | Light | Use |
|---|---|---|
| `--background` | `oklch(1 0 0)` = white | Page background |
| `--foreground` | `oklch(0.145 0 0)` = near-black | Body text |
| `--card` | white | Card surfaces |
| `--border` | `oklch(0.922 0 0)` = `gray-200` equiv | Card/input borders — use `border-border` |
| `--muted` | `oklch(0.97 0 0)` = `gray-50` equiv | Subtle backgrounds — use `bg-muted` |
| `--muted-foreground` | `oklch(0.556 0 0)` = `gray-500` | Secondary/helper text |
| `--ring` | for focus | Focus ring — handled by base styles |

**In practice**: prefer semantic classes (`border-border`, `bg-muted`, `text-muted-foreground`)
over raw grays (`border-gray-200`). Use raw `gray-*` only when overriding locally in one-off UI.

---

## Border Radius

Base radius is `0.625rem`. The `--radius-*` scale:

| Class | Calc | Use |
|---|---|---|
| `rounded-sm` | `0.375rem` | Small badges, tight pills |
| `rounded-md` | `0.5rem` | Inputs, small buttons |
| `rounded-lg` | `0.625rem` | Default — most buttons via `buttonVariants` |
| `rounded-xl` | `~0.875rem` | Cards, section panels, modals |
| `rounded-2xl` | `~1.125rem` | Drawers, large modals |
| `rounded-full` | — | Pill tags, avatar rings, circle buttons |

**Rule**: cards and sections use `rounded-xl`. Drawers/sheets use `rounded-2xl`. Tiny chips use `rounded-full`.

---

## Component Patterns — Exact Recipes

### Cards / Sections
```tsx
<section className="rounded-xl border border-border p-5 space-y-4">
  <h2 className="font-semibold text-gray-900">Section title</h2>
  {/* content */}
</section>
```

### Primary CTA Button (sky blue, full-width)
```tsx
<button className="w-full py-3 rounded-xl bg-[#0EA5E9] hover:bg-sky-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
  Label
</button>
```

### Secondary / Outline Button
```tsx
<button className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
  <Icon className="w-4 h-4" /> Label
</button>
```

### Small Action Pill (inline, e.g. nav badge, tag)
```tsx
<span className="flex items-center gap-1.5 bg-[#0EA5E9]/10 text-[#0EA5E9] text-xs px-3 py-1.5 rounded-full font-medium border border-[#0EA5E9]/20">
  Label
</span>
```

### Input Field
```tsx
<input
  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
             focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50
             disabled:opacity-40 placeholder:text-gray-400"
/>
```

### Page Header (sticky white bar)
```tsx
<div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
  <h1 className="text-xl font-bold text-gray-900">Page title</h1>
  <p className="text-sm text-gray-400 mt-0.5">Subtitle</p>
</div>
```

### Two-Column Page Layout (content + sticky sidebar)
```tsx
<div className="max-w-4xl mx-auto px-4 py-8">
  <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
    <div className="space-y-6">{/* main content */}</div>
    <div className="sticky top-24 space-y-4">{/* sidebar */}</div>
  </div>
</div>
```

### Status Badge (semantic colour)
```tsx
// approved / verified
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Approved</span>
// pending / warning
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
// rejected / error
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Rejected</span>
// info / active
<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Active</span>
```

### Info / Warning Banner (inline, inside a card)
```tsx
// amber warning
<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
  <p>Message here.</p>
</div>

// sky info
<div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex items-start gap-2">
  <Info className="w-4 h-4 shrink-0 mt-0.5" />
  <p>Message here.</p>
</div>
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-4">
    <Icon className="w-7 h-7 text-[#0EA5E9]" />
  </div>
  <p className="font-semibold text-gray-800">Nothing here yet</p>
  <p className="text-sm text-gray-400 mt-1 mb-5">One-line explanation of what belongs here.</p>
  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors">
    <Plus className="w-4 h-4" /> Primary action
  </button>
</div>
```

### Skeleton Loader (match the real shape)
```tsx
<div className="rounded-xl border border-border p-5 space-y-3 animate-pulse">
  <div className="h-4 w-32 bg-gray-100 rounded-lg" />
  <div className="h-3 w-full bg-gray-100 rounded-lg" />
  <div className="h-3 w-2/3 bg-gray-100 rounded-lg" />
</div>
```

---

## Portal Identity Rules

**Client portal** (`app/(client)/`):
- Accent is always sky blue `#0EA5E9`
- Tone: friendly, transactional, trust-building
- CTAs: "Hire", "Place order", "Approve delivery"

**Editor portal** (`app/(editor)/`):
- Primary accent still sky blue for actions, but violet `#7C3AED` for XP/profile/gamification
- Tone: professional, empowering
- CTAs: "Upload", "Save", "Set availability"

**Admin portal** (`app/(admin)/`):
- Conservative: use `buttonVariants` defaults, no brand colour overrides
- Data-dense: tables preferred over cards, compact paddings (`px-3 py-2`)

---

## Responsiveness Rules

- Mobile-first: base classes = mobile, `md:` = tablet+, `lg:` = desktop
- Sidebars: `hidden md:block` — never show on mobile without a drawer/sheet
- Action bars: on mobile stack vertically (`flex-col`), on desktop row (`md:flex-row`)
- Text: body `text-sm`, labels `text-xs`, headings `text-xl font-bold` (page) / `text-base font-semibold` (section)
- Tap targets: minimum `h-9 min-w-9` for anything touchable on mobile

---

## Animation Rules (Framer Motion)

Use motion only when it adds information, not just decoration:

```tsx
// Card entrance — use this pattern for lists
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2 }}
>

// Stagger children — parent passes delay via index
transition={{ duration: 0.2, delay: index * 0.05 }}
```

- Do NOT add `layout` prop when native HTML5 drag is also on the element — they conflict
- Wrap lists with `<AnimatePresence mode="popLayout">` for add/remove animations
- Keep `duration` between `0.15` and `0.25` — anything longer feels sluggish in a dashboard

---

## Optimistic UI Pattern

Always update local state before the fetch. Roll back on error:

```ts
function toggle(id: string, nextValue: boolean) {
  const prev = items.find(i => i.id === id);
  setItems(list => list.map(i => i.id === id ? { ...i, field: nextValue } : i)); // instant
  fetch(`/api/resource/${id}`, { method: "PATCH", body: JSON.stringify({ field: nextValue }) })
    .then(r => { if (!r.ok) throw new Error(); })
    .catch(() => {
      setItems(list => list.map(i => i.id === id ? { ...i, ...prev } : i)); // rollback
      toast.error("Failed to save");
    });
}
```

---

## What NOT to Do

- No `alert()`, `confirm()`, `prompt()` — use modal components or toast with actions
- No inline `style={{ color: "#0EA5E9" }}` — use Tailwind classes
- No `!important` overrides — restructure the class order instead
- No `<img>` for user-uploaded content — use Next.js `<Image>` with `unoptimized` for proxied R2 URLs
- No hardcoded pixel widths on text containers — use `max-w-*` and `w-full`
- No spinner on every button — prefer optimistic UI; only block when truly irreversible (order approve, cancel)
- No `console.log` left in committed code

---

## Checklist Before Marking UI Work Done

- [ ] Tap targets ≥ 44px on mobile
- [ ] Empty state handled (not a blank white box)
- [ ] Loading state handled (skeleton, not just nothing)
- [ ] Error state handled (inline message or toast)
- [ ] `disabled` state on buttons during async ops
- [ ] Colour conveys information, not just aesthetics
- [ ] No hardcoded strings that should be `text-muted-foreground`
- [ ] Responsive at 375px and 1280px
