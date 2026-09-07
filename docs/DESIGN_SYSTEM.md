# GoToolly Design System

**Version:** 2.0
**Reference Implementation:** PDF Compressor (`/tools/pdf-compressor.html`)
**Source File:** `assets/css/design-system.css`

---

## 1. Overview

The GoToolly Design System is a complete token-based UI framework for building consistent, accessible, and responsive tool pages across the gotoolly.com platform. It provides:

- A unified set of CSS custom properties (design tokens) for colors, typography, spacing, shadows, and motion.
- Pre-built component classes for buttons, cards, upload zones, file info bars, settings panels, progress indicators, results, badges, toasts, and page sections.
- Dark mode support via `prefers-color-scheme` media queries.
- Accessibility-first patterns: reduced motion, high contrast, focus-visible, skip links, and ARIA attributes.
- Responsive breakpoints at 1024px, 768px, and 480px.

**Usage:** Include `design-system.css` in any tool page. For legacy pages, the older token system lives in `base.css` and `components.css` (prefixed `--color-*`, `--space-*`). New tools must use the `--gt-*` prefix exclusively.

---

## 2. Design Tokens

All tokens are defined as CSS custom properties on `:root`. Use them everywhere — never hardcode values.

### 2.1 Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-primary` | `#2563eb` | Primary buttons, links, focus rings, active states |
| `--gt-primary-hover` | `#1d4ed8` | Primary button hover, link hover |
| `--gt-primary-light` | `#3b82f6` | Lighter variant for gradients, icon tints |
| `--gt-primary-bg` | `rgba(37,99,235,.06)` | Preset button active background, option card checked |
| `--gt-primary-border` | `rgba(37,99,235,.3)` | Option card checked border, preset hover border |
| `--gt-primary-shadow` | `rgba(37,99,235,.35)` | Primary button hover shadow, elevated card glow |
| `--gt-secondary` | `#10b981` | Success indicators, secondary accents |
| `--gt-secondary-dark` | `#046c4f` | Dark emerald for WCAG AA compliant buttons |
| `--gt-accent` | `#8b5cf6` | Creative accent, guide cards, gradient endpoints |

### 2.2 Neutral Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-white` | `#ffffff` | Card backgrounds, button text on primary |
| `--gt-gray-50` | `#f8fafc` | Surface background, upload zone fill |
| `--gt-gray-100` | `#f1f5f9` | Subtle surface variation |
| `--gt-gray-200` | `#e2e8f0` | Default borders, divider lines, track backgrounds |
| `--gt-gray-300` | `#cbd5e1` | Border hover, secondary borders |
| `--gt-gray-400` | `#94a3b8` | Muted text, placeholder text, remove button default |
| `--gt-gray-500` | `#64748b` | Secondary text, meta text, sub-labels |
| `--gt-gray-600` | `#475569` | Dark secondary text |
| `--gt-gray-700` | `#334155` | Dark mode borders, footer dividers |
| `--gt-gray-800` | `#1e293b` | Dark mode surfaces, dark mode cards |
| `--gt-gray-900` | `#0f172a` | Primary text, hero background, dark mode background |
| `--gt-black` | `#000000` | Avoid using directly; use `--gt-gray-900` |

### 2.3 Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-bg` | `var(--gt-white)` | Page background |
| `--gt-surface` | `var(--gt-gray-50)` | Card surfaces, upload zones, progress backgrounds |
| `--gt-text` | `var(--gt-gray-900)` | Primary body text |
| `--gt-text-secondary` | `var(--gt-gray-500)` | Descriptions, meta info |
| `--gt-text-muted` | `var(--gt-gray-400)` | De-emphasized text, placeholders |
| `--gt-border` | `var(--gt-gray-200)` | Default borders |
| `--gt-border-hover` | `var(--gt-gray-300)` | Hover state borders |

