# Jal Patel — Two-page portfolio

The portfolio has two connected pages: `public/index.html` is a concise, tech-inspired introduction to Jal, while `public/portfolio.html` contains the complete project-led portfolio. The introduction uses original ambient signal artwork and links through to the full portfolio; it does not duplicate its project or experience details.

## Run locally

Run:

```bash
npm run dev
```

The development server uses port `3000` by default. The email links open a Gmail compose window addressed to Jal.

## Stack and deployment

The pages use plain HTML, CSS, and JavaScript; there is no framework or dependency installation step. `dev-server.js` provides a small Node.js local preview server. Vercel serves the static portfolio files and the optional `api/contact.js` serverless endpoint.

Connect the repository to Vercel and use the repository root as the project root. Vercel publishes only `public/`; the API, source tests, and project configuration stay outside the static output. `npm run build` runs JavaScript syntax checks and the test suite before deployment. No environment variables are required to serve the pages; configure the Resend or Supabase values in Vercel only if you choose to use the optional API.

When Git is connected to Vercel, pushes to the production branch deploy the live site, and other branches or pull requests can be used for preview deployments.

## Updating the portfolio

- Add or edit project cards in the `#work` section of `public/portfolio.html`. Keep each card's `data-category` in sync with the project filters (`systems`, `ai`, or `progress`), and put local artwork in `public/assets/`.
- Add experience entries in the `#experience` section of `public/portfolio.html`.
- Update presentation in `public/styles.css` (portfolio page) or `public/landing.css` (introduction page). Update `public/script.js` only when interaction behavior needs to change.
- Replace `public/JAL_PATEL_RESUME.pdf` with the updated résumé using the same filename so the existing links continue to work.
- Signal Lab intentionally starts without prices. To add your own data, export a CSV with `date,ticker,close` columns and exactly three ticker symbols, then run `node tools/csv-to-prices.js path/to/export.csv`. The script writes `public/data/prices.json`, which is loaded locally by the browser. `public/data/prices.example.json` is a labelled placeholder and is never used as market data.
- Run `npm run build` and preview with `npm run dev`. Push the change to a branch and inspect its Vercel preview before merging it into the production branch.

Keep private files and credentials out of Git and Vercel deployments. `Profile.pdf` is intentionally excluded; only the résumé linked from the site is published.

## Portfolio visuals

The landing page's signal illustration and project-card artwork are original schematic visuals, not project screenshots, data, or performance claims. They're served locally as SVGs; no stock-image service is required. The portfolio hero timeline uses dated milestones from the résumé and project information. The work cards link to the available project demos, repositories, and case studies; links that are not available are identified rather than guessed.

## Optional contact API

The portfolio UI links visitors directly to Jal’s email and professional profiles; it does not display or submit a contact form. The Vercel endpoint at `api/contact.js` remains available for direct API use. It validates same-origin requests, ignores honeypot spam, and can send email through Resend and optionally archive submissions in Supabase. To enable those services, configure the corresponding server-side environment variables described in `.env.example`. Never put API keys or service-role keys in browser code.

If Supabase is configured, the endpoint writes to `public.contact_messages`; row-level security is enabled and only the server-side service role can insert rows. The endpoint does not return submitted details.

The site sets a Content Security Policy, disables framing, and limits the browser permissions it requests. The policy allows Google Fonts for typography; all scripts, images, and API requests are otherwise served from this site.

## Tests

```bash
npm test
npm run build
```

## Project files

- `public/index.html` — first-page introduction and link into the complete portfolio
- `public/portfolio.html` — full portfolio sections, metadata, and direct contact/profile links
- `public/case-studies/` — project case studies for Kairon, Janus, and Hive
- `public/landing.css` — introductory page layout and restrained animated artwork
- `public/styles.css` — responsive visual system and mobile layouts
- `public/assets/*.svg` — original logo and abstract hero/project illustrations
- `public/script.js` — navigation, project filters, and reveal effects
- `public/signal-lab.js` — local Signal Lab calculations and accessible SVG chart
- `public/data/prices.example.json` — placeholder schema only; contains no market prices
- `tools/csv-to-prices.js` — converts an owner-exported CSV to the Signal Lab JSON format
- `api/contact.js` — optional Vercel function for direct API contact submissions
- `tests/contact.test.js` — API validation and storage behavior tests
- `tests/case-studies.test.js` — case-study route and content-security-policy checks
- `tests/deployment.test.js` — public-output and ignore-file checks
- `dev-server.js` — dependency-free local preview server
- `supabase/schema.sql` — database schema and access controls
- `public/JAL_PATEL_RESUME.pdf` — downloadable résumé
