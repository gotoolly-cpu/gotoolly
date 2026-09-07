# GoToolly Component Library

**Design System Version:** 2.0
**Source:** `assets/css/design-system.css`, `assets/js/gt-components.js`

---

## 1. Component Overview

The GoToolly component library provides pre-built UI components that compose tool pages. All components use `--gt-*` design tokens and follow the same interaction patterns.

Components are available in two forms:
- **CSS classes** — apply directly in HTML markup.
- **JS factory functions** — create components dynamically via the `GT` global API.

---

## 2. Buttons

### 2.1 Base Class

```html
<button class="gt-btn">Label</button>
```

**Properties:**
- Inline-flex layout with centered content and icon gap.
- `min-height: var(--gt-touch-target)` (44px) for WCAG 2.5.5.
- Uses `--gt-font`, `--gt-text-sm`, `--gt-weight-semibold`.
- `border-radius: var(--gt-radius-xl)`.
- Transition: `var(--gt-transition-normal)`.

### 2.2 Variants

| Class | Background | Text | Border | Use Case |
|-------|-----------|------|--------|----------|
| `.gt-btn-primary` | `var(--gt-primary)` | `var(--gt-white)` | none | Primary actions (Compress, Download) |
| `.gt-btn-outline` | `var(--gt-white)` | `var(--gt-text)` | `var(--gt-border)` | Secondary actions (Reset, Minify) |
| `.gt-btn-ghost` | transparent | `var(--gt-text-secondary)` | none | Tertiary actions, inline actions |
| `.gt-btn-danger` | `var(--gt-error)` | `var(--gt-white)` | none | Destructive actions |

**Hover states:**
- Primary: background darkens to `--gt-primary-hover`, lifts 1px, gains primary shadow.
- Outline: border darkens, background shifts to surface, lifts 1px.
- Ghost: background shifts to surface, text becomes primary.
- Danger: background darkens to `#b91c1c`, lifts 1px, gains red shadow.

### 2.3 Sizes

| Class | Padding | Font Size | Min Height | Use Case |
|-------|---------|-----------|------------|----------|
| `.gt-btn-sm` | `--gt-space-2` / `--gt-space-4` | `--gt-text-xs` | 36px | Compact actions, related tool links |
| (default) | `--gt-space-3` / `--gt-space-6` | `--gt-text-sm` | 44px | Standard buttons |
| `.gt-btn-lg` | `--gt-space-4` / `--gt-space-8` | `--gt-text-base` | 52px | Large form actions |
| `.gt-btn-xl` | `0` / `--gt-space-8` | `--gt-text-lg` | 56px | Download/primary results actions |

### 2.4 Modifiers

| Class | Effect |
|-------|--------|
| `.gt-btn-block` | `width: 100%` — full-width button |
| `.gt-btn-group` | `display: grid; grid-template-columns: 1fr 1fr; gap: var(--gt-space-3)` — side-by-side button pair |

### 2.5 States

| State | Behavior |
|-------|----------|
| Default | Normal appearance |
| `:hover:not(:disabled)` | Variant-specific hover style |
| `:focus-visible` | `outline: 2px solid var(--gt-primary); outline-offset: 2px` |
| `:active:not(:disabled)` | `transform: translateY(0)` (resets hover lift) |
| `:disabled` | `opacity: .5; cursor: not-allowed; pointer-events: none` |

### 2.6 HTML Structure

```html
<button class="gt-btn gt-btn-primary" id="compress-btn">
  <svg><!-- icon --></svg>
  Compress PDF
</button>
```

### 2.7 Accessibility

- All buttons are native `<button>` elements (never `<div>` or `<span>`).
- `:focus-visible` ring on keyboard navigation.
- Disabled buttons use `disabled` attribute (not CSS-only).
- Icon-only buttons must have `aria-label`.

---

## 3. Cards

### 3.1 Base Card

```html
<div class="gt-card">...</div>
```

- White background, 1px `var(--gt-border)`, `var(--gt-radius-2xl)`, overflow hidden.

### 3.2 Tool Card

The main workspace wrapper for every tool page.

