/**
 * Security Route Sanitizer for StudyCircle.
 * Mitigates open-redirect vulnerabilities (e.g. React Router GHSA-wrjc-x8rr-h8h6)
 * and prevents protocol-relative or backslash-based external redirects.
 */

/**
 * Checks whether a given path string is a safe, strictly internal application route.
 * Safe routes:
 * 1. Must start with a single '/'
 * 2. Must not contain backslashes ('\')
 * 3. Must not start with '//' (protocol-relative external redirect)
 * 4. Must not contain scheme/protocol specifiers (e.g. 'http:', 'https:', 'javascript:', 'data:')
 */
export function isSafeInternalRoute(path: unknown): boolean {
  if (typeof path !== 'string' || !path.trim()) {
    return false;
  }

  const trimmed = path.trim();

  // Reject any backslashes (frequently used to bypass slash filters in browser engines)
  if (trimmed.includes('\\')) {
    return false;
  }

  // Reject protocol-relative URLs (e.g. //attacker.com)
  if (trimmed.startsWith('//')) {
    return false;
  }

  // Reject explicit protocols (e.g. http://, https://, javascript:, data:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return false;
  }

  // Must begin with a single slash
  if (!trimmed.startsWith('/')) {
    return false;
  }

  // Reject control characters or newlines that could lead to header injection / CRLF
  if (/[\r\n\t\x00-\x1F\x7F]/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes an incoming path or redirect target.
 * If safe, returns the normalized internal path.
 * If unsafe or invalid, returns the safe fallback route (defaults to '/dashboard').
 */
export function sanitizeInternalRoute(path: unknown, fallbackRoute = '/dashboard'): string {
  if (!isSafeInternalRoute(path)) {
    return fallbackRoute;
  }

  const safePath = (path as string).trim();
  // Normalize consecutive slashes at the start to a single slash
  return safePath.replace(/^\/+/, '/');
}
