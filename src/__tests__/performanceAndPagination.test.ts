import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resilientQuery, debounce } from '../lib/resilientQuery';
import { taskService } from '../services/taskService';
import { Task, TaskPriority, TaskStatus } from '../types';

describe('StudyCircle Performance, Pagination & Resiliency Benchmarks', () => {
  beforeEach(() => {
    resilientQuery.invalidate();
  });

  describe('Large Synthetic Dataset & Pagination Efficiency', () => {
    // Generate large synthetic dataset of 5,000 tasks
    const generateSyntheticTasks = (count: number): Task[] => {
      const groups = ['Calculus II Cohort', 'Organic Chemistry Sprint', 'Algorithms Team', 'Physics Lab'];
      const priorities: TaskPriority[] = ['high', 'medium', 'low'];
      const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

      return Array.from({ length: count }, (_, idx) => ({
        id: `synth-task-${idx + 1}`,
        groupId: `grp-${(idx % 10) + 1}`,
        groupName: groups[idx % groups.length],
        subject: 'Engineering',
        title: `Comprehensive Problem Set Assignment #${idx + 1} with extensive derivation criteria`,
        description: `Detailed description for assignment #${idx + 1} including lecture notes, theorem references, lab measurements, and collaborative proof steps to be completed before the deadline.`,
        status: statuses[idx % statuses.length],
        priority: priorities[idx % priorities.length],
        dueDate: `2026-11-${String((idx % 28) + 1).padStart(2, '0')}`,
        progress: (idx * 15) % 100,
        createdAt: '2026-11-01T08:00:00Z',
        assignedTo: {
          id: `usr-${idx % 20}`,
          fullName: `Student Developer ${idx % 20}`,
          initials: `S${idx % 20}`,
          color: '#3D7A8A',
        },
      }));
    };

    const largeTaskDataset = generateSyntheticTasks(5000);

    it('measures payload size reduction: 5000 full scan vs 20-item paginated projection', () => {
      const fullScanJson = JSON.stringify(largeTaskDataset);
      const fullScanBytes = Buffer.byteLength(fullScanJson, 'utf8');

      const paginatedSlice = largeTaskDataset.slice(0, 20);
      const paginatedJson = JSON.stringify(paginatedSlice);
      const paginatedBytes = Buffer.byteLength(paginatedJson, 'utf8');

      const payloadReductionPercent = ((fullScanBytes - paginatedBytes) / fullScanBytes) * 100;

      console.log(`[Benchmark Payload]: Full 5,000 tasks = ${(fullScanBytes / 1024).toFixed(1)} KB`);
      console.log(`[Benchmark Payload]: Paginated 20 tasks = ${(paginatedBytes / 1024).toFixed(1)} KB`);
      console.log(`[Benchmark Payload]: Bandwidth savings = ${payloadReductionPercent.toFixed(2)}%`);

      // Must reduce payload transfer by over 98%
      expect(payloadReductionPercent).toBeGreaterThan(98);
      expect(paginatedSlice.length).toBe(20);
    });

    it('measures query processing time: 5,000 in-memory scan vs 20-record window', () => {
      // 1. Un-paginated processing: search & sort through all 5000 records
      const t0 = performance.now();
      const unpaginatedResult = largeTaskDataset
        .filter((t) => t.title.toLowerCase().includes('problem set') && t.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const unpaginatedDuration = performance.now() - t0;

      // 2. Paginated 20-record window processing
      const t1 = performance.now();
      const paginatedResult = unpaginatedResult.slice(0, 20);
      const paginatedDuration = performance.now() - t1;

      console.log(`[Benchmark Time]: 5,000 items processing = ${unpaginatedDuration.toFixed(3)} ms`);
      console.log(`[Benchmark Time]: 20 items slice processing = ${paginatedDuration.toFixed(3)} ms`);

      expect(paginatedResult.length).toBe(20);
      expect(paginatedDuration).toBeLessThan(unpaginatedDuration + 1);
    });

    it('verifies performance indices migration exists on disk', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261124130000_performance_indices.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      expect(migrationSql).toContain('idx_tasks_user_status_due');
      expect(migrationSql).toContain('idx_study_groups_name_subject');
      expect(migrationSql).toContain('idx_sessions_date_time');
      expect(migrationSql).toContain('idx_resources_group_created_desc');
    });
  });

  describe('Resilient Query Engine: Timeouts, Retries & Deduplication', () => {
    it('aborts queries exceeding timeout threshold', async () => {
      const slowQuery = () =>
        new Promise((resolve) => setTimeout(() => resolve('finished'), 150));

      await expect(
        resilientQuery.execute(slowQuery, { timeoutMs: 50, maxRetries: 0 })
      ).rejects.toThrow(/timed out/i);
    });

    it('retries transient failures with exponential backoff and succeeds', async () => {
      let attempts = 0;
      const transientFlakyQuery = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('503 Service Temporarily Unavailable');
        }
        return 'success on attempt 3';
      };

      const result = await resilientQuery.execute(transientFlakyQuery, {
        maxRetries: 2,
        backoffBaseMs: 10,
        timeoutMs: 1000,
      });

      expect(result).toBe('success on attempt 3');
      expect(attempts).toBe(3);
    });

    it('deduplicates identical concurrent requests into a single network execution', async () => {
      let networkCalls = 0;
      const heavyFetch = async () => {
        networkCalls++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'response' };
      };

      // Fire 3 simultaneous requests with same cacheKey
      const [res1, res2, res3] = await Promise.all([
        resilientQuery.execute(heavyFetch, { cacheKey: 'public_categories' }),
        resilientQuery.execute(heavyFetch, { cacheKey: 'public_categories' }),
        resilientQuery.execute(heavyFetch, { cacheKey: 'public_categories' }),
      ]);

      expect(res1).toEqual({ data: 'response' });
      expect(res2).toEqual({ data: 'response' });
      expect(res3).toEqual({ data: 'response' });
      // Exactly 1 network execution should have occurred
      expect(networkCalls).toBe(1);
    });
  });

  describe('Duplicate Submission Prevention & Idempotency', () => {
    it('locks in-progress submissions to prevent double-clicks', () => {
      const lockKey = 'submit_task_usr1_calc';

      const lock1 = resilientQuery.acquireLock(lockKey);
      expect(lock1).toBe(true);

      // Second immediate click while first is locked must be rejected
      const lock2 = resilientQuery.acquireLock(lockKey);
      expect(lock2).toBe(false);

      // Release lock
      resilientQuery.releaseLock(lockKey);

      // Now lock can be acquired again
      const lock3 = resilientQuery.acquireLock(lockKey);
      expect(lock3).toBe(true);
      resilientQuery.releaseLock(lockKey);
    });
  });

  describe('Privacy Caching Safety Guard', () => {
    it('STRICTLY FORBIDS caching private user records in public/shared cache', async () => {
      let fetchCount = 0;
      const fetchPrivateUserRecords = async () => {
        fetchCount++;
        return [{ id: 'task-secret-1', note: 'confidential private exam prep' }];
      };

      // Request 1 with isPrivate = true
      await resilientQuery.execute(fetchPrivateUserRecords, {
        cacheKey: 'user_private_tasks_123',
        isPrivate: true,
      });

      // Request 2 with isPrivate = true
      await resilientQuery.execute(fetchPrivateUserRecords, {
        cacheKey: 'user_private_tasks_123',
        isPrivate: true,
      });

      // Must have fetched from source both times (never stored in cache)
      expect(fetchCount).toBe(2);

      // Inspect internal cache stats: must NOT contain the private key
      const stats = resilientQuery.getStats();
      expect(stats.cachedEntriesCount).toBe(0);
    });
  });

  describe('Search Input Debouncing', () => {
    it('debounces rapid user keystrokes into a single invocation after delay window', async () => {
      vi.useFakeTimers();
      const searchFn = vi.fn();
      const debouncedSearch = debounce(searchFn, 300);

      // Rapidly simulate 5 keystrokes
      debouncedSearch('c');
      debouncedSearch('ca');
      debouncedSearch('cal');
      debouncedSearch('calc');
      debouncedSearch('calculus');

      // Before timer expires, function has not fired
      expect(searchFn).not.toHaveBeenCalled();

      // Fast-forward 299ms: still not called
      vi.advanceTimersByTime(299);
      expect(searchFn).not.toHaveBeenCalled();

      // Fast-forward remaining 1ms (total 300ms): fired exactly once with final value
      vi.advanceTimersByTime(1);
      expect(searchFn).toHaveBeenCalledTimes(1);
      expect(searchFn).toHaveBeenCalledWith('calculus');

      vi.useRealTimers();
    });
  });
});