```html
<div class="gt-tool-card" role="region" aria-label="Tool workspace">
  <!-- Card Header -->
  <div class="gt-card-header">
    <div class="gt-card-header-left">
      <svg><!-- tool icon --></svg>
      <h2>Tool Name</h2>
    </div>
    <span class="gt-badge gt-badge-ready" id="status-badge" aria-live="polite">Ready</span>
  </div>
  <div class="gt-card-divider"></div>
  <!-- Workspace Body -->
  <div class="workspace-body" id="workspace-body">
    <!-- Upload zone, file info, settings, progress, results -->
  </div>
  <!-- Action Bar -->
  <div class="gt-btn-group" id="action-bar">...</div>
  <!-- Limitations Box -->
  <div class="gt-warning-box" id="limitations-box">...</div>
</div>
```

**Properties:**
- `border-radius: var(--gt-radius-3xl)` (16px)
- `box-shadow: var(--gt-shadow-sm)`
- `border: 1px solid var(--gt-border)`
- Padding: `var(--gt-space-6)` (desktop), `var(--gt-space-4)` (mobile)
- `margin-bottom: var(--gt-space-12)` (desktop), `var(--gt-space-8)` (mobile)

### 3.3 Card Header

- Flexbox row with `justify-content: space-between`.
- Left: icon (18px, primary color) + H2 (16.8px, semibold).
- Right: status badge.

### 3.4 Card Divider

- `height: 1px; background: var(--gt-border); margin: var(--gt-space-4) 0 0`.

### 3.5 Settings Card

Used inside the settings panel for grouped options.

```html
<div class="gt-settings-card">
  <div class="gt-settings-card-header">
    <h3>Section Title</h3>
  </div>
  <div class="gt-settings-card-body">
    <!-- Options content -->
  </div>
</div>
```

- White background, 1px border, `var(--gt-radius-2xl)`.
- Header: `padding: var(--gt-space-4) var(--gt-space-5)`, 1px bottom border.
- Body: `padding: var(--gt-space-5)` (desktop), `var(--gt-space-4)` (mobile).
- Add `.hidden` class to hide.

### 3.6 Responsive Behavior

- Tool card padding reduces at 768px.
- Settings card body padding reduces at 768px.

---

## 4. Upload Zone

### 4.1 HTML Structure

```html
<div class="gt-upload-area" id="drop-zone" role="button" tabindex="0"
     aria-describedby="upload-subtext">
  <input type="file" id="file-input" accept=".pdf" style="display:none"
         aria-label="Select file">
  <div class="gt-upload-icon">
    <svg><!-- upload arrow --></svg>
  </div>
  <h3>Drop your file here</h3>
  <p class="gt-upload-sub" id="upload-subtext">
    File type up to 50 MB. Batch processing supported.
  </p>
  <span class="gt-upload-btn">Select files</span>
</div>
```

### 4.2 States

| State | Visual Treatment |
|-------|------------------|
| Default | Dashed 2px border (`var(--gt-border)`), `var(--gt-surface)` background |
| Hover | Blue border, 4% blue tint (`rgba(37,99,235,.04)`) |
| Focus | Blue border, 3px focus ring (`rgba(37,99,235,.15)`) |
| Dragover | Blue border, 8% blue tint, 4px focus ring, class `.dragover` |
| Uploaded | Hidden, replaced by file info bar |

### 4.3 Accessibility

- Hidden `<input type="file">` paired with `<label>`.
- The label/drop zone has `role="button"` and `tabindex="0"`.
- `aria-describedby` points to the subtext.
- Keyboard activation (Enter/Space) triggers the hidden file input.

### 4.4 Responsive

- Padding reduces at 768px: `var(--gt-space-8) var(--gt-space-4)`.
- Upload icon shrinks to 60x60px at 768px.

### 4.5 JS Component

```javascript
const zone = GT.createUploadZone({
  id: 'pdf',
  accept: '.pdf',
  label: 'Drop your PDF here',
  subtext: 'PDF files up to 50 MB each.',
  buttonText: 'Select PDF files',
  onFile: (file) => { /* handle file */ }
});
```

---

## 5. File Info Bar

### 5.1 HTML Structure

