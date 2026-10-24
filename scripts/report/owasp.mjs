// OWASP Top 10 (2025 edition): the category table and how each applies to a static landing.
// The edition lives in one constant so a later edition is a small change.

export const OWASP_EDITION = '2025';
export const OWASP_URL = 'https://owasp.org/Top10/2025/';

/**
 * `checks`: what the report looks at for a static landing.
 * `naReason`: why the category has nothing to check when no item of it was produced.
 */
export const OWASP_CATEGORIES = [
  {
    id: 'A01',
    name: 'Broken Access Control',
    checks: 'private files in the build; live: private paths are not served',
  },
  {
    id: 'A02',
    name: 'Security Misconfiguration',
    checks:
      'security headers baseline, COOP and Permissions-Policy, source maps and manifests, cache of hashed assets, live headers',
  },
  {
    id: 'A03',
    name: 'Software Supply Chain Failures',
    checks:
      'npm audit of the production dependencies, lockfile, third-party origins',
  },
  {
    id: 'A04',
    name: 'Cryptographic Failures',
    checks:
      'mixed content, http:// links, hard-coded secrets; live: TLS, HTTP to HTTPS, HSTS',
  },
  {
    id: 'A05',
    name: 'Injection',
    checks:
      'javascript: URLs, raw HTML sinks in the source, inline scripts, script CSP',
  },
  {
    id: 'A06',
    name: 'Insecure Design',
    checks: 'forms that post to a third party',
    naReason:
      'a static landing has no application logic or backend to design flaws into, and the built pages have no forms',
  },
  {
    id: 'A07',
    name: 'Authentication Failures',
    checks: 'password inputs on a static page',
    naReason: 'a static landing has no accounts, sessions or login',
  },
  {
    id: 'A08',
    name: 'Software or Data Integrity Failures',
    checks:
      'Subresource Integrity on external scripts and stylesheets, deploy provenance',
  },
  {
    id: 'A09',
    name: 'Security Logging and Alerting Failures',
    checks: '',
    naReason:
      'a static host runs no application code, so there are no application logs or alerts to keep; access logs belong to the hosting provider',
  },
  {
    id: 'A10',
    name: 'Mishandling of Exceptional Conditions',
    checks:
      '404 page, broken internal links, outbound link health; live: unknown paths answer 404',
  },
];

export const categoryById = (id) =>
  OWASP_CATEGORIES.find((category) => category.id === id);
