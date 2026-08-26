---
name: Artistbor Dashboard-design
description: Design system skill for Artistbor Dashboard. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# Artistbor Dashboard Design System

You are building UI for **Artistbor Dashboard**. Light-themed, neutral palette, sans-serif typography (Geist), compact density on a 4px grid.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Single typeface** — Geist carries all text. Hierarchy comes from size, weight, and color — never font mixing.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **neutral palette** — the color temperature runs neutral, matching the sans-serif typography.
- **Subtle motion** — transitions smooth state changes. Keep durations under 300ms, use ease-out curves.
- **Lucide icons** — use Lucide for all iconography. Do not mix icon libraries.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#f7f7fb` | Page/app background |
| Text Primary | `--text-primary` | `#111827` | Headings, body text |
| Text Muted | `--text-muted` | `#94a3b8` | Captions, placeholders |
| Border | `--border` | `#475569` | Dividers, card borders |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#059669` | Confirmations, positive trends |
| Warning | `#fbbf24` | Caution states, pending items |
| Danger | `#f43f5e` | Errors, destructive actions |

### Extended Palette

- **foreground:** `#e5edf8` — Light surface or highlight color
- **artistbor-modal-field-focus-border:** `#f59e0b`
- `#64748b`
- `#f97316`
- **artistbor-modal-close-hover-border:** `#fda4af`
- **artistbor-modal-danger-hover-border:** `#fb7185` — Destructive actions, error states
- **artistbor-modal-danger-border:** `#e11d48` — Destructive actions, error states
- **artistbor-modal-warning-border:** `#d97706` — Warning banners, caution states

### CSS Variable Tokens

```css
--background: #f7f7fb;
--foreground: #111827;
--color-background: var(--background);
--color-foreground: var(--foreground);
--artistbor-sidebar-item-muted: rgb(100 116 139);
--artistbor-sidebar-item-selected-border: rgb(245 158 11);
--artistbor-modal-surface-border: rgb(226 232 240);
--artistbor-modal-inset-border: rgba(15,23,42,0.035);
--artistbor-modal-muted: rgb(100 116 139);
--artistbor-modal-subtle-border: rgb(226 232 240);
--artistbor-modal-close-border: rgb(251 113 133);
--artistbor-modal-close-hover-border: rgb(225 29 72);
--artistbor-modal-field-border: rgb(226 232 240);
--artistbor-modal-field-focus-border: rgba(245,158,11,0.72);
--artistbor-modal-neutral-border: rgb(203 213 225);
--artistbor-modal-neutral-hover-border: rgb(148 163 184);
--artistbor-modal-success-border: rgba(5,150,105,0.35);
--artistbor-modal-success-hover-border: rgba(5,150,105,0.58);
--artistbor-modal-danger-border: rgba(225,29,72,0.34);
--artistbor-modal-danger-hover-border: rgba(225,29,72,0.58);
```

## Typography

### Font Stack

- **Geist** — Heading 1, Heading 2, Heading 3, Body, Caption

### Font Sources