```html
<div class="gt-file-info show" id="file-info" role="status" aria-live="polite">
  <div class="gt-file-icon">
    <svg><!-- document icon --></svg>
  </div>
  <div class="gt-file-details">
    <div class="gt-file-name" title="document.pdf">document.pdf</div>
    <div class="gt-file-meta">
      <span>2.4 MB</span>
      <span>12 pages</span>
    </div>
  </div>
  <span class="gt-file-status ok">Ready</span>
  <button class="gt-file-remove" aria-label="Remove file" title="Remove file">
    <svg><!-- X icon --></svg>
  </button>
</div>
```

### 5.2 States

| State | Badge Class | Badge Text |
|-------|-------------|------------|
| Ready | `.gt-file-status.ok` | "Ready" |
| Warning | `.gt-file-status.warn` | Warning message |
| Error | `.gt-file-status.warn` | Error message |

### 5.3 Properties

- Default `display: none`. Add `.show` class to display as flex.
- Background: `var(--gt-surface)`.
- Border: 1px `var(--gt-border)`, `var(--gt-radius-xl)`.
- File name: truncated with ellipsis, `title` attribute for full name.
- File meta: JetBrains Mono font, muted color.
- Remove button: 32x32, danger hover (`var(--gt-error-bg)` background).

### 5.4 Responsive

- At 768px: flex-wrap enabled, status badge gets `order: 4`.

### 5.5 JS Component

```javascript
const info = GT.createFileInfo({
  id: 'file-info',
  name: 'document.pdf',
  size: 2516582,
  pages: 12,
  status: 'ready'
});
```

---

## 6. Settings Panel

### 6.1 HTML Structure

```html
<div class="gt-settings-panel show" id="settings-panel">
  <div class="gt-settings-card">
    <!-- Card 1: Preset selection -->
  </div>
  <div class="gt-settings-card">
    <!-- Card 2: Options -->
  </div>
  <div class="gt-settings-card hidden" id="advanced-card">
    <!-- Card 3: Advanced (shown for Custom preset) -->
  </div>
</div>
```

### 6.2 Properties

- Default `display: none`. Add `.show` to display as flex column.
- Gap: `var(--gt-space-4)`.
- Margin-top: `var(--gt-space-5)`.

### 6.3 JS Component

```javascript
const settingsCard = GT.createSettingsCard({
  title: 'Compression Preset',
  content: presetGridElement, // or string HTML
  id: 'preset-card'
});

const panel = GT.createSettingsPanel({
  id: 'settings-panel',
  cards: [settingsCard, optionsCard, advancedCard]
});
```

---

## 7. Preset Grid

### 7.1 HTML Structure

```html
<div class="gt-preset-grid" role="radiogroup" aria-label="Preset selection">
  <button type="button" class="gt-preset-btn active" data-preset="balanced"
          role="radio" aria-checked="true">
    <svg><!-- icon --></svg>
    <span class="gt-preset-name">Balanced</span>
    <span class="gt-preset-desc">Best balance</span>
  </button>
  <button type="button" class="gt-preset-btn" data-preset="maximum"
          role="radio" aria-checked="false">
    <svg><!-- icon --></svg>
    <span class="gt-preset-name">Maximum</span>
    <span class="gt-preset-desc">Smallest size</span>
  </button>
  <button type="button" class="gt-preset-btn" data-preset="custom"
          role="radio" aria-checked="false">
    <svg><!-- icon --></svg>
    <span class="gt-preset-name">Custom</span>
    <span class="gt-preset-desc">Full control</span>
  </button>
</div>
```

### 7.2 Properties

- CSS Grid: `repeat(3, 1fr)` (desktop), `1fr` (mobile at 768px).
- Gap: `var(--gt-space-2)`.
- Each button: flex column, centered, `var(--gt-radius-xl)` border.

### 7.3 States

| State | Visual Treatment |
|-------|------------------|
| Default | 2px solid `var(--gt-border)` border, white background |
| Hover | Blue border, primary bg tint, lifts 2px, gains shadow |
| Focus-visible | Blue border, 3px focus ring |
| Active | Blue border, primary bg tint, 3px focus ring, class `.active` |

### 7.4 Accessibility

- Container has `role="radiogroup"` and `aria-label`.
- Each button has `role="radio"` and `aria-checked`.
- Clicking updates `aria-checked` on all buttons.

### 7.5 JS Component

