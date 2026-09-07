# GoToolly Development Guide

**Design System Version:** 2.0

---

## 1. Project Architecture

### 1.1 File Structure

```
gotoolly-cpu.github.io/
├── assets/
│   ├── css/
│   │   ├── base.css              # Legacy design tokens (--color-*, --space-*)
│   │   ├── components.css        # Legacy components (.btn, .card, .alert)
│   │   ├── design-system.css     # v2.0 tokens (--gt-*) + components (.gt-*)
│   │   ├── layout.css            # Site layout (header, footer, containers)
│   │   ├── tools.css             # Tool-specific styles (panels, text areas)
│   │   ├── styles.min.css        # Combined production CSS
│   │   ├── home.css              # Homepage styles
│   │   ├── home.min.css          # Minified homepage CSS
│   │   └── font-awesome.all.min.css  # Icon library
│   ├── js/
│   │   ├── main.js               # Shared: navbar, mobile menu, scroll
│   │   ├── main.min.js           # Minified
│   │   ├── gt-components.js      # GT Component API (toast, upload, etc.)
│   │   ├── pdf-utils.js          # PDF processing utilities
│   │   ├── search-utils.js       # Search functionality
│   │   ├── tools/
│   │   │   ├── tool-name.js      # Tool-specific logic (source)
│   │   │   └── tool-name.min.js  # Tool-specific logic (minified)
│   │   └── analytics/
│   │       └── ga4.js            # Google Analytics
│   └── vendor/
│       ├── tf.min.js             # TensorFlow.js
│       └── body-pix.min.js       # Body segmentation
├── tools/
│   ├── tool-name.html            # Tool page
│   └── category/
│       └── index.html            # Category listing
├── guides/
│   └── tool-name.html            # Guide page for tool
├── index.html                    # Homepage
├── 404.html                      # Error page
├── sw.js                         # Service worker
├── site.webmanifest              # PWA manifest
├── sitemap.xml                   # XML sitemap
├── robots.txt                    # Robots directives
└── docs/
    ├── DESIGN_SYSTEM.md          # This document
    ├── COMPONENTS.md
    ├── TOOL_TEMPLATE.md
    └── DEVELOPMENT_GUIDE.md
```

### 1.2 CSS Layers (Load Order)

1. `base.css` — Reset, base tokens, typography defaults
2. `layout.css` — Header, footer, containers, grids
3. `components.css` — Reusable UI components
4. `tools.css` — Tool-specific styles and premium panel styles
5. `design-system.css` — v2.0 token system and component classes
6. Inline `<style>` — Tool-specific overrides only

**Production:** All CSS is bundled into `styles.min.css`.

### 1.3 JS Organization

- **Shared utilities** (`main.js`): Navbar toggle, mobile menu, scroll behavior, year updater.
- **Component API** (`gt-components.js`): Factory functions for UI components (`GT.toast`, `GT.createUploadZone`, etc.).
- **Tool scripts** (`tools/tool-name.js`): Each tool has its own script file. No shared tool logic.
- **Libraries** (`vendor/`): Third-party libraries loaded only when needed (e.g., TensorFlow for background removal).

---

## 2. How to Create a New Tool

### 2.1 Step-by-Step

1. **Copy the template.** Start from `tools/pdf-compressor.html`.

2. **Create the HTML file.** Save as `tools/your-tool-name.html`.

3. **Update the `<head>` section:**
   - Title: `Tool Name - Action | GoToolly`
   - Meta description: 120-160 chars, includes primary keyword
   - Meta keywords: 5-10 relevant terms
   - Canonical URL: `https://gotoolly.com/tools/your-tool-name`
   - OG and Twitter meta tags
   - Structured data: WebApplication, BreadcrumbList, FAQPage

4. **Update the Hero:**
   - H1: Action verb + gradient outcome phrase
   - Subtitle: One sentence, specific capabilities
   - Trust badges: Keep the standard three

5. **Update the Tool Card:**
   - Card Header: New icon, new H2
   - Upload Zone: Correct `accept` attribute, label, subtext
   - Settings Panel: Add/remove settings cards for your tool's options
   - Action Bar: Correct button labels and icons
   - Limitations Box: Honest, specific limitations

6. **Update content sections:**
   - Related Tools: 3-4 contextually related tools
   - How It Works: 3 steps specific to your tool
   - FAQ: 4-6 questions and answers

