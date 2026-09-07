# GoToolly Master Tool Template

**Reference Implementation:** PDF Compressor (`/tools/pdf-compressor.html`)

---

## 1. Template Overview

Every GoToolly tool page follows a single master template structure. This document defines the page flow, required sections, HTML skeleton, CSS/JS includes, SEO requirements, and accessibility checklist.

### 1.1 Design Principles

1. **One purpose per page.** Every element supports the single task.
2. **Progressive disclosure.** Show the minimum viable interface; reveal complexity only after commitment.
3. **Trust through restraint.** No upsells, no popups, no data collection, no marketing language.
4. **Consistency is the brand.** Every tool page must feel identical in structure, interaction, and visual language.
5. **Client-side only.** All processing happens in the browser; no data leaves the user's device.

---

## 2. Page Flow

Every tool page follows this exact section order:

```
 1. <!DOCTYPE html> / <html lang="en">
 2. <head>
 3. <body>
 4.   Skip Link
 5.   Navbar (Header)
 6.   <main id="main-content">
 7.     Hero Section
 8.     Tool Workspace (Container > Tool Workspace > Tool Card)
 9.       Card Header
10.       Workspace Body
11.         Upload Zone
12.         File Info Bar
13.         Settings Panel
14.         Progress Bar
15.         Results Panel
16.       Action Bar
17.       Limitations Box
18.     Related Tools Section
19.     How It Works Section
20.     FAQ Section
21.   </main>
22.   Footer
23.   Scripts
24. </body>
25. </html>
```

### 2.1 Section Purpose Summary

| # | Section | Purpose | Always Present? |
|---|---------|---------|-----------------|
| 1 | Skip Link | Accessibility: keyboard users skip nav | Yes |
| 2 | Navbar | Brand anchor, navigation | Yes |
| 3 | Hero | Context, trust, outcome headline | Yes |
| 4 | Tool Card | The entire interactive workspace | Yes |
| 5 | Card Header | Tool identity + status badge | Yes |
| 6 | Upload Zone | File entry point | Yes |
| 7 | File Info Bar | Confirmation of file selection | Yes (shown after upload) |
| 8 | Settings Panel | Configuration options | Yes (shown after upload) |
| 9 | Progress Bar | Processing feedback | Yes (shown during processing) |
| 10 | Results Panel | Success/error output | Yes (shown after processing) |
| 11 | Action Bar | Primary + secondary actions | Yes |
| 12 | Limitations Box | Honest disclosure of tool limits | Yes (shown after upload) |
| 13 | Related Tools | Contextual discovery | Yes |
| 14 | How It Works | Educational steps | Yes |
| 15 | FAQ | Reference, trust, SEO | Yes |
| 16 | Footer | Navigation, legal, social | Yes |

---

## 3. Required Sections

### 3.1 Skip Link (Required)

**Must be the first element in `<body>`.**

```html
<a href="#main-content" class="gt-skip">Skip to main content</a>
```

### 3.2 Navbar (Required)

```html
<header class="site-header">
  <div class="container">
    <div class="header-content">
      <a href="/" class="logo">
        <img src="../assets/images/logo.svg" alt="GoToolly" class="logo-svg">
        <span class="logo-text">GoToolly</span>
      </a>
      <nav class="main-nav">
        <a href="/" class="nav-link">Home</a>
        <a href="/tools" class="nav-link active">Tools</a>
        <a href="/guides" class="nav-link">Guides</a>
        <a href="/about" class="nav-link">About</a>
        <a href="/contact" class="nav-link">Contact</a>
      </nav>
      <button class="mobile-menu-button" aria-label="Toggle navigation menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
    <div class="mobile-menu">
      <nav class="mobile-nav">
        <a href="/" class="nav-link">Home</a>
        <a href="/tools" class="nav-link active">Tools</a>
        <a href="/guides" class="nav-link">Guides</a>
        <a href="/about" class="nav-link">About</a>
        <a href="/contact" class="nav-link">Contact</a>
      </nav>
    </div>
  </div>
</header>
```

**Rules:**
- `active` class on the "Tools" nav link for all tool pages.
- Mobile menu toggle button must be 44x44px minimum.
- Use `aria-label="Toggle navigation menu"` on the hamburger button.