### 2.4 Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-success` | `#16a34a` | Success icon, stat reduction value |
| `--gt-success-bg` | `#dcfce7` | Success badge background, result icon background |
| `--gt-success-border` | `#bbf7d0` | Success badge border |
| `--gt-success-text` | `#166534` | Success badge text, success stat color |
| `--gt-warning` | `#d97706` | Warning icon, processing badge dot |
| `--gt-warning-bg` | `#fef3c7` | Warning box background, processing badge background |
| `--gt-warning-border` | `#fde68a` | Warning box border, processing badge border |
| `--gt-warning-text` | `#92400e` | Warning box text, processing badge text |
| `--gt-error` | `#dc2626` | Error icon, file remove hover |
| `--gt-error-bg` | `#fee2e2` | Error badge background, error icon background, excluded pages |
| `--gt-error-border` | `#fecaca` | Error badge border |
| `--gt-error-text` | `#991b1b` | Error badge text, error stat color |
| `--gt-info` | `#2563eb` | Info badge (same as primary) |
| `--gt-info-bg` | `#eff6ff` | Info badge background, step number background |
| `--gt-info-border` | `#bfdbfe` | Info badge border |
| `--gt-info-text` | `#1e40af` | Info badge text |

### 2.5 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-font` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | All body text |
| `--gt-font-mono` | `'JetBrains Mono', 'SF Mono', Monaco, monospace` | Code, file sizes, percentages, JSON output |

#### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-text-xs` | `0.75rem` (12px) | Micro labels, descriptions, sub-text |
| `--gt-text-sm` | `0.875rem` (14px) | Body text, buttons, form labels |
| `--gt-text-base` | `1rem` (16px) | Base font size, body default |
| `--gt-text-lg` | `1.125rem` (18px) | Section intros, larger body text |
| `--gt-text-xl` | `1.25rem` (20px) | Stat values, card headings |
| `--gt-text-2xl` | `1.5rem` (24px) | H4, sub-section headings |
| `--gt-text-3xl` | `1.875rem` (30px) | H3 |
| `--gt-text-4xl` | `2.25rem` (36px) | H2 |
| `--gt-text-5xl` | `3rem` (48px) | H1 hero headline |

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-weight-normal` | `400` | Body text, descriptions |
| `--gt-weight-medium` | `500` | Labels, nav links, secondary content |
| `--gt-weight-semibold` | `600` | Headings, buttons, badges, stat labels |
| `--gt-weight-bold` | `700` | H1-H3, stat values, emphasis |
| `--gt-weight-extrabold` | `800` | H1 only |

#### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-leading-tight` | `1.2` | Headings |
| `--gt-leading-snug` | `1.375` | Sub-headings |
| `--gt-leading-normal` | `1.5` | Body text |
| `--gt-leading-relaxed` | `1.625` | Long-form descriptions, FAQ answers |

### 2.6 Spacing (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-space-0` | `0` | Reset |
| `--gt-space-1` | `0.25rem` (4px) | Tight gaps, badge padding, icon micro-offset |
| `--gt-space-2` | `0.5rem` (8px) | Small gaps, checkbox margins, preset gaps |
| `--gt-space-3` | `0.75rem` (12px) | Medium gaps, button icon gaps, file info gaps |
| `--gt-space-4` | `1rem` (16px) | Standard padding/gaps, card internal padding |
| `--gt-space-5` | `1.25rem` (20px) | Settings card body padding, progress padding |
| `--gt-space-6` | `1.5rem` (24px) | Tool card padding, container side padding |
| `--gt-space-8` | `2rem` (32px) | Large gaps, results padding, section spacing |
| `--gt-space-10` | `2.5rem` (40px) | Section dividers |
| `--gt-space-12` | `3rem` (48px) | Upload zone padding, large section margins |
| `--gt-space-16` | `4rem` (64px) | Hero vertical padding, page bottom margin |
| `--gt-space-20` | `5rem` (80px) | Extra-large section spacing |
| `--gt-space-24` | `6rem` (96px) | Maximum spacing |