```javascript
const grid = GT.createPresetGrid({
  presets: [
    { id: 'balanced', name: 'Balanced', desc: 'Best balance', icon: '<svg>...</svg>' },
    { id: 'maximum', name: 'Maximum', desc: 'Smallest size', icon: '<svg>...</svg>' },
    { id: 'custom', name: 'Custom', desc: 'Full control', icon: '<svg>...</svg>' }
  ],
  active: 'balanced',
  onChange: (presetId) => { /* handle selection */ }
});
```

---

## 8. Option Cards (Checkboxes)

### 8.1 HTML Structure

```html
<div class="gt-options-group">
  <label class="gt-option-card">
    <input type="checkbox" id="opt-remove-metadata" checked>
    <div>
      <div class="gt-option-label">Remove document metadata</div>
      <div class="gt-option-desc">Author, dates, keywords</div>
    </div>
  </label>
</div>
```

### 8.2 Properties

- Flex row with gap: `var(--gt-space-3)`.
- Padding: `var(--gt-space-3) var(--gt-space-4)`.
- Border: 1px `var(--gt-border)`, `var(--gt-radius-lg)`.
- Checkbox: 18x18, `accent-color: var(--gt-primary)`.

### 8.3 States

| State | Visual Treatment |
|-------|------------------|
| Default | Normal border, white background |
| Hover | Primary border, blue tint, 2px lift, subtle shadow |
| Checked | Primary border, 3% blue tint |

### 8.4 Accessibility

- Uses native `<label>` wrapping `<input type="checkbox">` — clicking the label toggles the checkbox.
- Checkbox has `accent-color` for custom color.
- Scale animation on `:active`.

### 8.5 JS Component

```javascript
const option = GT.createOptionCard({
  id: 'opt-remove-metadata',
  label: 'Remove document metadata',
  desc: 'Author, dates, keywords',
  checked: true,
  onChange: (checked) => { /* handle toggle */ }
});
```

---

## 9. Progress Bar

### 9.1 HTML Structure

```html
<div class="gt-progress show" id="progress" role="progressbar"
     aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
  <div class="gt-progress-top">
    <div class="gt-progress-spinner"></div>
    <span class="gt-progress-phase" id="progress-phase">Initializing...</span>
    <span class="gt-progress-pct" id="progress-pct">0%</span>
  </div>
  <div class="gt-progress-track">
    <div class="gt-progress-fill" id="progress-fill"></div>
  </div>
  <div class="gt-progress-cancel" id="progress-cancel">
    <button type="button" id="cancel-btn">Cancel</button>
  </div>
</div>
```

### 9.2 States

| State | Visual Treatment |
|-------|------------------|
| Hidden | `display: none` (default) |
| Active | Spinner rotates, fill animates, percentage counts up |
| Complete | 100%, then transition to results panel |
| Cancelled | Fade out, return to file ready state |

### 9.3 Components

- **Spinner:** 24px circle, 3px border, top border primary blue, `gt-spin` animation (0.6s linear infinite).
- **Phase Label:** `--gt-text-sm`, `--gt-weight-medium`, flex: 1.
- **Percentage:** `--gt-text-sm`, `--gt-weight-semibold`, primary color, JetBrains Mono.
- **Track:** 8px height, `var(--gt-border)` background, full radius.
- **Fill:** Gradient `linear-gradient(90deg, #2563eb, #7c3aed)`, full radius, width transitions with 0.4s ease.
- **Cancel:** Text link, muted color, underline, appears after 5 seconds.

### 9.4 Accessibility

- `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Phase label should be updated in an `aria-live="polite"` region.

### 9.5 JS Component

```javascript
const progress = GT.createProgress({ id: 'progress' });
```

---

## 10. Results Panel

### 10.1 HTML Structure

```html
<div class="gt-results show" id="results" aria-live="polite">
  <div class="gt-results-icon success">
    <svg><!-- checkmark --></svg>
  </div>
  <h3>Compression complete</h3>
  <p class="gt-results-sub">Your PDF has been optimized successfully.</p>
  <div class="gt-stats">
    <div class="gt-stat">
      <div class="gt-stat-label">Original Size</div>
      <div class="gt-stat-value">5.2 MB</div>
    </div>
    <div class="gt-stat">
      <div class="gt-stat-label">Compressed Size</div>
      <div class="gt-stat-value">1.8 MB</div>
    </div>
    <div class="gt-stat reduction">
      <div class="gt-stat-label">Size Reduction</div>
      <div class="gt-stat-value">65%</div>
    </div>
  </div>
  <div class="gt-results-actions">
    <button class="gt-btn gt-btn-primary gt-btn-xl" id="download-btn">
      <svg><!-- download icon --></svg>
      Download PDF
    </button>
    <button class="gt-btn gt-btn-outline gt-btn-xl" id="reset-btn">
      <svg><!-- reset icon --></svg>
      Compress another
    </button>
  </div>
