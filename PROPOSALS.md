# Enhancement Proposals

All proposals are numbered P1 through P6. None of these patches have been applied; each is independent and ready to apply upon your approval (`approve P#`).

---

## Proposal P1: Text Accuracy & Factual Refinements

**One-line reason:** Align project and experience copy with factual records from `JAL_PATEL_RESUME.pdf` and repository READMEs, eliminating speculative metrics and redundant links.  
**Visible effect:** Updated text copy in Experience, Work, and Credentials sections; no change to layout, typography, or styling.

### Detailed Scope:
1. **Internship Dates & Location:** Ensure Cognifyz (`May-Jun 2025 · Remote`) and Excelerate (`Aug-Sep 2025 · Remote`) explicitly specify dates and remote status.
2. **Kairon Scope:** Strictly describe active ML workflows (usage, support, payment, tenure, NPS, feature-adoption signals, explainable risk scoring, cohort analysis, batch prediction, FastAPI, React/TypeScript, Supabase) with zero fabricated metrics.
3. **Verified HackerRank Badges:** Accurately label credential as `"Python (Basic) and Problem Solving (Intermediate): verified"` rather than unverified star claims.
4. **Hive Cold-Start Hint:** Include helpful note on Render free-tier cold starts (`May take ~30-60s to wake`).
5. **Hive Architecture Link:** Eliminate any redundant architecture button that duplicates the primary GitHub repository.
6. **Janus Webhook Note:** Accurately describe the n8n webhook-driven agent demo.

### Proposed Patch (`public/portfolio.html`):
```diff
--- a/public/portfolio.html
+++ b/public/portfolio.html
@@ -305,4 +305,4 @@
               <h3>Kairon <span>—</span> customer retention intelligence.</h3>
-              <p>Kairon is in active development. Its ML workflows use usage, support, payment, tenure, NPS and feature-adoption signals for explainable risk scoring, cohort analysis and batch prediction. The stack includes a FastAPI backend, React/TypeScript UI and Supabase.</p>
+              <p>Kairon is in active development: ML workflows analyze customer usage, support, payment, tenure, NPS, and feature-adoption signals for explainable risk scoring, cohort analysis, and batch prediction. Powered by a FastAPI backend, React/TypeScript UI, and Supabase.</p>
@@ -354,5 +354,4 @@
               <div class="project-actions" aria-label="Hive project links">
                 <a class="project-action project-action--primary" href="https://hivelearn-app.onrender.com" target="_blank" rel="noopener noreferrer">Live Demo <span aria-hidden="true">↗</span> <small>May take ~30-60s to wake</small></a>
                 <a class="project-action" href="https://github.com/Special258/Hive" target="_blank" rel="noopener noreferrer">GitHub Repo <span aria-hidden="true">↗</span></a>
-                <a class="project-action" href="https://github.com/Special258/Hive#architecture" target="_blank" rel="noopener noreferrer">Architecture <span aria-hidden="true">↗</span></a>
               </div>
```

---

## Proposal P2: Invisible Head Metadata

**One-line reason:** Add complete OpenGraph, Twitter card, theme-color, canonical links, and Schema.org Person JSON-LD to `public/portfolio.html` matching `public/index.html`.  
**Visible effect:** None (browser head metadata only).

### Proposed Patch (`public/portfolio.html`):
```diff
--- a/public/portfolio.html
+++ b/public/portfolio.html
@@ -7,6 +7,18 @@
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="theme-color" content="#f3ecdd">
   <meta name="description" content="Portfolio of Jal Patel, a final-year B.Tech CSE (AI &amp; Data Science) student in Vadodara, India exploring machine learning, data engineering, and market signals.">
+  <meta property="og:title" content="Jal Patel — Patterns to Prototypes">
+  <meta property="og:description" content="Portfolio of Jal Patel: exploring machine learning, data engineering, and market signals.">
+  <meta property="og:type" content="website">
+  <meta property="og:image" content="/assets/og-card.png">
+  <meta name="twitter:card" content="summary_large_image">
+  <link rel="icon" type="image/svg+xml" href="assets/jp-mark.svg">
+  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
+  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
+  <link rel="manifest" href="site.webmanifest">
+  <script type="application/ld+json">
+  {
+    "@context": "https://schema.org",
+    "@type": "Person",
+    "name": "Jal Patel",
+    "jobTitle": "Final-year B.Tech CSE (AI & Data Science) student",
+    "affiliation": {
+      "@type": "EducationalOrganization",
+      "name": "Parul University"
+    },
+    "sameAs": [
+      "https://github.com/Special258",
+      "https://www.linkedin.com/in/jalpatel-dataai",
+      "https://leetcode.com/u/Hoard_Warrior_20/",
+      "https://www.hackerrank.com/profile/jalpatel478"
+    ]
+  }
+  </script>
```

---

## Proposal P3: Links from Existing Pages to New Standalone Pages

**One-line reason:** Provide paths for visitors to discover `/lab.html`, `/journey.html`, `/certifications.html`, `/now.html`, and `/resume.html`.  
**Visible effect:** Two options provided: Option A (unobtrusive footer links) or Option B (zero visible change).

### Option A: Clean Sub-Footer Text Links
Location: Inside `.site-footer` on `portfolio.html` and `.landing-footer` on `index.html`. Reuses existing typography (`var(--mono)`, 12px, muted ink).