7. **Create the tool script.** Create `assets/js/tools/your-tool-name.js`:

```javascript
/* ============================================
   TOOL NAME — Tool Script
   ============================================ */
(function() {
  'use strict';

  // DOM references
  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drop-zone');
  const uploadZone = document.getElementById('upload-zone');
  const fileInfo = document.getElementById('file-info');
  const settingsPanel = document.getElementById('settings-panel');
  const progressBar = document.getElementById('progress');
  const resultsPanel = document.getElementById('results');
  const actionBtn = document.getElementById('action-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusBadge = document.getElementById('status-badge');

  let currentFile = null;

  // File handling
  function handleFile(file) {
    currentFile = file;
    uploadZone.style.display = 'none';
    fileInfo.classList.add('show');
    settingsPanel.classList.add('show');
    actionBtn.disabled = false;
    // Update file info, badge, etc.
  }

  // Event listeners
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    uploadZone.style.display = '';
    fileInfo.classList.remove('show');
    settingsPanel.classList.remove('show');
    progressBar.classList.remove('show');
    resultsPanel.classList.remove('show');
    actionBtn.disabled = true;
    // Reset badge, etc.
  });

  // Action
  actionBtn.addEventListener('click', () => {
    if (!currentFile) return;
    // Show progress, process, show results
  });
})();
```

8. **Create the minified version.** Use a minifier or build step.

9. **Add the script to HTML:**
```html
<script defer src="../assets/js/tools/your-tool-name.min.js"></script>
```

10. **Test** using the checklist below.

### 2.2 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| HTML file | kebab-case | `pdf-compressor.html` |
| JS source | kebab-case | `pdf-compressor.js` |
| JS minified | kebab-case + `.min` | `pdf-compressor.min.js` |
| CSS classes | `gt-` prefix + kebab-case | `gt-tool-card`, `gt-upload-area` |
| IDs | kebab-case | `file-input`, `progress-fill` |
| CSS variables | `--gt-` prefix | `--gt-primary`, `--gt-space-4` |

---

## 3. How to Migrate an Existing Tool

### 3.1 Migration Checklist

1. **Audit current HTML.** Identify which sections use legacy classes vs. design system classes.

2. **Update CSS includes.** Ensure `styles.min.css` (which includes `design-system.css`) is loaded.

3. **Replace legacy class names.** Map old classes to new `gt-*` classes:

| Legacy Class | New Class |
|-------------|-----------|
| `.tool-card` | `.gt-tool-card` |
| `.card-header` | `.gt-card-header` |
| `.card-header-left` | `.gt-card-header-left` |
| `.card-divider` | `.gt-card-divider` |
| `.upload-area` | `.gt-upload-area` |
| `.upload-icon-wrap` | `.gt-upload-icon` |
| `.upload-subtext` | `.gt-upload-sub` |
| `.upload-btn` | `.gt-upload-btn` |
| `.file-info` | `.gt-file-info` |
| `.file-icon-wrap` | `.gt-file-icon` |
| `.file-details` | `.gt-file-details` |
| `.file-name` | `.gt-file-name` |
| `.file-meta` | `.gt-file-meta` |
| `.file-info-status` | `.gt-file-status` |
| `.file-remove` | `.gt-file-remove` |
| `.settings-panel` | `.gt-settings-panel` |
| `.settings-card` | `.gt-settings-card` |
| `.settings-card-header` | `.gt-settings-card-header` |
| `.settings-card-body` | `.gt-settings-card-body` |
| `.preset-grid` | `.gt-preset-grid` |
| `.preset-btn` | `.gt-preset-btn` |
| `.preset-name` | `.gt-preset-name` |
| `.preset-desc` | `.gt-preset-desc` |
| `.options-group` | `.gt-options-group` |
| `.option-row` | `.gt-option-card` |
| `.progress-section` | `.gt-progress` |
| `.progress-spinner` | `.gt-progress-spinner` |
| `.progress-phase` | `.gt-progress-phase` |
| `.progress-pct` | `.gt-progress-pct` |
| `.progress-track` | `.gt-progress-track` |
| `.progress-fill` | `.gt-progress-fill` |
| `.progress-cancel` | `.gt-progress-cancel` |
| `.results-panel` | `.gt-results` |
| `.result-icon-wrap` | `.gt-results-icon` |
| `.stats-card` | `.gt-stats` |
| `.stat-box` | `.gt-stat` |
| `.results-actions` | `.gt-results-actions` |
| `.limitations-box` | `.gt-warning-box` |
| `.related-section` | `.gt-related` |
| `.related-grid` | `.gt-related-grid` |
| `.related-card` | `.gt-related-card` |
| `.how-section` | `.gt-how` |
| `.steps-grid` | `.gt-steps-grid` |
| `.step-card` | `.gt-step-card` |
| `.step-num` | `.gt-step-num` |
| `.faq-section` | `.gt-faq` |
| `.faq-grid` | `.gt-faq-grid` |
| `.faq-card` | `.gt-faq-card` |
| `.section-heading` | `.gt-section-heading` |
| `.toast` | `.gt-toast` |
| `.status-badge` | `.gt-badge` |
| `.btn-primary` (tool card) | `.gt-btn gt-btn-primary` |
| `.btn-secondary` (tool card) | `.gt-btn gt-btn-outline` |
| `.action-bar` | `.gt-btn-group` |

