/**
 * StudyCircle High-Scale Performance & Resiliency Engine
 * 
 * Features:
 * - Request timeouts with AbortController
 * - Controlled retries with exponential backoff for transient network glitches
 * - In-flight query deduplication (avoids firing redundant identical requests)
 * - Sensible in-memory TTL caching for non-private public data
 * - Strict Security Enforcement: NEVER caches private user records
 * - Debouncing & duplicate submission guards
 */

export interface QueryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  cacheKey?: string;
  cacheTtlMs?: number;
  isPrivate?: boolean; // When true, strictly forbids caching
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ResilientQueryEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private activeLocks = new Set<string>();

  /**
   * Execute an async database or network query with timeout, retries, and deduplication.
   */
  async execute<T>(
    queryFn: (signal?: AbortSignal) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      timeoutMs = 8000,
      maxRetries = 2,
      backoffBaseMs = 300,
      cacheKey,
      cacheTtlMs = 60000, // 60s default for non-private data
      isPrivate = false,
    } = options;

    // 1. Check in-memory cache if non-private and valid cacheKey
    if (cacheKey && !isPrivate) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }
    }

    // 2. Request deduplication for identical concurrent queries
    if (cacheKey && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey) as Promise<T>;
    }

    // 3. Execution with retries and timeout
    const executePromise = (async () => {
      let attempt = 0;
      let lastError: any = null;

      while (attempt <= maxRetries) {
        const controller = new AbortController();
        let timeoutId: NodeJS.Timeout | number | undefined;

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort(new Error(`StudyCircle query timed out after ${timeoutMs}ms.`));
            reject(new Error(`StudyCircle query timed out after ${timeoutMs}ms.`));
          }, timeoutMs);
        });

        try {
          const result = await Promise.race([
            queryFn(controller.signal),
            timeoutPromise,
          ]);
          clearTimeout(timeoutId);

          // Cache result if allowed and non-private
          if (cacheKey && !isPrivate && cacheTtlMs > 0) {
            this.cache.set(cacheKey, {
              data: result,
              expiresAt: Date.now() + cacheTtlMs,
            });
          }

          return result;
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastError = err;

          // Do NOT retry on abort/cancel or client authorization errors
          if (
            err.name === 'AbortError' ||
            err.message?.includes('timed out') ||
            err.status === 400 ||
            err.status === 401 ||
            err.status === 403 ||
            err.status === 404 ||
            attempt >= maxRetries
          ) {
            break;
          }

          // Exponential backoff with jitter
          const delay = backoffBaseMs * Math.pow(2, attempt) + Math.random() * 50;
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
        }
      }

      throw lastError;
    })();

    if (cacheKey) {
      this.inFlightRequests.set(cacheKey, executePromise);
      executePromise.finally(() => {
        this.inFlightRequests.delete(cacheKey);
      });
    }

    return executePromise;
  }

  /**
   * Acquire an idempotency submission lock to prevent double-submissions.
   * Returns true if lock was acquired, false if already in progress.
   */
  acquireLock(lockKey: string): boolean {
    if (this.activeLocks.has(lockKey)) {
      return false;
    }
    this.activeLocks.add(lockKey);
    return true;
  }

  /**
   * Release submission lock.
   */
  releaseLock(lockKey: string): void {
    this.activeLocks.delete(lockKey);
  }

  /**
   * Invalidate specific cache keys or all entries
   */
  invalidate(cacheKeyPrefix?: string): void {
    if (!cacheKeyPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(cacheKeyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Diagnostic statistics for performance monitoring
   */
  getStats() {
    return {
      cachedEntriesCount: this.cache.size,
      inFlightCount: this.inFlightRequests.size,
      activeLocksCount: this.activeLocks.size,
    };
  }
}

export const resilientQuery = new ResilientQueryEngine();

/**
 * Helper to debounce high-frequency operations (e.g. search inputs)
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | number | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };
}
