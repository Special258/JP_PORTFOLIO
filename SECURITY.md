# Security Policy

## Reporting Security Issues

I take the security of this portfolio and associated project endpoints seriously.

If you identify a vulnerability, security flaw, or sensitive data exposure, please disclose it responsibly:

- **Primary Contact:** Jal Patel
- **Email:** [jalpatel798@gmail.com](mailto:jalpatel798@gmail.com)
- **Subject:** `[SECURITY] Portfolio Vulnerability Report`

Please include:
1. Description of the vulnerability and affected URL or file.
2. Steps to reproduce the issue (proof-of-concept or curl command).
3. The potential impact if exploited.

I will acknowledge reports within 48 hours and work on remediation promptly.

## Security Practices in this Codebase

- **Zero Client Secrets:** No private API keys or database service role credentials are included in the frontend bundles.
- **Content Security Policy (CSP):** Strict CSP enforced on Vercel deployment with `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and no inline executable scripts.
- **Deployment Isolation:** Production deployment serves only the `public/` directory, preventing exposure of test suites, server logic, or configuration files.
- **Input Sanitization:** Contact form submissions pass origin checks, honeypot traps, length limitations, and schema validation before any processing.
