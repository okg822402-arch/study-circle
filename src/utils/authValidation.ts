export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
}

/**
 * Enforces strong password rules:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&* etc.)
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter.');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least one number.');
  } else {
    score++;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include at least one special character (e.g. !@#$%^&*).');
  } else {
    score++;
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
  };
}

/**
 * Converts Supabase Auth error objects and codes into friendly student-facing messages
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = typeof error === 'string' ? error : error.message || '';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Incorrect email or password. Please double check and try again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your university inbox for the verification link.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests')
  ) {
    return 'Too many login attempts. Please wait a few moments before trying again.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password is too short. It must be at least 8 characters with letters, numbers, and symbols.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  return message || 'Authentication failed. Please check your details and try again.';
}
