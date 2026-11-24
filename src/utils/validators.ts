/**
 * Input validation utilities for StudyCircle Study Sessions and Shared Resources.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates session date string (YYYY-MM-DD).
 * Sessions cannot be scheduled in the past.
 */
export function validateSessionDate(dateStr: string): ValidationResult {
  if (!dateStr || typeof dateStr !== 'string') {
    return { isValid: false, error: 'Session date is required.' };
  }

  const trimmed = dateStr.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) {
    return { isValid: false, error: 'Date must be in YYYY-MM-DD format.' };
  }

  const parsedDate = new Date(`${trimmed}T00:00:00`);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid calendar date.' };
  }

  // Compare against today's date (at midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedDate.getTime() < today.getTime()) {
    return { isValid: false, error: 'Study sessions cannot be scheduled in the past.' };
  }

  return { isValid: true };
}

/**
 * Validates educational link / web URL.
 * Strictly requires http:// or https:// with a valid domain.
 * Blocks unsafe protocols (javascript:, data:, file:).
 */
export function validateEducationalUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Educational URL is required.' };
  }

  const trimmed = url.trim();

  // Prevent script injections or non-web protocols
  if (/^(javascript|data|file|vbscript|about):/i.test(trimmed)) {
    return { isValid: false, error: 'Unsafe URL protocol. Only HTTP and HTTPS links are permitted.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must begin with http:// or https://' };
    }

    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, error: 'URL must include a valid web domain (e.g. youtube.com, github.com).' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a well-formed web URL (e.g. https://ocw.mit.edu/...).' };
  }
}

/**
 * Validates session input payload before submission.
 */
export function validateSessionInput(data: {
  title: string;
  groupId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  locationOrLink: string;
  type: 'in_person' | 'online';
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Session topic must be at least 3 characters long.';
  }

  if (!data.groupId) {
    errors.groupId = 'Please select a study circle.';
  }

  const dateVal = validateSessionDate(data.date);
  if (!dateVal.isValid) {
    errors.date = dateVal.error!;
  }

  if (!data.startTime || !data.startTime.trim()) {
    errors.startTime = 'Start time is required (e.g. 4:00 PM).';
  }

  if (!data.durationMinutes || data.durationMinutes < 15) {
    errors.durationMinutes = 'Duration must be at least 15 minutes.';
  }

  if (!data.locationOrLink || !data.locationOrLink.trim()) {
    errors.locationOrLink = data.type === 'online' ? 'Meeting link is required.' : 'Room or campus location is required.';
  } else if (data.type === 'online') {
    const urlVal = validateEducationalUrl(data.locationOrLink);
    if (!urlVal.isValid) {
      errors.locationOrLink = urlVal.error!;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates educational resource input payload before submission.
 */
export function validateResourceInput(data: {
  title: string;
  subject: string;
  groupId: string;
  url: string;
  description?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Resource title must be at least 3 characters long.';
  }

  if (!data.subject || data.subject.trim().length < 2) {
    errors.subject = 'Subject is required (e.g. Mathematics, Computer Science).';
  }

  if (!data.groupId) {
    errors.groupId = 'Please select a study circle.';
  }

  const urlVal = validateEducationalUrl(data.url);
  if (!urlVal.isValid) {
    errors.url = urlVal.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