### 3.3 Hero Section (Required)

```html
<section class="hero">
  <div class="container">
    <h1>Tool <span class="gradient-text">outcome phrase</span></h1>
    <p class="hero-subtitle">One sentence describing what the tool does and key capabilities.</p>
    <div class="trust-badges">
      <span class="trust-badge">
        <svg><!-- shield icon --></svg>
        100% Private
      </span>
      <span class="trust-badge">
        <svg><!-- lock icon --></svg>
        Processed locally
      </span>
      <span class="trust-badge">
        <svg><!-- checkmark icon --></svg>
        Free &amp; unlimited
      </span>
    </div>
  </div>
</section>
```

**Rules:**
- H1: action verb + gradient-highlighted outcome (e.g., "Reduce **PDF file size**").
- Subtitle: one sentence, specific capabilities, no marketing language.
- Trust badges: always these three in this order.
- Dark background (`#0f172a`), white text.

### 3.4 Tool Card (Required)

```html
<div class="container">
  <div class="tool-workspace">
    <div class="gt-tool-card" role="region" aria-label="Tool Name workspace">
      <!-- Card Header, Workspace Body, Action Bar, Limitations Box -->
    </div>
  </div>
</div>
```

**Rules:**
- Max-width: 900px (via `.tool-workspace`).
- `role="region"` with descriptive `aria-label`.
- Contains all interactive workspace sections.

### 3.5 Card Header (Required)

```html
<div class="gt-card-header">
  <div class="gt-card-header-left">
    <svg><!-- 18px tool icon --></svg>
    <h2>Action Verb + Tool Name</h2>
  </div>
  <span class="gt-badge" id="status-badge" aria-live="polite"></span>
</div>
<div class="gt-card-divider"></div>
```

**Rules:**
- H2 is the tool action (e.g., "Compress PDF", "Format JSON").
- Badge starts hidden; shows when file is loaded.
- `aria-live="polite"` announces status changes.

### 3.6 Upload Zone (Required)

```html
<div class="gt-upload-area" id="drop-zone" role="button" tabindex="0"
     aria-describedby="upload-subtext">
  <input type="file" id="file-input" accept=".pdf" style="display:none"
         aria-label="Select PDF file">
  <div class="gt-upload-icon">
    <svg><!-- upload arrow icon --></svg>
  </div>
  <h3>Drop your PDF here</h3>
  <p class="gt-upload-sub" id="upload-subtext">
    PDF files up to 50 MB each. Batch processing supported.
  </p>
  <span class="gt-upload-btn">Select PDF files</span>
</div>
```

**Rules:**
- Hidden file input paired with visible label.
- `role="button"`, `tabindex="0"` on the label.
- `aria-describedby` points to subtext.
- `accept` attribute must match supported file types.

### 3.7 Action Bar (Required)

```html
<div class="gt-btn-group" id="action-bar">
  <button class="gt-btn gt-btn-primary gt-btn-xl" id="action-btn" disabled>
    <svg><!-- action icon --></svg>
    Action Label
  </button>
  <button class="gt-btn gt-btn-outline gt-btn-xl" id="reset-btn">
    <svg><!-- reset icon --></svg>
    Reset
  </button>
</div>
```

**Rules:**
- Primary button is disabled until a file is loaded.
- Button labels change based on state (see Section 4).
- Grid layout: 2 columns on desktop, stacked on mobile.

### 3.8 Limitations Box (Required)

```html
<div class="gt-warning-box" id="limitations-box" aria-label="Tool limitations">
  <div class="gt-warning-header">
    <svg><!-- warning triangle --></svg>
    <h4>What this tool does not do</h4>
  </div>
  <ul>
    <li>Limitation 1.</li>
    <li>Limitation 2.</li>
  </ul>
</div>
```

**Rules:**
- Shows after file upload.
- Honest, specific limitations (e.g., "Image compression is not performed").
- Never generic or vague.

### 3.9 Related Tools (Required)