```css
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-SemiBold.ttf") format("truetype");
  font-weight: 600;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | Geist | 48px / 3rem | 700 |
| Heading 2 | Geist | 32px / 2rem | 600 |
| Heading 3 | Geist | 24px / 1.5rem | 600 |
| Body | Geist | 16px / 1rem | 400 |
| Caption | Geist | 12px / 0.75rem | 400 |

### Typography Rules

- All text uses **Geist** — never add another font family
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `6px, 8px, 10px, 12px, 14px, 16px, 18px, calc(18px - 0.375rem), 22px, 24px, 999px`
Default: `16px`

### Container

Max-width: `100%`, centered with auto margins.

### Breakpoints

| Name | Value |
|------|-------|
| breakpoint-1024px | 1024px |

Mobile-first: design for small screens, layer on responsive overrides.

## Component Patterns

### Card

```css
.card {
  background: #f7f7fb;
  border: 1px solid #475569;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--artistbor-modal-surface-shadow);
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #cccccc;
  color: #111827;
  border-radius: 16px;
  padding: 8px 16px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #475569;
  color: #111827;
  border-radius: 16px;
  padding: 8px 16px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #f7f7fb;
  border: 1px solid #475569;
  border-radius: 16px;
  padding: 8px 12px;
  color: #111827;
  font-size: 14px;
}
.input:focus { border-color: var(--accent); outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #f7f7fb;
  color: #94a3b8;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #f7f7fb;
  border: 1px solid #475569;
  border-radius: 999px;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 12px 30px rgba(15,23,42,0.12);
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #475569;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #475569;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #475569;
}
.nav-link {
  color: #94a3b8;
  padding: 8px 12px;
  border-radius: 16px;
  transition: color 150ms;
}
.nav-link:hover { color: #111827; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**AdminDrawer** (`src/components/admin/admin-drawer.tsx`)
- Styles: `truncate`

**AdminFilterForm** (`src/components/admin/admin-filter-form.tsx`)
- Styles: `gap-3`

**AdminLayout** (`src/components/admin/admin-layout.tsx`)
- Props: `status`, `page`, `limit`
- Styles: `bg-slate-50`, `px-[var(--artistbor-main-padding)]`, `text-slate-950`

**ApplicationActionsDropdown** (`src/components/admin/applications/application-actions-dropdown.tsx`)
- Props: `key`, `icon`, `label`, `onClick`
- Styles: `bg-white`, `rounded-[10px]`, `text-emerald-500`

**ApplicationContactDrawer** (`src/components/admin/applications/application-contact-drawer.tsx`)
- Styles: `bg-slate-50`, `rounded-lg`, `mt-1`, `truncate`

**ApplicationDetailDrawer** (`src/components/admin/applications/application-detail-drawer.tsx`)
- Variants: `approve`, `reject`
- Styles: `bg-slate-50`, `rounded-xl`, `gap-2.5`, `truncate`

**ApplicationInfoTab** (`src/components/admin/applications/application-info-tab.tsx`)
- Variants: `default`, `two`, `1`, `danger`, `three`
- Styles: `bg-slate-50`, `rounded-lg`, `space-y-4`, `text-sm`

**ApplicationStatusBadge** (`src/components/admin/applications/application-status-badge.tsx`)
- Styles: `rounded-full`, `px-2`, `text-[10px]`

**ApplicationStatusTabs** (`src/components/admin/applications/application-status-tabs.tsx`)
- Styles: `bg-[#f97316]`, `border-b`, `gap-7`, `text-sm`

**ApplicationsFilterBar** (`src/components/admin/applications/applications-filter-bar.tsx`)
- Variants: `all`, `today`, `week`, `month`, `custom`
- Props: `value`, `label`, `locale)`
- Styles: `gap-3`, `text-[#94a3b8]`

## Animation & Motion

This project uses **subtle motion**. Transitions smooth state changes without calling attention.

### CSS Animations

- `animate-spin`

### Motion Tokens

- **Duration scale:** `500ms`
- **Easing functions:** `cubic-bezier(0.32,0.72,0,1)`
- **Animated properties:** `border-color`, `background-color`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (500ms) for micro-interactions, long (500ms) for page transitions
- **Easing:** Use `cubic-bezier(0.32,0.72,0,1)` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Dark Mode

This project supports **light and dark mode** via CSS variables.

### Token Mapping

| Variable | Light | Dark |
|----------|-------|------|
| `--background` | `#f7f7fb` | `#0f172a` |
| `--foreground` | `#111827` | `#e5edf8` |

### Implementation

- Toggle via `.dark` class on `<html>` or `[data-theme="dark"]`
- Always use CSS variables for colors — never hardcode hex values
- Test both modes for contrast and readability

## Depth & Elevation

### Shadow Tokens

- Subtle: `inset 0 0 0 1px rgba(245,158,11,0.16)`
- Subtle: `inset 0 0 0 1px rgba(251,191,36,0.13)`
- Subtle: `inset 0 0 0 1px rgba(251,191,36,0.18)`
- Subtle: `inset 0 1px 0 rgba(255,255,255,0.04)`
- Raised (cards, buttons): `var(--artistbor-modal-surface-shadow)`
- Raised (cards, buttons): `var(--artistbor-modal-field-shadow)`

### Z-Index Scale

`0, 1`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only Geist are allowed
- **No arbitrary border-radius** — use the scale: 6px, 8px, 10px, 12px, 14px, 16px, 18px, 22px, 24px, 999px
- **No opacity for disabled states** — use muted colors instead
- **No pill shapes** — this design doesn't use rounded-full / 9999px radius

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — Geist only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Brand typeface:** Geist

## Quick Reference

```
Background:     #f7f7fb
Surface:        (not extracted)
Text:           #111827 / #94a3b8
Accent:         (not extracted)
Border:         #475569
Font:           Geist
Spacing:        4px grid
Radius:         16px
Frameworks:     Tailwind CSS, React, Next.js
Icons:          Lucide
Components:     32 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for Artistbor Dashboard
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "Artistbor Dashboard" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# Artistbor Dashboard DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: Tailwind CSS 4 + React 19.2.4 + Next.js 16.2.4
> Colors: 20 · Fonts: 1 · Components: 32
> Icon library: Lucide · State: not detected
> Primary theme: light · Dark mode toggle: yes · Motion: subtle

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a neutral, approachable feel. The light background emphasizes content clarity. Typography uses **Geist** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. Motion is subtle — smooth transitions (150-300ms) ease state changes without drawing attention.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#f7f7fb` | background | Page background, darkest surface |
| foreground | `#111827` | text-primary | Headings and body text |
| artistbor-busy-slot-neutral-border | `#94a3b8` | text-muted | Captions, placeholders, secondary info |
| border | `#475569` | border | Dividers, card borders, outlines |
| artistbor-modal-close-border | `#f43f5e` | danger | Error states, destructive actions |
| artistbor-modal-success-border | `#059669` | success | Success states, positive indicators |
| artistbor-modal-field-focus-border | `#fbbf24` | warning | Warning states, caution indicators |
| foreground | `#e5edf8` | info | Informational highlights |
| artistbor-modal-field-focus-border | `#f59e0b` | unknown | Palette color |
| unknown | `#64748b` | unknown | Palette color |
| unknown | `#f97316` | unknown | Palette color |
| artistbor-modal-close-hover-border | `#fda4af` | unknown | Palette color |
| artistbor-modal-danger-hover-border | `#fb7185` | unknown | Palette color |
| artistbor-modal-danger-border | `#e11d48` | unknown | Palette color |
| artistbor-modal-warning-border | `#d97706` | unknown | Palette color |
| artistbor-modal-success-border | `#10b981` | unknown | Palette color |
| artistbor-modal-success-hover-border | `#34d399` | unknown | Palette color |
| unknown | `#7d92b2` | unknown | Palette color |
| unknown | `#cbd5e1` | unknown | Palette color |
| unknown | `#334155` | unknown | Palette color |

### Dark Mode Token Mapping

| Variable | Light | Dark |
|---|---|---|
| `--background` | `#f7f7fb` | `#0f172a` |
| `--foreground` | `#111827` | `#e5edf8` |

### CSS Variable Tokens

```css
--background: #f7f7fb;
--foreground: #111827;
--color-background: var(--background);
--color-foreground: var(--foreground);
--artistbor-sidebar-item-muted: rgb(100 116 139);
--artistbor-sidebar-item-selected-border: rgb(245 158 11);
--artistbor-modal-surface-border: rgb(226 232 240);
--artistbor-modal-inset-border: rgba(15,23,42,0.035);
--artistbor-modal-muted: rgb(100 116 139);
--artistbor-modal-subtle-border: rgb(226 232 240);
--artistbor-modal-close-border: rgb(251 113 133);
--artistbor-modal-close-hover-border: rgb(225 29 72);
--artistbor-modal-field-border: rgb(226 232 240);
--artistbor-modal-field-focus-border: rgba(245,158,11,0.72);
--artistbor-modal-neutral-border: rgb(203 213 225);
--artistbor-modal-neutral-hover-border: rgb(148 163 184);
--artistbor-modal-success-border: rgba(5,150,105,0.35);
--artistbor-modal-success-hover-border: rgba(5,150,105,0.58);
--artistbor-modal-danger-border: rgba(225,29,72,0.34);
--artistbor-modal-danger-hover-border: rgba(225,29,72,0.58);
```


---

## 3. Typography Rules

**Font Stack:**
- **Geist** — Heading 1, Heading 2, Heading 3, Body, Caption

**Font Sources:**

```css
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-SemiBold.ttf") format("truetype");
  font-weight: 600;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Geist";
  src: url("fonts/Geist-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Geist | 48px / 3rem | 700 |
| Heading 2 | Geist | 32px / 2rem | 600 |
| Heading 3 | Geist | 24px / 1.5rem | 600 |
| Body | Geist | 16px / 1rem | 400 |
| Caption | Geist | 12px / 0.75rem | 400 |

**Typographic Rules:**
- Use **Geist** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (17)

**ApplicationActionsDropdown** — `src/components/admin/applications/application-actions-dropdown.tsx`
- Props: `key`, `icon`, `label`, `onClick`
- Key Styles: `rounded-[10px]`, `border-[#e6ebf2]`, `bg-white`, `cursor-pointer`

```tsx
<Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight" disabled={!items.length}>
      <button
        type="button"
        className="grid size-8 cursor-pointer place-items-center rounded-[10px] border border-[#e6ebf2] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
        aria-label={labels.actionsLabel}
        onClick={(event
```

**ApplicationContactDrawer** — `src/components/admin/applications/application-contact-drawer.tsx`
- Key Styles: `rounded-lg`, `border-rose-200`, `bg-slate-50`, `mt-1`, `text-lg`, `font-bold`, `cursor-pointer`

```tsx
<Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 420px
```

**ApplicationDetailDrawer** — `src/components/admin/applications/application-detail-drawer.tsx`
- Variants: `approve`, `reject`
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-slate-50`, `gap-2.5`, `text-lg`, `font-bold`, `cursor-pointer`

```tsx
<Drawer
      open={open}
      onClose={onClose}
      size="min(100vw, 720px
```

**ApplicationInfoTab** — `src/components/admin/applications/application-info-tab.tsx`
- Variants: `default`, `two`, `1`, `danger`, `three`
- Key Styles: `rounded-lg`, `border-slate-200`, `bg-slate-50`, `space-y-4`, `text-sm`, `font-bold`

```tsx
<div className="space-y-4">
      <InfoSection title={labels.submissionInfo} icon={<Hash className="size-4" />}>
        <InfoGrid>
          <InfoCell label={labels.applicationId} value={application.public_id} />
          <InfoCell label={labels.userId} value={userPublicId} />
          <InfoCell label={labels.createdAt} value={formatDateParts(application.created_at, locale
```

**ApplicationStatusBadge** — `src/components/admin/applications/application-status-badge.tsx`
- Key Styles: `rounded-full`, `px-2`, `font-bold`

```tsx
<span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        tone.className,
```

**ApplicationStatusTabs** — `src/components/admin/applications/application-status-tabs.tsx`
- Key Styles: `rounded-full`, `border-[#e6ebf2]`, `bg-[#f97316]`, `gap-7`, `text-sm`, `font-semibold`, `cursor-pointer`

```tsx
<div className="border-b border-[#e6ebf2] dark:border-white/10">
      <div className="flex gap-7 overflow-x-auto overflow-y-hidden">
        {tabs.map((tab
```

**ApplicationsFilterBar** — `src/components/admin/applications/applications-filter-bar.tsx`
- Variants: `all`, `today`, `week`, `month`, `custom`
- Props: `value`, `label`, `locale)`
- Key Styles: `gap-3`

```tsx
<div className="artistbor-table-filter-shell overflow-x-auto">
      <div className="artistbor-table-filter-panel grid gap-3 md:grid-cols-[auto_auto_auto_auto_minmax(0,1fr
```

**ExpandableBio** — `src/components/admin/applications/expandable-bio.tsx`
- Key Styles: `rounded-lg`, `border-slate-200`, `bg-slate-50`, `p-3.5`, `text-xs`, `font-semibold`, `cursor-pointer`
- State: useState

```tsx
<div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-[#121a2a]">
      {showLabel || canToggle ? (
        <div className={cn("mb-1.5 flex items-center gap-3", showLabel ? "justify-between" : "justify-end"
```

*...and 9 more layout components.*

### Navigation (2)

**AdminLayout** — `src/components/admin/admin-layout.tsx`
- Props: `status`, `page`, `limit`
- Key Styles: `bg-slate-50`, `px-[var(--artistbor-main-padding)]`
- Animation: tw-transitions: duration-200
- State: useState

**Pagination** — `src/components/admin/pagination.tsx`
- Key Styles: `rounded-[18px]`, `border-slate-100`, `bg-white`, `gap-2`, `text-sm`, `font-semibold`, `shadow-xl`, `hover:bg-slate-100`

```tsx
<PaginationShell
      page={currentPage}
      pageCount={pageCount}
      pageSize={limit}
      pageSizeOptions={pageSizeOptions}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
```

### Data Display (4)

**ApplicationsTable** — `src/components/admin/applications/applications-table.tsx`
- Key Styles: `rounded-[18px]`, `border-[#e6ebf2]`, `bg-white`, `gap-2.5`, `text-xs`, `font-semibold`, `shadow-[0_8px_24px_rgba(15,23,42,0.04)]`, `hover:bg-[#fffaf3]`

```tsx
<div className="overflow-hidden rounded-[18px] border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04
```

**DataTable** — `src/components/admin/data-table.tsx`
- Variants: `text`, `status`, `date`, `boolean`, `number`
- Key Styles: `rounded-[18px]`, `border-[#e6ebf2]`, `bg-white`, `px-3.5`, `font-bold`, `shadow-[0_8px_24px_rgba(15,23,42,0.04)]`, `hover:bg-[#fffaf3]`

```tsx
<div className="overflow-hidden rounded-[18px] border border-[#e6ebf2] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04
```

**States** — `src/components/ui/states.tsx`
- Key Styles: `rounded-xl`, `bg-amber-50`, `gap-3`, `text-sm`, `font-semibold`
- Animation: tw-animate-spin

```tsx
<div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
      <Loader2 className="size-5 animate-spin text-amber-500" />
      {label ?? t("common.loading"
```

**StatusBadge** — `src/components/ui/status-badge.tsx`
- Variants: `payment_status`, `is_published`, `1`, `10`, `0`, `is_active`, `true`, `false`, `status`, `status_label`
- Key Styles: `rounded-full`, `border-emerald-400/30`, `bg-emerald-50`, `px-2`, `font-bold`

```tsx
<span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[10px] font-bold uppercase leading-3 tracking-[0.08em]",
        good && "border-emerald-400/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
        danger && "border-rose-400/30 bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
        neutral && "border-slate-400/30 bg-slate-50 text-slate-600 dark:bg-white/10 dark:text-slate-300",
        !good && !danger && !neutral && "border-amber-400/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
```

### Data Input (3)

**AdminFilterForm** — `src/components/admin/admin-filter-form.tsx`
- Key Styles: `gap-3`
- State: useState

```tsx
<form
      onSubmit={onSubmit}
      className={cn(adminFilterShellClass, "flex flex-col"
```

**CrudPage** — `src/components/admin/crud-page.tsx`
- Variants: `text`, `number`, `textarea`, `view`, `search`, `create`, `select`, `edit`
- Props: `filters`, `list`
- Key Styles: `rounded-xl`, `border-slate-200`, `bg-slate-950`, `space-y-4`, `text-2xl`, `font-bold`, `shadow-sm`, `cursor-pointer`
- State: useState

**FormField** — `src/components/ui/form-field.tsx`
- Variants: `text`, `tel`, `password`, `number`, `date`, `time`, `textarea`, `none`, `url`, `email`, `numeric`, `decimal`, `select`, `search`
- Props: `label`, `value`
- Key Styles: `rounded-md`, `bg-[#f8fafc]`, `mt-1`, `text-xs`, `font-bold`, `shadow-none`, `pointer-events-none`
- State: useState

```tsx
<label className={cn("block", className
```

### Feedback (1)

**Toast** — `src/components/ui/toast.tsx`
- Variants: `success`, `error`
- Props: `success`, `error`
- Key Styles: `rounded-2xl`, `bg-white`, `gap-3`, `text-sm`, `font-semibold`, `shadow-2xl`
- State: useState, useContext

```tsx
<ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem
```

### Overlay (2)

**ConfirmDialog** — `src/components/ui/confirm-dialog.tsx`
- Key Styles: `rounded-xl`, `border-white/10`, `bg-slate-950/70`, `p-4`, `text-base`, `font-black`, `backdrop-blur-[2px]`, `hover:border-rose-300`
- Animation: tw-transitions: duration-500

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
      <section className="relative isolate w-full max-w-[480px] rounded-xl border border-white/10 bg-[#111827] p-6 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06
```

**Modal** — `src/components/ui/modal.tsx`
- Key Styles: `rounded-[10px]`, `border-white/10`, `bg-slate-950/70`, `p-4`, `text-lg`, `font-black`, `backdrop-blur-sm`, `hover:border-rose-300`
- Animation: tw-transitions: duration-500

```tsx
<div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className={`relative isolate max-h-[90vh] w-full ${width} overflow-hidden rounded-xl border border-white/10 bg-[#111827] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06
```

### Other (3)

**AdminDrawer** — `src/components/admin/admin-drawer.tsx`
- Key Styles: `text-lg`, `font-bold`

```tsx
<Drawer
      open={open}
      onClose={onClose}
      size={size}
      placement="right"
      closable={{ placement: "start" }}
      closeIcon={<X className="size-5" />}
      rootClassName={cn("artistbor-application-drawer", className
```

**ComingSoonPage** — `src/components/admin/coming-soon-page.tsx`
- Key Styles: `rounded-[28px]`, `border-slate-100`, `bg-white`, `space-y-4`, `text-2xl`, `font-bold`, `shadow-xl`

```tsx
<section className="artistbor-admin-page w-full space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-[#f97316]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.02em] text-[#0f172a] dark:text-white md:text-[30px] md:leading-9">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-[22px] text-[#64748b] dark:text-slate-400">
          {comingNext}
        </p>
      </div>
```

**LocationName** — `src/components/admin/location-name.tsx`
- Variants: `region`, `district`
- State: useState



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** 6px, 8px, 10px, 12px, 14px, 16px, 18px, calc(18px - 0.375rem), 22px, 24px, 999px
- **Max content width:** 100%
- **Grid usage:** `grid-cols-2`
- **Container:** Tailwind `container` class with responsive padding

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `inset 0 0 0 1px rgba(245,158,11,0.16)`
- `inset 0 0 0 1px rgba(251,191,36,0.13)`
- `inset 0 0 0 1px rgba(251,191,36,0.18)`

### Raised — cards, buttons, interactive elements

- `var(--artistbor-modal-surface-shadow)`
- `var(--artistbor-modal-field-shadow)`
- `var(--artistbor-modal-field-focus-shadow)`

### Overlay — full-screen overlays, top-level dialogs

- `0 12px 30px rgba(15,23,42,0.12)`
- `0 16px 32px rgba(2,6,23,0.34)`

### Z-Index Scale

`0, 1`



---

## 7. Animation & Motion

This project uses **subtle motion**. Transitions smooth state changes without demanding attention.

### CSS Animations

- `@keyframes animate-spin`

### Animated Components

- **AdminLayout**: tw-transitions: duration-200
- **ServiceListTab**: tw-animate-spin
- **ContractFileActions**: tw-animate-spin
- **Sidebar**: tw-transitions: duration-300
- **ConfirmDialog**: tw-transitions: duration-500

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#f7f7fb` as the primary page background
- Use **Geist** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 6px, 8px, 10px, 12px, 14px
- Reuse existing components from Section 4 before creating new ones
- Use **Lucide** for all icons
- Always use CSS variables for colors — never hardcode hex
- Test both light and dark modes for contrast

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use Geist consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't mix icon libraries — consistency matters


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| breakpoint-1024px | 1024px | css |

**Approach:** Mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
Always design for mobile first, then layer on responsive overrides.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #f7f7fb
Border: 1px solid #475569
Radius: 16px
Padding: 16px
Font: Geist
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg var(--accent), text white
Ghost: bg transparent, border #475569
Padding: 8px 16px
Radius: 16px
Hover: opacity 0.9 or lighter shade
Focus: ring with var(--accent)
```

### Build a Page Layout

```
Background: #f7f7fb
Max-width: 100%, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #f7f7fb
Label: #94a3b8 (muted, 12px, uppercase)
Value: #111827 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #f7f7fb
Input border: 1px solid #475569
Focus: border-color var(--accent)
Label: #94a3b8 12px
Spacing: 16px between fields
Radius: 16px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Geist, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/Geist-Black.ttf`
- `fonts/Geist-Bold.ttf`
- `fonts/Geist-ExtraBold.ttf`
- `fonts/Geist-ExtraLight.ttf`
- `fonts/Geist-Light.ttf`
- `fonts/Geist-Medium.ttf`
- `fonts/Geist-Regular.ttf`
- `fonts/Geist-SemiBold.ttf`
- `fonts/Geist-Thin.ttf`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

