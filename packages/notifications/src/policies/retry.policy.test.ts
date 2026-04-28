import { describe, expect, it } from 'bun:test';
import { getRetryDelaySeconds } from './retry.policy';

describe('getRetryDelaySeconds', () => {
  it('uses priority-specific retry delays', () => {
    expect(getRetryDelaySeconds('critical', 0)).toBe(15);
    expect(getRetryDelaySeconds('high', 1)).toBe(300);
    expect(getRetryDelaySeconds('medium', 2)).toBe(1800);
    expect(getRetryDelaySeconds('low', 0)).toBe(900);
  });

  it('returns undefined after configured attempts are exhausted', () => {
    expect(getRetryDelaySeconds('critical', 3)).toBeUndefined();
  });
});