```html
<section class="gt-related content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>Related Tools</h2>
    <p>Contextual intro (e.g., "After compressing a PDF, you might also need...")</p>
  </div>
  <div class="gt-related-grid">
    <a href="./related-tool.html" class="gt-related-card">
      <div class="rc-icon"><svg><!-- icon --></svg></div>
      <h4>Tool Name</h4>
      <p>Brief description.</p>
      <span class="rc-link">Use tool <svg><!-- arrow --></svg></span>
    </a>
    <!-- 3-4 related tools -->
  </div>
</section>
```

**Rules:**
- 4 related tools on desktop, 2 on tablet, 1 on mobile.
- Contextual intro text specific to the tool.
- Cards are `<a>` links, not `<div>`.

### 3.10 How It Works (Required)

```html
<section class="gt-how content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>How It Works</h2>
  </div>
  <div class="gt-steps-grid">
    <div class="gt-step-card">
      <div class="gt-step-num">1</div>
      <h4>Step Title</h4>
      <p>Brief description.</p>
    </div>
    <!-- 3 steps -->
  </div>
</section>
```

**Rules:**
- Exactly 3 steps on most tools.
- Step numbers are auto-generated (1, 2, 3).
- Step titles: action verb phrases.
- Step descriptions: one sentence.

### 3.11 FAQ (Required)

```html
<section class="gt-faq content-section" style="margin-top:48px">
  <div class="gt-section-heading">
    <h2>Frequently Asked Questions</h2>
  </div>
  <div class="gt-faq-grid">
    <div class="gt-faq-card">
      <h4>Question text?</h4>
      <p>Answer text.</p>
    </div>
    <!-- 4-6 FAQ items -->
  </div>
</section>
```

**Rules:**
- 4-6 items in a 3-column grid (2 on tablet, 1 on mobile).
- Questions: short, specific.
- Answers: one to two sentences, factual.
- Include an FAQ structured data `<script>` in `<head>` for SEO.

### 3.12 Footer (Required)

```html
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <!-- Brand section, Popular Tools, Resources, Legal -->
    </div>
    <div class="footer-bottom">
      <div class="copyright">&copy; 2026 GoToolly. All rights reserved.</div>
      <div class="legal-links">
        <a href="/legal/privacy-policy">Privacy</a>
        <a href="/legal/terms-of-service">Terms</a>
        <a href="/legal/disclaimer">Disclaimer</a>
        <a href="/contact">Contact</a>
      </div>
    </div>
  </div>
</footer>
```

**Rules:**
- 4-column grid: Brand + Social, Popular Tools, Resources, Legal.
- Footer always has the same structure across all pages.
- Social links: X/Twitter, Facebook, YouTube, Instagram, TikTok, Reddit.

---

## 4. Optional Sections

### 4.1 Page Exclusion Grid (Optional)

Used by PDF tools for page selection. Hidden by default; shown when Custom preset is selected.

```html
<div class="gt-settings-card hidden" id="pages-card">
  <div class="gt-settings-card-header">
    <h3>Page Exclusion</h3>
  </div>
  <div class="gt-settings-card-body">
    <p style="font-size:12px;color:var(--gt-text-muted);margin:0 0 12px">
      Click pages to exclude them.
    </p>
    <div class="gt-preset-grid" id="pages-grid" role="group"
         aria-label="Page exclusion grid"
         style="grid-template-columns:repeat(6,1fr)">
      <!-- Generated by JS -->
    </div>
  </div>
</div>
```

### 4.2 Batch File Queue (Optional)

Used by tools supporting batch processing.

### 4.3 Advanced Settings Cards (Optional)

Hidden by default; shown only when "Custom" preset is selected.

---

## 5. HTML Document Structure