### 2.7 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-radius-sm` | `6px` | Small elements: code blocks, page chips |
| `--gt-radius-md` | `8px` | Toast, remove button, file remove |
| `--gt-radius-lg` | `10px` | Upload button, option cards, preset buttons (hover border) |
| `--gt-radius-xl` | `12px` | File info bar, option cards, stat boxes, progress containers |
| `--gt-radius-2xl` | `14px` | Settings cards, base cards |
| `--gt-radius-3xl` | `16px` | Tool card, upload area, upload icon |
| `--gt-radius-full` | `9999px` | Badges, progress bar, file status pills, avatar circles |

### 2.8 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-shadow-xs` | `0 1px 2px rgba(0,0,0,.05)` | Barely-visible lift |
| `--gt-shadow-sm` | `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)` | Default card shadow (tool card) |
| `--gt-shadow-md` | `0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.04)` | Elevated cards, hover states |
| `--gt-shadow-lg` | `0 4px 12px rgba(0,0,0,.06)` | Medium elevation |
| `--gt-shadow-xl` | `0 8px 24px rgba(0,0,0,.08)` | High elevation, modals |
| `--gt-shadow-2xl` | `0 8px 25px rgba(0,0,0,.12)` | Maximum elevation |
| `--gt-shadow-primary` | `0 8px 25px var(--gt-primary-shadow)` | Primary button hover glow |

### 2.9 Elevation (Composite)

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-elevation-0` | `none` | Flat elements |
| `--gt-elevation-1` | `var(--gt-shadow-sm)` | Default cards |
| `--gt-elevation-2` | `var(--gt-shadow-md)` | Raised cards |
| `--gt-elevation-3` | `var(--gt-shadow-lg)` | Elevated panels |
| `--gt-elevation-4` | `var(--gt-shadow-xl)` | Overlays, modals |

### 2.10 Icon Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-icon-xs` | `14px` | Inline text icons, micro icons |
| `--gt-icon-sm` | `16px` | Button icons in small buttons |
| `--gt-icon-md` | `18px` | Standard button icons, card header icons |
| `--gt-icon-lg` | `20px` | Card header icons, related card icons |
| `--gt-icon-xl` | `24px` | Upload icon (mobile), large standalone icons |
| `--gt-icon-2xl` | `32px` | Upload icon (desktop), section icons |
| `--gt-icon-3xl` | `40px` | Results icon (desktop) |

### 2.11 Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-ease` | `cubic-bezier(.4,0,.2,1)` | Standard easing curve for all transitions |
| `--gt-duration-fast` | `150ms` | Micro-interactions: checkbox scale, remove button |
| `--gt-duration-normal` | `200ms` | Standard transitions: hover states, focus rings |
| `--gt-duration-medium` | `250ms` | Content transitions: upload icon scale, card reveals |
| `--gt-duration-slow` | `300ms` | Large transitions: progress fill, toast slide |
| `--gt-duration-slower` | `350ms` | Maximum duration: complex animations |

#### Composite Transition Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-transition-fast` | `var(--gt-duration-fast) var(--gt-ease)` | Links, small interactions |
| `--gt-transition-normal` | `var(--gt-duration-normal) var(--gt-ease)` | Buttons, cards, inputs |
| `--gt-transition-medium` | `var(--gt-duration-medium) var(--gt-ease)` | Upload zone, preset hover |
| `--gt-transition-slow` | `var(--gt-duration-slow) var(--gt-ease)` | Progress bar fill, toasts |

### 2.12 Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-z-dropdown` | `100` | Dropdown menus, skip link |
| `--gt-z-sticky` | `200` | Sticky header |
| `--gt-z-overlay` | `300` | Page overlays |
| `--gt-z-modal` | `400` | Modal dialogs |
| `--gt-z-toast` | `500` | Toast notifications (always on top) |

