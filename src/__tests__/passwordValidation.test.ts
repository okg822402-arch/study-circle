import { describe, it, expect } from 'vitest';
import { validatePassword, formatAuthError } from '../utils/authValidation';

describe('Authentication & Password Validation Security', () => {
  it('approves strong passwords containing letters, numbers and special characters', () => {
    const result = validatePassword('StudyPass2026!');
    expect(result.isValid).toBe(true);
    expect(result.score).toBe(4);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Pass1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long.');
  });

  it('rejects passwords missing uppercase letters', () => {
    const result = validatePassword('studypass2026!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must include at least one uppercase letter.');
  });

  it('rejects passwords missing numbers', () => {
    const result = validatePassword('StudyPassWord!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must include at least one number.');
  });

  it('rejects passwords missing special characters', () => {
    const result = validatePassword('StudyPass2026');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must include at least one special character (e.g. !@#$%^&*).');
  });

  it('maps Supabase auth errors to safe and student-friendly messages', () => {
    expect(formatAuthError('Invalid login credentials')).toBe(
      'Incorrect email or password. Please double check and try again.'
    );
    expect(formatAuthError('User already registered')).toBe(
      'An account with this email already exists. Try signing in instead.'
    );
    expect(formatAuthError('Email not confirmed')).toBe(
      'Your email address has not been confirmed yet. Please check your university inbox for the verification link.'
    );
    expect(formatAuthError('Over_request_rate_limit')).toBe(
      'Too many login attempts. Please wait a few moments before trying again.'
    );
  });
});
