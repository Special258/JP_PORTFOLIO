# Comprehensive Portfolio System Audit

**Audit Date:** November 18, 2026  
**Repository:** `JP_PORTFOLIO`  
**Auditor:** Antigravity Engineering Agent  
**Baseline Hash Verification:** Intact (recorded in `/baseline/hashes.txt`)  

---

## 1. Executive Summary

This audit evaluates the codebase, deployment surface, security posture, asset integrity, and resume fidelity of Jal Patel's portfolio. All protected files remain frozen and unmodified.

Key findings:
- **Network / Console Error:** `portfolio.html` attempts to fetch `/data/prices.json`, which returned HTTP 404 because only `data/prices.example.json` was present in the repository.
- **Deployment Security:** `vercel.json` correctly sets `"outputDirectory": "public"`, which isolates backend files (`api/contact.js` is routed via Vercel Functions). If `outputDirectory` were ever changed to `"."`, severe source exposure would occur (`dev-server.js`, `package.json`, `README.md`, `tests/`, `supabase/schema.sql`).
- **Secrets in Git History:** Thorough inspection of all commits via `--no-textconv` revealed zero leaked credentials or live tokens (Resend and Supabase keys use template placeholders).
- **Resume Alignment:** Core facts between `public/portfolio.html` and `public/JAL_PATEL_RESUME.pdf` match, but `portfolio.html` only displays 4 of the 18 certifications from the resume, justifying the dedicated `/certifications.html` page.

---

## 2. Resource Integrity and Missing Files

| Resource Path | Status | Purpose / Notes |
| :--- | :--- | :--- |
| `public/assets/hero-signal-map.svg` | **Present** | Hero scatterplot / method graphic |
| `public/assets/jp-mark.svg` | **Present** | Brand mark / favicon SVG |
| `public/assets/landing-ai-mesh.svg` | **Present** | Landing hero AI mesh graphic |
| `public/assets/project-hive.svg` | **Present** | Hive project visual asset |
| `public/assets/project-janus.svg` | **Present** | Janus project visual asset |
| `public/assets/project-kairon.svg` | **Present** | Kairon project visual asset |
| `public/assets/og-card.png` | **Present** | 1200x630 OpenGraph card |
| `public/JAL_PATEL_RESUME.pdf` | **Present** | Downloadable résumé (2 pages) |
| `api/contact.js` | **Present** | Serverless contact handler with spam filtering & honeypot |
| `supabase/schema.sql` | **Present** | Database schema with RLS for message archival |
| `tests/contact.test.js` | **Present** | 13 contact form handler test cases |
| `tests/deployment.test.js` | **Present** | Deployment output & configuration test cases |
| `tests/case-studies.test.js` | **Present** | Case study routes & CSP test cases |
| `tests/signal-lab.test.js` | **Present** | Mathematical tests for moving averages & volatility |
| `tests/site.test.js` | **Present** | Link, anchor, and metadata regression tests |
| `public/data/prices.json` | **Absent (404)** | Expected by client-side Signal Lab; only `prices.example.json` shipped |

---

## 3. Dotfiles Configuration