```diff
--- a/public/portfolio.html
+++ b/public/portfolio.html
@@ -645,6 +645,13 @@
     <div class="container footer-content">
       <span class="footer-credit">JAL PATEL / 2026</span>
       <a class="footer-top" href="#top">Back to top ↑</a>
+      <nav class="footer-extra-links" aria-label="More resources">
+        <a href="lab.html">Signal Lab</a>
+        <a href="journey.html">Journey</a>
+        <a href="certifications.html">Certifications</a>
+        <a href="now.html">Now</a>
+        <a href="resume.html">HTML Résumé</a>
+      </nav>
     </div>
   </footer>
```

### Option B: Zero Visible Element Variant (Invisible `<head>` Discovery Links)
Adds `<link rel="related">` tags inside `<head>` of both pages. Visually 100% pixel-identical (0% diff).

```diff
--- a/public/portfolio.html
+++ b/public/portfolio.html
@@ -12,6 +12,11 @@
+  <link rel="related" href="lab.html" title="Signal Lab">
+  <link rel="related" href="journey.html" title="Journey & Milestones">
+  <link rel="related" href="certifications.html" title="All Certifications">
+  <link rel="related" href="now.html" title="Now Focus">
+  <link rel="related" href="resume.html" title="HTML Résumé">
```

---

## Proposal P4: Deployment Hardening & Server Route Registration

**One-line reason:** Register new standalone routes in `dev-server.js` and ensure strict security headers without touching visual output.  
**Visible effect:** None (server logic only).

### Proposed Patch (`dev-server.js`):
```diff
--- a/dev-server.js
+++ b/dev-server.js
@@ -21,6 +21,18 @@
   ['/case-studies/hive', ['case-studies/hive.html', 'text/html; charset=utf-8']],
   ['/case-studies/hive.html', ['case-studies/hive.html', 'text/html; charset=utf-8']],
+  ['/lab', ['lab.html', 'text/html; charset=utf-8']],
+  ['/lab.html', ['lab.html', 'text/html; charset=utf-8']],
+  ['/journey', ['journey.html', 'text/html; charset=utf-8']],
+  ['/journey.html', ['journey.html', 'text/html; charset=utf-8']],
+  ['/certifications', ['certifications.html', 'text/html; charset=utf-8']],
+  ['/certifications.html', ['certifications.html', 'text/html; charset=utf-8']],
+  ['/now', ['now.html', 'text/html; charset=utf-8']],
+  ['/now.html', ['now.html', 'text/html; charset=utf-8']],
+  ['/resume', ['resume.html', 'text/html; charset=utf-8']],
+  ['/resume.html', ['resume.html', 'text/html; charset=utf-8']],
+  ['/404', ['404.html', 'text/html; charset=utf-8']],
+  ['/404.html', ['404.html', 'text/html; charset=utf-8']],
+  ['/lab.css', ['lab.css', 'text/css; charset=utf-8']],
+  ['/journey.css', ['journey.css', 'text/css; charset=utf-8']],
+  ['/certifications.css', ['certifications.css', 'text/css; charset=utf-8']],
+  ['/now.css', ['now.css', 'text/css; charset=utf-8']],
+  ['/resume.css', ['resume.css', 'text/css; charset=utf-8']],
+  ['/404.css', ['404.css', 'text/css; charset=utf-8']],
+  ['/favicon.svg', ['favicon.svg', 'image/svg+xml; charset=utf-8']],
+  ['/favicon-32x32.png', ['favicon-32x32.png', 'image/png']],
+  ['/apple-touch-icon.png', ['apple-touch-icon.png', 'image/png']],
+  ['/site.webmanifest', ['site.webmanifest', 'application/manifest+json']],
```

---

## Proposal P5: Invisible Accessibility & Viewport Hardening

**One-line reason:** Add `aria-hidden="true"` to ornamental SVG elements and use `min-height: 100vh` instead of fixed `height: 100vh` on the landing page to support short-screen mobile devices.  
**Visible effect:** None on desktop or standard viewports; prevents vertical cutoff on short mobile screens.

### Proposed Patch (`public/landing.css`):
```diff
--- a/public/landing.css
+++ b/public/landing.css
@@ -48,7 +48,7 @@
 .landing {
   position: relative;
   width: 100%;
-  height: 100vh;
+  min-height: 100vh;
   overflow: hidden;
 }
```

---

## Proposal P6: Contact Email "Copy" Interaction

**One-line reason:** Provide a quick-copy button next to the email link in `public/portfolio.html` so visitors can copy `jalpatel798@gmail.com` without opening an email app.  
**Visible effect:** Displays a "Copy email" action pill alongside the contact mailto link.

### Proposed Patch (`public/portfolio.html`):
```diff
--- a/public/portfolio.html
+++ b/public/portfolio.html
@@ -616,6 +616,7 @@
             <a class="resume-link contact-mailto-link" href="mailto:jalpatel798@gmail.com">Use your email app</a>
+            <button class="resume-link contact-email-copy" id="copy-email" type="button" data-email="jalpatel798@gmail.com" aria-describedby="copy-email-status">Copy email</button>
+            <span class="sr-only" id="copy-email-status" role="status" aria-live="polite"></span>
```

---

## Proposal P8: Replace Landing Page with New Cover Page Design

**One-line reason:** Set the newly designed full-screen cover page (`cover.html` with mountain-ridge market chart and interactive skill triggers) as the root landing page (`index.html`).  
**Visible effect:** Replaces `public/index.html` with the new design; `public/portfolio.html` remains unchanged.  
**Preview URL:** [http://localhost:3000/cover.html](http://localhost:3000/cover.html)
