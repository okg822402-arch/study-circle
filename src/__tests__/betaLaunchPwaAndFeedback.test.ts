import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { feedbackService } from '../services/feedbackService';
import {
  validateSessionDate,
  validateEducationalUrl,
  validateSessionInput,
  validateResourceInput
} from '../utils/validators';

describe('Beta Launch Verification: Feedback, PWA & Security Caching Rules', () => {

  describe('Feedback Module & Access Controls', () => {
    it('submits feedback with screen name and optional rating successfully in mock/fallback mode', async () => {
      const feedbackId = await feedbackService.submitFeedback({
        userId: 'student-user-123',
        category: 'Bug Report',
        screenName: 'Study Circles',
        comments: 'Join button flickers occasionally on low network',
        rating: 4
      });

      expect(typeof feedbackId).toBe('string');
      expect(feedbackId.length).toBeGreaterThan(0);
    });

    it('submits feedback without a rating (optional rating support)', async () => {
      const feedbackId = await feedbackService.submitFeedback({
        userId: 'student-user-456',
        category: 'Suggestion / Feature',
        screenName: 'Tasks',
        comments: 'Can we add recurring daily tasks?'
      });

      expect(typeof feedbackId).toBe('string');
      expect(feedbackId.length).toBeGreaterThan(0);
    });

    it('retrieves user feedback history scoped strictly to the requesting user', async () => {
      const myFeedback = await feedbackService.fetchMyFeedback('student-user-123');
      expect(Array.isArray(myFeedback)).toBe(true);
      // In mock fallback mode or Supabase, returns an array
      for (const item of myFeedback) {
        expect(item.userId).toBe('student-user-123');
      }
    });

    it('ensures feedback table RLS policy prohibits cross-user viewing', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261124120000_feedback_enhancement.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

      // Check RLS is enabled and select policy restricts to auth.uid() = user_id
      expect(migrationSql).toContain('ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;');
      expect(migrationSql).toContain('CREATE POLICY "Strict private feedback read"');
      expect(migrationSql).toContain('auth.uid() = user_id');
      expect(migrationSql).toContain('screen_name');
    });
  });

  describe('PWA Manifest & Mobile Configuration', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    it('contains all required PWA manifest fields for installation', () => {
      expect(manifest.name).toBe('StudyCircle — Student Collaboration');
      expect(manifest.short_name).toBe('StudyCircle');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#1B2B4B');
      expect(manifest.background_color).toBe('#FAFAF7');
    });

    it('defines standard 192x192, 512x512, and maskable icons', () => {
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

      const has192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.type === 'image/png');
      const has512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.type === 'image/png');
      const hasMaskable = manifest.icons.some((i: any) => i.purpose === 'maskable');

      expect(has192).toBe(true);
      expect(has512).toBe(true);
      expect(hasMaskable).toBe(true);
    });

    it('verifies icon files exist on disk in the public directory', () => {
      const icon192Path = path.resolve(__dirname, '../../public/icons/icon-192.png');
      const icon512Path = path.resolve(__dirname, '../../public/icons/icon-512.png');
      const maskablePath = path.resolve(__dirname, '../../public/icons/maskable-icon-512.png');
      const appleTouchPath = path.resolve(__dirname, '../../public/icons/apple-touch-icon.png');
      const faviconPath = path.resolve(__dirname, '../../public/favicon.svg');

      expect(fs.existsSync(icon192Path)).toBe(true);
      expect(fs.existsSync(icon512Path)).toBe(true);
      expect(fs.existsSync(maskablePath)).toBe(true);
      expect(fs.existsSync(appleTouchPath)).toBe(true);
      expect(fs.existsSync(faviconPath)).toBe(true);
    });

    it('verifies index.html specifies mobile viewport, manifest, and theme color tags', () => {
      const indexPath = path.resolve(__dirname, '../../index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');

      expect(indexHtml).toContain('rel="manifest" href="/manifest.json"');
      expect(indexHtml).toContain('name="theme-color" content="#1B2B4B"');
      expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
      expect(indexHtml).toContain('viewport-fit=cover');
    });
  });

  describe('Service Worker Security: Cache Safety Policy', () => {
    const swPath = path.resolve(__dirname, '../../public/sw.js');
    const swCode = fs.readFileSync(swPath, 'utf-8');

    it('strictly forbids caching Supabase API, database, and auth endpoints', () => {
      expect(swCode).toContain('supabase.co');
      expect(swCode).toContain('/rest/v1');
      expect(swCode).toContain('/auth/v1');
      expect(swCode).toContain('Authorization');
      expect(swCode).toContain('apikey');
    });

    it('strictly forbids caching non-GET requests (mutations / login)', () => {
      expect(swCode).toContain("request.method !== 'GET'");
    });

    it('contains offline fallback navigation handling and offline.html', () => {
      expect(swCode).toContain("request.mode === 'navigate'");
      expect(swCode).toContain('/offline.html');

      const offlineHtmlPath = path.resolve(__dirname, '../../public/offline.html');
      expect(fs.existsSync(offlineHtmlPath)).toBe(true);

      const offlineContent = fs.readFileSync(offlineHtmlPath, 'utf-8');
      expect(offlineContent).toContain('Offline');
      expect(offlineContent).toContain('Retry Connection');
    });
  });

  describe('Study Session and Educational Resource Validation', () => {
    it('validates study session dates and times correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      const valid = validateSessionDate(today);
      expect(valid.isValid).toBe(true);

      // Past date validation
      const past = validateSessionDate('2020-01-01');
      expect(past.isValid).toBe(false);
      expect(past.error).toContain('past');

      // Valid session input
      const sessionInput = validateSessionInput({
        title: 'Linear Algebra Eigenvalues',
        groupId: 'grp-123',
        date: today,
        startTime: '14:00',
        durationMinutes: 60,
        locationOrLink: 'https://meet.google.com/abc-def-ghi',
        type: 'online'
      });
      expect(sessionInput.isValid).toBe(true);
      expect(Object.keys(sessionInput.errors).length).toBe(0);

      // Invalid duration
      const badDuration = validateSessionInput({
        title: 'Valid Topic',
        groupId: 'grp-123',
        date: today,
        startTime: '15:00',
        durationMinutes: 10, // < 15 min
        locationOrLink: 'Library Room 204',
        type: 'in_person'
      });
      expect(badDuration.isValid).toBe(false);
      expect(badDuration.errors.durationMinutes).toBeDefined();
    });

    it('validates educational resource URLs securely', () => {
      const validUrl = validateEducationalUrl('https://ocw.mit.edu/courses/mathematics');
      expect(validUrl.isValid).toBe(true);

      // Insecure or malformed URL
      const invalidUrl = validateEducationalUrl('not-a-valid-url');
      expect(invalidUrl.isValid).toBe(false);

      // Javascript protocol rejection
      const dangerousUrl = validateEducationalUrl('javascript:alert(1)');
      expect(dangerousUrl.isValid).toBe(false);
      expect(dangerousUrl.error).toContain('Unsafe URL protocol');

      // Resource input check
      const validResource = validateResourceInput({
        title: 'MIT OpenCourseWare Multivariable Calculus',
        subject: 'Mathematics',
        groupId: 'grp-123',
        url: 'https://ocw.mit.edu/courses/mathematics'
      });
      expect(validResource.isValid).toBe(true);
    });
  });
});