4. **Replace inline styles.** Swap hardcoded values for token references:
   - `color: #2563eb` → `color: var(--gt-primary)`
   - `padding: 16px` → `padding: var(--gt-space-4)`
   - `border-radius: 12px` → `border-radius: var(--gt-radius-xl)`
   - `font-size: 14px` → `font-size: var(--gt-text-sm)`
   - `box-shadow: 0 1px 3px ...` → `box-shadow: var(--gt-shadow-sm)`

5. **Update JS selectors.** Update any JS that references old class names or IDs.

6. **Test responsive behavior.** Verify at 1024px, 768px, and 480px.

7. **Test dark mode.** Verify all components render correctly in dark mode.

8. **Test accessibility.** Run the accessibility checklist.

---

## 4. CSS Conventions

### 4.1 Token Usage

**Always** use design tokens. Never hardcode values.

```css
/* Correct */
.gt-card {
  background: var(--gt-bg);
  border: 1px solid var(--gt-border);
  border-radius: var(--gt-radius-2xl);
}

/* Wrong */
.gt-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}
```

**Exceptions:**
- Gradient values that are not tokens (e.g., `linear-gradient(135deg, #2563eb, #7c3aed)`).
- Hardcoded colors in dark mode component overrides (since the semantic tokens already handle dark mode).
- Inline styles in HTML for one-off layout adjustments (use sparingly).

### 4.2 Naming Convention

- All new component classes use the `gt-` prefix.
- Use kebab-case: `gt-settings-card`, not `gtSettingsCard`.
- State classes: `.show` to reveal, `.hidden` to hide, `.active` for selected.
- Modifier classes: `.gt-btn-primary`, `.gt-badge-processing`, `.gt-results-icon.success`.

### 4.3 Specificity

- Keep specificity low. Use single class selectors.
- Avoid ID selectors for styling (use IDs only for JS hooks and `href` targets).
- Avoid `!important` except in mobile overrides and reduced-motion media query.
- Avoid nesting more than 2 levels deep.

### 4.4 Dark Mode

- Semantic tokens (`--gt-bg`, `--gt-surface`, `--gt-text`, `--gt-border`) automatically switch in dark mode.
- For component-specific dark mode needs, add overrides inside `@media (prefers-color-scheme: dark)`.
- Never hardcode light-mode-only colors in new components.

### 4.5 Responsive Breakpoints

| Breakpoint | Target |
|-----------|--------|
| 1024px | Tablet landscape, small desktop |
| 768px | Tablet portrait, large phone |
| 480px | Small phone |

Use `max-width` media queries (mobile-last approach):

```css
/* Desktop first */
.gt-related-grid {
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 1024px) {
  .gt-related-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .gt-related-grid { grid-template-columns: 1fr; }
}
```

---

## 5. JS Conventions

### 5.1 Component API Usage

Use the `GT` global API for creating components dynamically:

