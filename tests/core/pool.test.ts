import { describe, it, expect } from 'vitest';
import { Pool } from '../../src/core/pool';

describe('Pool', () => {
  it('reuses only released objects', () => {
    const pool = new Pool(() => ({}));
    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire()).not.toBe(b);
    expect(pool.activeCount).toBe(3);
  });
  it('ignores duplicate and foreign releases', () => {
    const pool = new Pool(() => ({}));
    const a = pool.acquire();
    pool.release(a);
    pool.release(a);
    pool.release({});
    expect(pool.activeCount).toBe(0);
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire()).not.toBe(a);
  });
});