- `.gitignore`: Correctly configured. Ignores `.env`, `.env.local`, `node_modules`, OS artifacts (`Thumbs.db`, `.DS_Store`), IDE settings (`.idea/`, `.vscode/`), and temporary test coverage.
- `.vercelignore`: Present at root. Explicitly excludes local development artifacts (`dev-server.js`, `tools/`, `tests/`, `baseline/`, `.env*`).
- `.env.example`: Present and clean. Documents `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_EMAIL_TO`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` with clear placeholder values (`re_replace-with-your-server-only-api-key`).

---

## 4. Git History & Secrets Scan

A complete log scan across all commits using `--no-textconv` was performed:
- Resend API keys: Template strings only (`re_replace-with-your-server-only-api-key`).
- Supabase tokens: Documentation placeholders only.
- Private emails: Only the verified contact email `jalpatel798@gmail.com` is referenced.
- Result: **CLEAN (0 secrets detected).**

---

## 5. Link and Anchor Verification

All internal and external links across `public/index.html`, `public/portfolio.html`, and `public/case-studies/*.html` were analyzed:
- Internal file targets (`index.html`, `portfolio.html`, `case-studies/*.html`, `assets/*`): **100% resolved.**
- Internal anchors (`#top`, `#work`, `#about`, `#stack`, `#experience`, `#credentials`, `#profiles`, `#contact`, `#problem`, `#users`, `#inputs`, `#architecture`, `#role`, `#result`, `#next`): **All valid.**
- External links:
  - GitHub: `https://github.com/Special258` (and repo links for Kairon, Janus, Hive)
  - LinkedIn: `https://www.linkedin.com/in/jalpatel-dataai`
  - LeetCode: `https://leetcode.com/u/Hoard_Warrior_20/`
  - HackerRank: `https://www.hackerrank.com/profile/jalpatel478`
  - Janus Live Demo: `https://jalpatel.app.n8n.cloud/webhook/265f8fbb-7140-4fa2-9aa6-a09e7d77629b/chat`
  - Hive Live Demo: `https://hivelearn-app.onrender.com`

---

## 6. Console and Network Errors

Headless Chrome browser diagnostics:
- `http://127.0.0.1:3000/index.html`:
  - Console errors: 0
  - Network failures: 0
- `http://127.0.0.1:3000/portfolio.html`:
  - Console error: `Failed to load resource: the server responded with a status of 404 (Not Found) - /data/prices.json`
  - Network failure: `GET /data/prices.json -> 404`
  - Cause: `public/signal-lab.js` attempts to load `/data/prices.json`. Creating `public/data/prices.json` (as a designated placeholder referencing the owner's CSV workflow) resolves this failure immediately.

---

## 7. Content Security Policy (CSP) Assessment

`vercel.json` defines the following policy:
```text
default-src 'self';
base-uri 'self';
connect-src 'self';
font-src 'self' https://fonts.gstatic.com;
form-action 'self' https://mail.google.com;
frame-ancestors 'none';
img-src 'self' data:;
object-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
```

- **Inline Scripts:** All HTML files comply: executable scripts use `src="script.js"` or `src="signal-lab.js"`. The only inline script blocks are metadata `application/ld+json`, which are not executed by the script engine.
- **External Scripts:** None. No third-party trackers, analytics, or CDN libraries.
- **Fonts & Styles:** Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`) are explicitly allowed.
- **Frames:** Frame embedding is prohibited (`frame-ancestors 'none'`) preventing clickjacking.
- **Verdict:** Highly resilient and strictly enforced.

---

## 8. Deployment Exposure Analysis

In `vercel.json`:
- Current setting: `"outputDirectory": "public"`
- If misconfigured to `"."`:
  - Vercel would serve root-level files as static assets.
  - Exposed files would include:
    - `dev-server.js` (server logic)
    - `package.json` (internal metadata)
    - `README.md` (internal developer notes)
    - `tests/` (test files and fixtures)
    - `supabase/schema.sql` (database schema and table names)
- Recommendation: Maintain `"outputDirectory": "public"` permanently. Proposals for deployment hardening (P4) will document exact static routing guarantees.

---

## 9. Mismatches Between `portfolio.html` and `JAL_PATEL_RESUME.pdf`

| Item | In `JAL_PATEL_RESUME.pdf` | In `portfolio.html` | Status / Note |
| :--- | :--- | :--- | :--- |
| **Cognifyz Internship** | Data Science Intern, Cognifyz Technologies Ltd., Remote, May 2025 – June 2025 | May-Jun 2025 · Remote | **Aligned** |
| **Excelerate Internship** | Data Analyst Intern - AI Powered Data Insights, Excelerate, Remote, Aug 2025 – Sep 2025 | Aug-Sep 2025 · Remote | **Aligned** |
| **Kairon Description** | In active development; ML workflows use usage, support, payment, tenure, NPS, feature-adoption; FastAPI, React, TypeScript, Supabase | Summary in project card; no speculative metrics | **Aligned** |
| **HackerRank Credential** | Python (Basic) Verified; Problem Solving (Intermediate) Verified; Problem Solving (Basic); SQL (Basic) | Card 04: "Python (Basic) and Problem Solving (Intermediate): verified" | **Accurate** (no speculative "Five-star" claim) |
| **Certifications Scope** | 18 certifications across Microsoft (4), Cisco (5), U-Mich (2), HackerRank (4), LinkedIn Learning (1), Forage (1) | Only 4 displayed on main portfolio | **Justifies `/certifications.html`** |
| **Education** | B.Tech CSE (AI & Data Science), Parul University (2023–2027), CGPA: 7.06 | Person JSON-LD records Parul University degree; CGPA omitted from public markup | **Consistent** |

---

## 10. Baseline Lighthouse Scores (Mobile Emulation)

Audited using Chrome Headless with simulated Moto G Power / mobile throttling:

| Metric | Landing (`index.html`) | Portfolio (`portfolio.html`) |
| :--- | :---: | :---: |
| **Performance** | **96** / 100 | **86** / 100 |
| **Accessibility** | **100** / 100 | **97** / 100 |
| **Best Practices** | **100** / 100 | **96** / 100 |
| **SEO** | **100** / 100 | **100** / 100 |
| **Agentic Browsing** | **100** / 100 | **100** / 100 |

*Note: Portfolio performance is constrained primarily by font-loading chains and heavy SVG vector geometry in the hero section, both of which are part of the frozen visual design.*