```javascript
// Toast
GT.toast('Success message', 'success');

// File size formatting
const size = GT.formatSize(bytes); // "2.4 MB"

// Create components programmatically
const zone = GT.createUploadZone({ ... });
const info = GT.createFileInfo({ ... });
const grid = GT.createPresetGrid({ ... });
const option = GT.createOptionCard({ ... });
const progress = GT.createProgress({ ... });
const stats = GT.createStats({ ... });
const results = GT.createResultPanel({ ... });
const warning = GT.createWarningBox({ ... });
const related = GT.createRelatedTools({ ... });
const howItWorks = GT.createHowItWorks({ ... });
const faq = GT.createFAQ({ ... });
const settingsCard = GT.createSettingsCard({ ... });
const panel = GT.createSettingsPanel({ ... });
```

### 5.2 Event Handling

- Use `addEventListener` (never inline `onclick`).
- Use `requestAnimationFrame` for animations.
- Use event delegation for dynamically created elements.
- Always `preventDefault()` on dragover/drop events.

### 5.3 File Operations

- All file processing is client-side only.
- Use `FileReader` for reading files.
- Use `URL.createObjectURL()` for download links.
- Always clean up object URLs with `URL.revokeObjectURL()` after download.

### 5.4 Error Handling

- Wrap async operations in try/catch.
- Show user-friendly errors via `GT.toast(message, 'error')`.
- Never expose raw error messages to users.
- Log errors to console for debugging.

### 5.5 Progress Updates

Update progress bar via DOM manipulation:

```javascript
function updateProgress(pct, phase) {
  const fill = document.getElementById('progress-fill');
  const pctEl = document.getElementById('progress-pct');
  const phaseEl = document.getElementById('progress-phase');
  const bar = document.getElementById('progress');

  fill.style.width = pct + '%';
  pctEl.textContent = pct + '%';
  phaseEl.textContent = phase;
  bar.setAttribute('aria-valuenow', pct);
}
```

### 5.6 State Management

Each tool manages its own state through DOM class toggling:

```javascript
// Show/hide sections
uploadZone.style.display = 'none';
fileInfo.classList.add('show');
settingsPanel.classList.add('show');
progressBar.classList.add('show');
resultsPanel.classList.add('show');

// Status badge
statusBadge.className = 'gt-badge gt-badge-ready';
statusBadge.textContent = 'Ready';

// Button states
actionBtn.disabled = false;
actionBtn.textContent = 'Compress';
```

---

## 6. Testing Checklist

### 6.1 Visual Testing

- [ ] Desktop layout matches reference (PDF Compressor)
- [ ] Tablet layout (1024px): grids collapse correctly
- [ ] Mobile layout (768px): single column, proper padding
- [ ] Small phone layout (480px): no horizontal scroll, proper spacing
- [ ] Dark mode: all components render correctly
- [ ] High contrast mode: borders visible, text readable

### 6.2 Functional Testing

- [ ] File upload via click works
- [ ] File upload via drag-and-drop works
- [ ] File info bar displays correct name, size, and metadata
- [ ] Remove file button works
- [ ] Settings panel shows/hides based on state
- [ ] Preset selection works (click, keyboard)
- [ ] Option checkboxes toggle correctly
- [ ] Primary action button enables/disables correctly
- [ ] Progress bar animates smoothly
- [ ] Cancel button works during processing
- [ ] Results panel shows with correct stats
- [ ] Download button triggers file download
- [ ] Reset button returns to initial state
- [ ] Toast notifications appear and dismiss

### 6.3 Accessibility Testing

- [ ] Skip link works and is visible on focus
- [ ] Tab order is logical (skip → nav → upload → settings → action)
- [ ] All interactive elements have visible focus rings
- [ ] Upload zone is keyboard activatable
- [ ] Preset grid is keyboard navigable (arrow keys)
- [ ] Screen reader announces status changes (badge, progress, results)
- [ ] All images have alt text (or `alt=""` for decorative)
- [ ] No color-only information (always paired with text/icon)
- [ ] Reduced motion: no animations play
- [ ] Touch targets are ≥ 44px

### 6.4 SEO Testing

- [ ] Title tag is correct format
- [ ] Meta description is 120-160 chars
- [ ] Canonical URL is correct
- [ ] OG tags are complete
- [ ] Twitter card tags are complete
- [ ] Structured data validates (Google Rich Results Test)
- [ ] FAQ structured data matches visible FAQ content
- [ ] Breadcrumb structured data matches page hierarchy
- [ ] Sitemap includes the new tool URL
- [ ] Robots.txt allows crawling

### 6.5 Performance Testing