### 5.1 Complete Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tool Name - Action | GoToolly</title>
    <meta name="description" content="Tool description for search engines.">
    <meta name="keywords" content="keyword1, keyword2, keyword3">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://gotoolly.com/tools/tool-name">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://gotoolly.com/tools/tool-name">
    <meta property="og:title" content="Tool Name - Action | GoToolly">
    <meta property="og:description" content="Tool description.">
    <meta property="og:image" content="https://gotoolly.com/assets/images/logo-512.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:alt" content="GoToolly Logo">
    <meta property="og:site_name" content="GoToolly">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://gotoolly.com/tools/tool-name">
    <meta name="twitter:title" content="Tool Name - Action | GoToolly">
    <meta name="twitter:description" content="Tool description.">
    <meta name="twitter:image" content="https://gotoolly.com/assets/images/logo-512.png">
    <meta name="twitter:image:alt" content="GoToolly Logo">
    <meta name="twitter:creator" content="@GoToolly">

    <!-- Favicon -->
    <link rel="icon" href="../favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="../assets/images/logo-192.png">
    <link rel="manifest" href="../site.webmanifest">

    <!-- Styles -->
    <link rel="stylesheet" href="../assets/css/styles.min.css">
    <link rel="stylesheet" href="../assets/css/font-awesome.all.min.css"
          media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="../assets/css/font-awesome.all.min.css"></noscript>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=optional"
          rel="stylesheet" media="print" onload="this.media='all'">
    <noscript>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=optional"
            rel="stylesheet">
    </noscript>

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Tool Name",
      "url": "https://gotoolly.com/tools/tool-name",
      "description": "Tool description.",
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Any (Web Browser)",
      "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
      "featureList": ["Free to use", "No account required", "Client-side processing", "Privacy-focused"]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://gotoolly.com/"},
        {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://gotoolly.com/tools"},
        {"@type": "ListItem", "position": 3, "name": "Tool Name", "item": "https://gotoolly.com/tools/tool-name"}
      ]
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Question 1?",
          "acceptedAnswer": {"@type": "Answer", "text": "Answer 1."}
        }
      ]
    }
    </script>

    <!-- Tool-specific inline styles -->
    <style>
      /* Tool-specific overrides only. Do not duplicate design system tokens. */
    </style>
</head>
<body>
    <a href="#main-content" class="gt-skip">Skip to main content</a>

    <!-- NAVBAR -->
    <header class="site-header">...</header>

    <main id="main-content">
      <!-- HERO -->
      <section class="hero">...</section>

      <!-- TOOL WORKSPACE -->
      <div class="container">
        <div class="tool-workspace">
          <div class="gt-tool-card" role="region" aria-label="Tool workspace">
            <!-- Card Header -->
            <!-- Workspace Body (upload, file info, settings, progress, results) -->
            <!-- Action Bar -->
            <!-- Limitations Box -->
          </div>
        </div>
      </div>

      <!-- RELATED TOOLS -->
      <section class="gt-related content-section" style="margin-top:48px">...</section>

      <!-- HOW IT WORKS -->
      <section class="gt-how content-section" style="margin-top:48px">...</section>

      <!-- FAQ -->
      <section class="gt-faq content-section" style="margin-top:48px">...</section>
    </main>

    <!-- FOOTER -->
    <footer class="site-footer" role="contentinfo">...</footer>

    <!-- SCRIPTS -->
    <script defer src="../assets/js/main.min.js"></script>
    <script defer src="../assets/js/tools/tool-name.min.js"></script>
    <script>document.getElementById('current-year').textContent = new Date().getFullYear();</script>
</body>
</html>
```

---

## 6. CSS Includes

### 6.1 Required CSS (in order)

| File | Purpose |
|------|---------|
| `assets/css/styles.min.css` | Combined production CSS (base + layout + components + tools + design system) |
| `assets/css/font-awesome.all.min.css` | Icons (loaded async via `media="print"` swap pattern) |

### 6.2 Tool-Specific Inline Styles

Place in `<style>` within `<head>`. Use only for tool-specific layout overrides that are not covered by the design system.

**Rules:**
- Never redefine design system tokens.
- Never hardcode colors, sizes, or spacing that have token equivalents.
- Keep inline styles under 300 lines.

---

## 7. JS Includes

### 7.1 Required Scripts (in order, all `defer`)

| File | Purpose |
|------|---------|
| `assets/js/main.min.js` | Shared: navbar toggle, mobile menu, scroll behavior |
| `assets/js/gt-components.min.js` | GoToolly Component API (if using JS factory functions) |
| `assets/js/pdf-lib.min.js` | PDF processing library (PDF tools only) |
| `assets/js/tools/tool-name.min.js` | Tool-specific logic |

### 7.2 Script Loading Rules

- All scripts use `defer` attribute (never `async`).
- Load order: shared first, libraries second, tool-specific last.
- Never place tool logic in inline `<script>` tags except the year updater.

---

## 8. SEO Requirements

### 8.1 Meta Tags

Every tool page must include:

- `<title>` — format: `Tool Name - Action | GoToolly`
- `<meta name="description">` — 120-160 characters, includes primary keyword
- `<meta name="keywords">` — 5-10 relevant keywords
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical">` — full URL, no trailing slash