</div>
```

### 10.2 Icon Variants

| Variant | Class | Background | Icon Color |
|---------|-------|------------|------------|
| Success | `.gt-results-icon.success` | `var(--gt-success-bg)` | `var(--gt-success)` |
| Warning | `.gt-results-icon.warning` | `var(--gt-warning-bg)` | `var(--gt-warning)` |
| Error | `.gt-results-icon.error` | `var(--gt-error-bg)` | `var(--gt-error)` |

### 10.3 Properties

- Default `display: none`. Add `.show` to display as centered block.
- Padding: `var(--gt-space-8) var(--gt-space-5)`.
- Icon: 80px circle (64px mobile), SVG is 40px (32px mobile), stroke-width 2.5.

### 10.4 JS Component

```javascript
const results = GT.createResultPanel({
  icon: { type: 'success', svg: '<svg>...</svg>' },
  heading: 'Compression complete',
  sub: 'Your PDF has been optimized successfully.',
  stats: [
    { label: 'Original Size', value: '5.2 MB' },
    { label: 'Compressed Size', value: '1.8 MB' },
    { label: 'Size Reduction', value: '65%', className: 'reduction' }
  ],
  actions: [
    { id: 'download-btn', label: 'Download PDF', primary: true, icon: '<svg>...</svg>' },
    { id: 'reset-btn', label: 'Compress another', icon: '<svg>...</svg>' }
  ]
});
```

---

## 11. Stats Grid

### 11.1 HTML Structure

```html
<div class="gt-stats">
  <div class="gt-stat">
    <div class="gt-stat-label">Original Size</div>
    <div class="gt-stat-value">5.2 MB</div>
  </div>
  <div class="gt-stat">
    <div class="gt-stat-label">Compressed Size</div>
    <div class="gt-stat-value">1.8 MB</div>
  </div>
  <div class="gt-stat reduction">
    <div class="gt-stat-label">Size Reduction</div>
    <div class="gt-stat-value">65%</div>
  </div>
</div>
```

### 11.2 Properties

- CSS Grid: `repeat(3, 1fr)` (desktop), `1fr` (mobile at 768px).
- Gap: `var(--gt-space-3)`.
- Each stat: padding `var(--gt-space-4)`, surface background, 1px border, `var(--gt-radius-xl)`.
- Stat label: `--gt-text-xs`, semibold, uppercase, letter-spacing 0.5px, muted color.
- Stat value: `--gt-text-xl`, bold, JetBrains Mono.

### 11.3 Reduction Variant

- `.gt-stat.reduction .gt-stat-value` uses `var(--gt-success)` color to highlight positive outcomes.

### 11.4 JS Component

```javascript
const stats = GT.createStats({
  stats: [
    { label: 'Original Size', value: '5.2 MB' },
    { label: 'Compressed Size', value: '1.8 MB' },
    { label: 'Size Reduction', value: '65%', className: 'reduction' }
  ]
});
```

---

## 12. Status Badges

### 12.1 HTML Structure

```html
<span class="gt-badge gt-badge-ready">Ready</span>
```

### 12.2 Variants

| Class | State | Background | Text | Dot Color | Dot Animation |
|-------|-------|------------|------|-----------|---------------|
| `.gt-badge-ready` | Ready | `--gt-success-bg` | `--gt-success-text` | `--gt-success` | None |
| `.gt-badge-processing` | Processing | `--gt-warning-bg` | `--gt-warning-text` | `--gt-warning` | Pulse (1s infinite) |
| `.gt-badge-done` | Done | `--gt-success-bg` | `--gt-success-text` | `--gt-success` | None |
| `.gt-badge-error` | Error | `--gt-error-bg` | `--gt-error-text` | `--gt-error` | None |

### 12.3 Properties

- `display: inline-flex`, centered items, 5px gap.
- Padding: `var(--gt-space-1)` / `var(--gt-space-3)`.
- `border-radius: var(--gt-radius-full)`.
- Font: 11px, semibold, uppercase, letter-spacing 0.3px.
- `::before` pseudo-element creates the 6px status dot.
- Processing dot uses `gt-pulse` animation.

---

## 13. Toast Notifications

### 13.1 HTML Structure (Generated by JS)

```html
<div class="gt-toast info show" role="alert">Message text</div>
```

### 13.2 Variants

| Class | Background | Text | Duration |
|-------|------------|------|----------|
| `.gt-toast.info` | `var(--gt-primary)` | white | 3500ms |
| `.gt-toast.success` | `#10b981` | white | 3500ms |
| `.gt-toast.error` | `#ef4444` | white | 5000ms |