- [ ] Page loads in < 3 seconds on 3G
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Total bundle size < 200KB (CSS + JS, gzipped)
- [ ] Images are optimized (WebP where possible)
- [ ] Fonts use `display=optional` or `swap`
- [ ] Scripts use `defer`
- [ ] No render-blocking resources

---

## 7. Performance Guidelines

### 7.1 CSS

- Use `styles.min.css` (bundled production CSS).
- Avoid adding new CSS files; add to existing files.
- Use design tokens instead of computed values.
- Avoid complex selectors (keep specificity low).
- Use `contain: layout style` on repeated elements (logo, icons).

### 7.2 JavaScript

- Use `defer` on all scripts.
- Minify all production JS (`.min.js` files).
- Lazy-load heavy libraries (TensorFlow, pdf-lib) only when needed.
- Avoid unnecessary DOM queries; cache references.
- Use `requestAnimationFrame` for visual updates.
- Debounce scroll and resize handlers.

### 7.3 Images

- Use SVG for icons (inline or sprite).
- Use WebP format for raster images where possible.
- Set explicit `width` and `height` on `<img>` to prevent layout shift.
- Use `loading="lazy"` on below-the-fold images.

### 7.4 Fonts

- Use `display=optional` or `media="print" onload` pattern.
- Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`.
- Limit font weights: only load 400, 500, 600, 700, 800.
- Use system font stack fallback.

### 7.5 Caching

- Service worker (`sw.js`) caches static assets.
- Set long cache headers for minified CSS/JS.
- Use content hashing in filenames for cache busting.

---

## 8. Responsive Testing

### 8.1 Breakpoint Targets

| Viewport | Width | Grid Behavior |
|----------|-------|---------------|
| Desktop | > 1024px | 4-column related grid, 3-column FAQ, 3-column presets, 3-column stats, side-by-side buttons |
| Tablet | 768px–1024px | 2-column related grid, 2-column FAQ, single-column presets/stats/buttons |
| Mobile | < 768px | 1-column everything, reduced padding, stacked buttons, smaller icons |
| Small phone | < 480px | Tighter gaps, smaller stat values, toast spans full width |

### 8.2 Test Devices

- iPhone SE (375px)
- iPhone 14 (390px)
- iPad (768px)
- iPad Pro (1024px)
- Desktop Chrome (1280px+)
- Desktop Firefox (1280px+)

### 8.3 Common Mobile Issues

- **Horizontal scroll:** Ensure no element exceeds viewport width. Test with `overflow-x: hidden` on `html, body` at small viewports.
- **Touch targets:** All buttons ≥ 44px. Use `min-height: var(--gt-touch-target)`.
- **Font size:** Body text ≥ 16px to prevent iOS zoom on input focus.
- **Sticky header:** Ensure header doesn't overlap content. Use `scroll-margin-top` on anchored elements.

---

## 9. Browser Support

### 9.1 Supported Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 80+ | Full support |
| Firefox | 78+ | Full support |
| Safari | 14+ | Full support (test `-webkit-` prefixes) |
| Edge | 80+ | Full support (Chromium-based) |
| Samsung Internet | 13+ | Full support |
| Opera | 67+ | Full support |

### 9.2 Not Supported

- Internet Explorer (any version)
- Chrome < 80
- Safari < 14
- Firefox < 78

### 9.3 CSS Compatibility

- CSS Custom Properties: supported in all target browsers.
- `@media (prefers-color-scheme: dark)`: supported in all target browsers.
- `@media (prefers-reduced-motion: reduce)`: supported in all target browsers.
- `@media (forced-colors: active)`: supported in Chromium and Firefox.
- `:has()` selector: used in option card checked state. Supported in Chrome 105+, Firefox 121+, Safari 15.4+. Provide fallback styling for older browsers.
- `gap` in flexbox: supported in all target browsers.
- CSS Grid: supported in all target browsers.

### 9.4 JS Compatibility

- `const`/`let`: supported in all target browsers.
- Arrow functions: supported in all target browsers.
- Template literals: supported in all target browsers.
- `Promise`: supported in all target browsers.
- `Array.from`: supported in all target browsers.
- `AbortController`: supported in all target browsers.
- `requestAnimationFrame`: supported in all target browsers.

No transpilation (Babel) or polyfills are required for target browsers.