### 8.2 Open Graph

- `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:site_name`

### 8.3 Twitter Card

- `twitter:card` (summary_large_image), `twitter:url`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`, `twitter:creator`

### 8.4 Structured Data

Every tool page must include three JSON-LD blocks:

1. **WebApplication** — tool name, URL, description, category, pricing (free).
2. **BreadcrumbList** — Home > Tools > Tool Name.
3. **FAQPage** — all FAQ items as Q&A pairs.

### 8.5 Favicon

- `<link rel="icon" href="../favicon.ico">`
- `<link rel="apple-touch-icon" href="../assets/images/logo-192.png">`
- `<link rel="manifest" href="../site.webmanifest">`

---

## 9. Accessibility Checklist

Every tool page must pass:

- [ ] **Skip link** — first element in `<body>`, visible on focus
- [ ] **Semantic landmarks** — `<header>`, `<main>`, `<footer>`, `<nav>`
- [ ] **Heading hierarchy** — single H1, H2 for sections, H3/H4 for subsections (no skipped levels)
- [ ] **Focus visible** — all interactive elements have `outline: 2px solid var(--gt-primary)` on `:focus-visible`
- [ ] **Touch targets** — all buttons and interactive elements ≥ 44px
- [ ] **ARIA live regions** — status badge, progress bar, results panel use `aria-live="polite"`
- [ ] **File input** — hidden `<input>` paired with visible `<label>`, `aria-label` on input
- [ ] **Upload zone** — `role="button"`, `tabindex="0"`, `aria-describedby` for subtext
- [ ] **Preset grid** — `role="radiogroup"`, each button `role="radio"` with `aria-checked`
- [ ] **Page exclusion grid** — `role="group"`, each chip `role="button"` with `aria-pressed`
- [ ] **Image alt text** — all meaningful images have `alt`; decorative images have `alt=""` or are CSS backgrounds
- [ ] **Color contrast** — all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables all animations
- [ ] **High contrast** — `@media (forced-colors: active)` ensures visibility
- [ ] **Screen reader text** — `.sr-only` class for visually hidden but screen-reader-accessible content
- [ ] **Keyboard operation** — entire tool workflow (upload, configure, action, download, reset) operable via keyboard alone
- [ ] **Error identification** — errors announced via `aria-live` and described with text (not color alone)

---

## 10. Creating a New Tool (Step by Step)

1. **Copy the template.** Duplicate `tools/pdf-compressor.html` as a starting point.
2. **Rename the file.** `tools/your-tool-name.html`.
3. **Update `<head>` meta.** Title, description, keywords, canonical URL, OG tags, Twitter cards.
4. **Update structured data.** WebApplication name/description, BreadcrumbList, FAQPage.
5. **Update the Hero.** New H1 with gradient outcome, new subtitle, same trust badges.
6. **Update the Card Header.** New icon, new H2 action label.
7. **Update the Upload Zone.** Set correct `accept` attribute and subtext.
8. **Update the Settings Panel.** Add/remove settings cards as needed for your tool.
9. **Update the Action Bar.** Set correct action button labels and icons.
10. **Update the Limitations Box.** List honest, specific limitations.
11. **Update Related Tools.** Choose 3-4 contextually related tools.
12. **Update How It Works.** Write 3 steps specific to your tool.
13. **Update FAQ.** Write 4-6 tool-specific questions and answers.
14. **Write tool JS.** Create `assets/js/tools/your-tool-name.js` and `.min.js`.
15. **Add tool-specific styles.** Inline in `<style>` only for tool-specific layout.
16. **Test.** Run the testing checklist (see Development Guide).
17. **Commit.** Follow naming conventions.