### 13.3 Properties

- Fixed position: top `var(--gt-space-4)`, right `var(--gt-space-4)`.
- On mobile (480px): left and right `var(--gt-space-4)`.
- `z-index: var(--gt-z-toast)` (500).
- Slide-in from right via `translateX(400px)` → `translateX(0)`.
- Border-radius: `var(--gt-radius-md)`.

### 13.4 Usage

```javascript
GT.toast('File compressed successfully', 'success');
GT.toast('Invalid file format', 'error');
GT.toast('Processing...', 'info');
```

Only one toast exists at a time; creating a new toast removes the previous one.

---

## 14. Warning Box

### 14.1 HTML Structure

```html
<div class="gt-warning-box show" aria-label="Tool limitations">
  <div class="gt-warning-header">
    <svg><!-- triangle warning icon --></svg>
    <h4>What this tool does not do</h4>
  </div>
  <ul>
    <li>Image compression is not performed.</li>
    <li>Encrypted files cannot be processed.</li>
  </ul>
</div>
```

### 14.2 Properties

- Default `display: none`. Add `.show` to display.
- Background: `var(--gt-warning-bg)`.
- Border: 1px `var(--gt-warning-border)`.
- `border-radius: var(--gt-radius-xl)`.
- Header: flex row, warning icon (16px), semibold heading.
- List: 13px font, `#a16207` color, 1.6 line height.

### 14.3 JS Component

```javascript
const warning = GT.createWarningBox({
  title: 'What this tool does not do',
  items: [
    'Image compression is not performed.',
    'Encrypted files cannot be processed.'
  ]
});
```

---

## 15. Related Tools

### 15.1 HTML Structure

```html
<section class="gt-related content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>Related Tools</h2>
    <p>You might also need...</p>
  </div>
  <div class="gt-related-grid">
    <a href="./pdf-merger.html" class="gt-related-card">
      <div class="rc-icon"><svg><!-- icon --></svg></div>
      <h4>PDF Merger</h4>
      <p>Combine multiple PDFs into a single document.</p>
      <span class="rc-link">
        Use tool
        <svg><!-- arrow icon --></svg>
      </span>
    </a>
    <!-- More cards -->
  </div>
</section>
```

### 15.2 Properties

- Max-width: `var(--gt-container)` (900px), centered.
- Grid: `repeat(4, 1fr)` (desktop), `repeat(2, 1fr)` (1024px), `1fr` (768px).
- Card: white background, 1px border, `var(--gt-radius-lg)`, flex column.
- Hover: blue border, primary shadow, lifts 3px.
- Icon: 32px, primary color, scales 1.1 on card hover.
- Link: primary color, gap animates on card hover.

### 15.3 JS Component

```javascript
const related = GT.createRelatedTools({
  tools: [
    {
      url: './pdf-merger.html',
      name: 'PDF Merger',
      desc: 'Combine multiple PDFs into a single document.',
      icon: '<svg>...</svg>'
    }
  ]
});
```

---

## 16. How It Works

### 16.1 HTML Structure

```html
<section class="gt-how content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>How It Works</h2>
  </div>
  <div class="gt-steps-grid">
    <div class="gt-step-card">
      <div class="gt-step-num">1</div>
      <h4>Upload your file</h4>
      <p>Drag and drop or select from your device.</p>
    </div>
    <!-- More steps -->
  </div>
</section>
```

### 16.2 Properties