### 2.13 Containers

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-container` | `900px` | Standard tool page width, related tools, how it works, FAQ |
| `--gt-container-wide` | `1280px` | Wide layouts, tool grid pages |
| `--gt-container-narrow` | `640px` | Narrow content, single-column text |

### 2.14 Touch Target

| Token | Value | Usage |
|-------|-------|-------|
| `--gt-touch-target` | `44px` | Minimum tap target for all interactive elements (WCAG 2.5.5) |

---

## 3. Dark Mode Tokens

Dark mode activates via `@media (prefers-color-scheme: dark)` and overrides the semantic tokens. No component-specific class changes are needed for basic dark mode.

### 3.1 Semantic Token Overrides

| Token | Light Value | Dark Value |
|-------|-------------|------------|
| `--gt-bg` | `var(--gt-white)` (#ffffff) | `var(--gt-gray-900)` (#0f172a) |
| `--gt-surface` | `var(--gt-gray-50)` (#f8fafc) | `var(--gt-gray-800)` (#1e293b) |
| `--gt-text` | `var(--gt-gray-900)` (#0f172a) | `var(--gt-gray-50)` (#f8fafc) |
| `--gt-text-secondary` | `var(--gt-gray-500)` (#64748b) | `var(--gt-gray-300)` (#cbd5e1) |
| `--gt-text-muted` | `var(--gt-gray-400)` (#94a3b8) | `var(--gt-gray-400)` (#94a3b8) |
| `--gt-border` | `var(--gt-gray-200)` (#e2e8f0) | `var(--gt-gray-700)` (#334155) |
| `--gt-border-hover` | `var(--gt-gray-300)` (#cbd5e1) | `var(--gt-gray-600)` (#475569) |

### 3.2 Component Dark Mode Overrides

These are applied automatically by `design-system.css`:

| Component | Dark Mode Override |
|-----------|--------------------|
| `.gt-upload-area` | `background: var(--gt-gray-800)` |
| `.gt-upload-btn` | `background: var(--gt-gray-700); border-color: var(--gt-gray-600)` |
| `.gt-preset-btn` | `background: var(--gt-gray-800)` |
| `.gt-option-card` | `background: var(--gt-gray-800)` |
| `.gt-step-num` | `background: var(--gt-gray-700)` |
| `.gt-step-card:hover .gt-step-num` | `background: var(--gt-gray-600)` |

For legacy tool pages using `tools.css`, additional dark mode overrides are applied to `.tool-interface`, `.text-area`, `.result-box`, `.checkbox-label`, `.stat-item`, and form inputs.

---

## 4. Full Token Reference Table

| Category | Token | Value | CSS |
|----------|-------|-------|-----|
| **Brand** | `--gt-primary` | `#2563eb` | `color: var(--gt-primary)` |
| **Brand** | `--gt-primary-hover` | `#1d4ed8` | `background: var(--gt-primary-hover)` |
| **Brand** | `--gt-primary-light` | `#3b82f6` | `color: var(--gt-primary-light)` |
| **Brand** | `--gt-primary-bg` | `rgba(37,99,235,.06)` | `background: var(--gt-primary-bg)` |
| **Brand** | `--gt-primary-border` | `rgba(37,99,235,.3)` | `border-color: var(--gt-primary-border)` |
| **Brand** | `--gt-primary-shadow` | `rgba(37,99,235,.35)` | `box-shadow: 0 8px 25px var(--gt-primary-shadow)` |
| **Brand** | `--gt-secondary` | `#10b981` | `color: var(--gt-secondary)` |
| **Brand** | `--gt-secondary-dark` | `#046c4f` | `background: var(--gt-secondary-dark)` |
| **Brand** | `--gt-accent` | `#8b5cf6` | `color: var(--gt-accent)` |
| **Neutral** | `--gt-white` | `#ffffff` | `background: var(--gt-white)` |
| **Neutral** | `--gt-gray-50` | `#f8fafc` | `background: var(--gt-gray-50)` |
| **Neutral** | `--gt-gray-100` | `#f1f5f9` | `background: var(--gt-gray-100)` |
| **Neutral** | `--gt-gray-200` | `#e2e8f0` | `border-color: var(--gt-gray-200)` |
| **Neutral** | `--gt-gray-300` | `#cbd5e1` | `border-color: var(--gt-gray-300)` |
| **Neutral** | `--gt-gray-400` | `#94a3b8` | `color: var(--gt-gray-400)` |
| **Neutral** | `--gt-gray-500` | `#64748b` | `color: var(--gt-gray-500)` |
| **Neutral** | `--gt-gray-600` | `#475569` | `color: var(--gt-gray-600)` |
| **Neutral** | `--gt-gray-700` | `#334155` | `border-color: var(--gt-gray-700)` |
| **Neutral** | `--gt-gray-800` | `#1e293b` | `background: var(--gt-gray-800)` |
| **Neutral** | `--gt-gray-900` | `#0f172a` | `color: var(--gt-gray-900)` |
| **Neutral** | `--gt-black` | `#000000` | Avoid; use `--gt-gray-900` |
| **Semantic** | `--gt-bg` | `var(--gt-white)` | `background: var(--gt-bg)` |
| **Semantic** | `--gt-surface` | `var(--gt-gray-50)` | `background: var(--gt-surface)` |
| **Semantic** | `--gt-text` | `var(--gt-gray-900)` | `color: var(--gt-text)` |
| **Semantic** | `--gt-text-secondary` | `var(--gt-gray-500)` | `color: var(--gt-text-secondary)` |
| **Semantic** | `--gt-text-muted` | `var(--gt-gray-400)` | `color: var(--gt-text-muted)` |
| **Semantic** | `--gt-border` | `var(--gt-gray-200)` | `border-color: var(--gt-border)` |
| **Semantic** | `--gt-border-hover` | `var(--gt-gray-300)` | `border-color: var(--gt-border-hover)` |
| **Status** | `--gt-success` | `#16a34a` | `color: var(--gt-success)` |
| **Status** | `--gt-success-bg` | `#dcfce7` | `background: var(--gt-success-bg)` |
| **Status** | `--gt-success-border` | `#bbf7d0` | `border-color: var(--gt-success-border)` |
| **Status** | `--gt-success-text` | `#166534` | `color: var(--gt-success-text)` |
| **Status** | `--gt-warning` | `#d97706` | `color: var(--gt-warning)` |
| **Status** | `--gt-warning-bg` | `#fef3c7` | `background: var(--gt-warning-bg)` |
| **Status** | `--gt-warning-border` | `#fde68a` | `border-color: var(--gt-warning-border)` |
| **Status** | `--gt-warning-text` | `#92400e` | `color: var(--gt-warning-text)` |
| **Status** | `--gt-error` | `#dc2626` | `color: var(--gt-error)` |
| **Status** | `--gt-error-bg` | `#fee2e2` | `background: var(--gt-error-bg)` |
| **Status** | `--gt-error-border` | `#fecaca` | `border-color: var(--gt-error-border)` |
| **Status** | `--gt-error-text` | `#991b1b` | `color: var(--gt-error-text)` |
| **Status** | `--gt-info` | `#2563eb` | `color: var(--gt-info)` |
| **Status** | `--gt-info-bg` | `#eff6ff` | `background: var(--gt-info-bg)` |
| **Status** | `--gt-info-border` | `#bfdbfe` | `border-color: var(--gt-info-border)` |
| **Status** | `--gt-info-text` | `#1e40af` | `color: var(--gt-info-text)` |
| **Type** | `--gt-font` | Inter stack | `font-family: var(--gt-font)` |
| **Type** | `--gt-font-mono` | JetBrains Mono stack | `font-family: var(--gt-font-mono)` |
| **Type** | `--gt-text-xs` | `0.75rem` | `font-size: var(--gt-text-xs)` |
| **Type** | `--gt-text-sm` | `0.875rem` | `font-size: var(--gt-text-sm)` |
| **Type** | `--gt-text-base` | `1rem` | `font-size: var(--gt-text-base)` |
| **Type** | `--gt-text-lg` | `1.125rem` | `font-size: var(--gt-text-lg)` |
| **Type** | `--gt-text-xl` | `1.25rem` | `font-size: var(--gt-text-xl)` |
| **Type** | `--gt-text-2xl` | `1.5rem` | `font-size: var(--gt-text-2xl)` |
| **Type** | `--gt-text-3xl` | `1.875rem` | `font-size: var(--gt-text-3xl)` |
| **Type** | `--gt-text-4xl` | `2.25rem` | `font-size: var(--gt-text-4xl)` |
| **Type** | `--gt-text-5xl` | `3rem` | `font-size: var(--gt-text-5xl)` |
| **Type** | `--gt-weight-normal` | `400` | `font-weight: var(--gt-weight-normal)` |
| **Type** | `--gt-weight-medium` | `500` | `font-weight: var(--gt-weight-medium)` |
| **Type** | `--gt-weight-semibold` | `600` | `font-weight: var(--gt-weight-semibold)` |
| **Type** | `--gt-weight-bold` | `700` | `font-weight: var(--gt-weight-bold)` |
| **Type** | `--gt-weight-extrabold` | `800` | `font-weight: var(--gt-weight-extrabold)` |
| **Type** | `--gt-leading-tight` | `1.2` | `line-height: var(--gt-leading-tight)` |
| **Type** | `--gt-leading-snug` | `1.375` | `line-height: var(--gt-leading-snug)` |
| **Type** | `--gt-leading-normal` | `1.5` | `line-height: var(--gt-leading-normal)` |
| **Type** | `--gt-leading-relaxed` | `1.625` | `line-height: var(--gt-leading-relaxed)` |
| **Space** | `--gt-space-0` | `0` | `padding: var(--gt-space-0)` |
| **Space** | `--gt-space-1` | `0.25rem` | `gap: var(--gt-space-1)` |
| **Space** | `--gt-space-2` | `0.5rem` | `gap: var(--gt-space-2)` |
| **Space** | `--gt-space-3` | `0.75rem` | `padding: var(--gt-space-3)` |
| **Space** | `--gt-space-4` | `1rem` | `padding: var(--gt-space-4)` |
| **Space** | `--gt-space-5` | `1.25rem` | `padding: var(--gt-space-5)` |
| **Space** | `--gt-space-6` | `1.5rem` | `padding: var(--gt-space-6)` |
| **Space** | `--gt-space-8` | `2rem` | `gap: var(--gt-space-8)` |
| **Space** | `--gt-space-10` | `2.5rem` | `margin: var(--gt-space-10) 0` |
| **Space** | `--gt-space-12` | `3rem` | `margin-bottom: var(--gt-space-12)` |
| **Space** | `--gt-space-16` | `4rem` | `padding: var(--gt-space-16) 0` |
| **Space** | `--gt-space-20` | `5rem` | `margin: var(--gt-space-20) 0` |
| **Space** | `--gt-space-24` | `6rem` | `padding: var(--gt-space-24) 0` |
| **Radius** | `--gt-radius-sm` | `6px` | `border-radius: var(--gt-radius-sm)` |
| **Radius** | `--gt-radius-md` | `8px` | `border-radius: var(--gt-radius-md)` |
| **Radius** | `--gt-radius-lg` | `10px` | `border-radius: var(--gt-radius-lg)` |
| **Radius** | `--gt-radius-xl` | `12px` | `border-radius: var(--gt-radius-xl)` |
| **Radius** | `--gt-radius-2xl` | `14px` | `border-radius: var(--gt-radius-2xl)` |
| **Radius** | `--gt-radius-3xl` | `16px` | `border-radius: var(--gt-radius-3xl)` |
| **Radius** | `--gt-radius-full` | `9999px` | `border-radius: var(--gt-radius-full)` |
| **Shadow** | `--gt-shadow-xs` | `0 1px 2px rgba(0,0,0,.05)` | `box-shadow: var(--gt-shadow-xs)` |
| **Shadow** | `--gt-shadow-sm` | `0 1px 3px ...` | `box-shadow: var(--gt-shadow-sm)` |
| **Shadow** | `--gt-shadow-md` | `0 4px 6px ...` | `box-shadow: var(--gt-shadow-md)` |
| **Shadow** | `--gt-shadow-lg` | `0 4px 12px ...` | `box-shadow: var(--gt-shadow-lg)` |
| **Shadow** | `--gt-shadow-xl` | `0 8px 24px ...` | `box-shadow: var(--gt-shadow-xl)` |
| **Shadow** | `--gt-shadow-2xl` | `0 8px 25px ...` | `box-shadow: var(--gt-shadow-2xl)` |
| **Shadow** | `--gt-shadow-primary` | `0 8px 25px var(--gt-primary-shadow)` | `box-shadow: var(--gt-shadow-primary)` |
| **Elevation** | `--gt-elevation-0` | `none` | `box-shadow: var(--gt-elevation-0)` |
| **Elevation** | `--gt-elevation-1` | `var(--gt-shadow-sm)` | `box-shadow: var(--gt-elevation-1)` |
| **Elevation** | `--gt-elevation-2` | `var(--gt-shadow-md)` | `box-shadow: var(--gt-elevation-2)` |
| **Elevation** | `--gt-elevation-3` | `var(--gt-shadow-lg)` | `box-shadow: var(--gt-elevation-3)` |
| **Elevation** | `--gt-elevation-4` | `var(--gt-shadow-xl)` | `box-shadow: var(--gt-elevation-4)` |
| **Icon** | `--gt-icon-xs` | `14px` | `width: var(--gt-icon-xs)` |
| **Icon** | `--gt-icon-sm` | `16px` | `width: var(--gt-icon-sm)` |
| **Icon** | `--gt-icon-md` | `18px` | `width: var(--gt-icon-md)` |
| **Icon** | `--gt-icon-lg` | `20px` | `width: var(--gt-icon-lg)` |
| **Icon** | `--gt-icon-xl` | `24px` | `width: var(--gt-icon-xl)` |
| **Icon** | `--gt-icon-2xl` | `32px` | `width: var(--gt-icon-2xl)` |
| **Icon** | `--gt-icon-3xl` | `40px` | `width: var(--gt-icon-3xl)` |
| **Motion** | `--gt-ease` | `cubic-bezier(.4,0,.2,1)` | `transition-timing-function: var(--gt-ease)` |
| **Motion** | `--gt-duration-fast` | `150ms` | `transition-duration: var(--gt-duration-fast)` |
| **Motion** | `--gt-duration-normal` | `200ms` | `transition-duration: var(--gt-duration-normal)` |
| **Motion** | `--gt-duration-medium` | `250ms` | `transition-duration: var(--gt-duration-medium)` |
| **Motion** | `--gt-duration-slow` | `300ms` | `transition-duration: var(--gt-duration-slow)` |
| **Motion** | `--gt-duration-slower` | `350ms` | `transition-duration: var(--gt-duration-slower)` |
| **Motion** | `--gt-transition-fast` | `150ms cubic-bezier(...)` | `transition: var(--gt-transition-fast)` |
| **Motion** | `--gt-transition-normal` | `200ms cubic-bezier(...)` | `transition: var(--gt-transition-normal)` |
| **Motion** | `--gt-transition-medium` | `250ms cubic-bezier(...)` | `transition: var(--gt-transition-medium)` |
| **Motion** | `--gt-transition-slow` | `300ms cubic-bezier(...)` | `transition: var(--gt-transition-slow)` |
| **Z-Index** | `--gt-z-dropdown` | `100` | `z-index: var(--gt-z-dropdown)` |
| **Z-Index** | `--gt-z-sticky` | `200` | `z-index: var(--gt-z-sticky)` |
| **Z-Index** | `--gt-z-overlay` | `300` | `z-index: var(--gt-z-overlay)` |
| **Z-Index** | `--gt-z-modal` | `400` | `z-index: var(--gt-z-modal)` |
| **Z-Index** | `--gt-z-toast` | `500` | `z-index: var(--gt-z-toast)` |
| **Container** | `--gt-container` | `900px` | `max-width: var(--gt-container)` |
| **Container** | `--gt-container-wide` | `1280px` | `max-width: var(--gt-container-wide)` |
| **Container** | `--gt-container-narrow` | `640px` | `max-width: var(--gt-container-narrow)` |
| **Touch** | `--gt-touch-target` | `44px` | `min-height: var(--gt-touch-target)` |