- Grid: `repeat(3, 1fr)` (desktop), `1fr` (768px).
- Step card: white background, 1px border, `var(--gt-radius-lg)`, centered text, padding `var(--gt-space-6)`.
- Step number: 40px circle, `#eff6ff` background, primary blue text, bold.
- Hover: blue-tinted border, step number bg darkens to `#dbeafe`.

### 16.3 JS Component

```javascript
const howItWorks = GT.createHowItWorks({
  steps: [
    { title: 'Upload your file', desc: 'Drag and drop or select from your device.' },
    { title: 'Choose settings', desc: 'Pick a preset or customize options.' },
    { title: 'Download', desc: 'Get your result instantly.' }
  ]
});
```

---

## 17. FAQ Section

### 17.1 HTML Structure

```html
<section class="gt-faq content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>Frequently Asked Questions</h2>
  </div>
  <div class="gt-faq-grid">
    <div class="gt-faq-card">
      <h4>Is my file safe?</h4>
      <p>Yes. All processing happens in your browser. Your file never leaves your device.</p>
    </div>
    <!-- More cards -->
  </div>
</section>
```

### 17.2 Properties

- Grid: `repeat(3, 1fr)` (desktop), `repeat(2, 1fr)` (1024px), `1fr` (768px).
- Card: white background, 1px border, `var(--gt-radius-lg)`, padding `var(--gt-space-5)`.
- Hover: border darkens to `--gt-border-hover`.
- Question: `--gt-text-sm`, semibold.
- Answer: `--gt-text-xs`, secondary color, relaxed line height.

### 17.3 JS Component

```javascript
const faq = GT.createFAQ({
  items: [
    { q: 'Is my file safe?', a: 'Yes. All processing happens in your browser.' },
    { q: 'Is it free?', a: 'Yes. No account, no limits, no payment.' }
  ]
});
```

---

## 18. Section Components

### 18.1 Section Heading

```html
<div class="gt-section-heading">
  <h2>Section Title</h2>
  <p>Optional subtitle</p>
</div>
```

- Centered text, `margin-bottom: var(--gt-space-8)`.
- H2: 28.8px, bold.
- Subtitle: `--gt-text-sm`, secondary color.

### 18.2 Content Section

```html
<section class="content-section">
  <!-- section content -->
</section>
```

- `margin-bottom: var(--gt-space-12)`.

---

## 19. Animations

### 19.1 Keyframes

| Name | From | To |
|------|------|----|
| `gt-fade-in` | `opacity:0; transform:translateY(8px)` | `opacity:1; transform:translateY(0)` |
| `gt-scale-in` | `opacity:0; transform:scale(.95)` | `opacity:1; transform:scale(1)` |
| `gt-slide-up` | `opacity:0; transform:translateY(16px)` | `opacity:1; transform:translateY(0)` |
| `gt-spin` | `rotate(0)` | `rotate(360deg)` |
| `gt-pulse` | `opacity:1` | `opacity:.4` (at 50%) |

### 19.2 Utility Classes

| Class | Animation |
|-------|-----------|
| `.gt-animate-fade` | `gt-fade-in` 250ms ease both |
| `.gt-animate-scale` | `gt-scale-in` 250ms ease both |
| `.gt-animate-slide-up` | `gt-slide-up` 300ms ease both |

### 19.3 Reduced Motion

All animations and transitions are disabled when `prefers-reduced-motion: reduce` is active. Duration set to 0.01ms.

---

## 20. Accessibility Checklist

All components must meet:

- [x] **Focus-visible** on all interactive elements: `outline: 2px solid var(--gt-primary); outline-offset: 2px`
- [x] **Minimum touch target:** 44px height on all buttons and interactive elements
- [x] **ARIA live regions** on status badges, progress bars, and result panels
- [x] **Screen reader text** via `.sr-only` class for icon-only elements
- [x] **Keyboard navigation** on all interactive elements (presets, options, upload zone)
- [x] **Reduced motion** — all animations and transitions disabled
- [x] **High contrast** — `forced-colors: active` support on buttons and badges
- [x] **Skip link** — `.gt-skip` links to main content, visible on focus
- [x] **Color contrast** — all text meets WCAG AA against its background
- [x] **Semantic HTML** — native buttons, labels, headings, landmarks
