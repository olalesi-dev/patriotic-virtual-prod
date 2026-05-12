import { describe, expect, it } from 'bun:test';
import {
  buildPaginationMeta,
  normalizePagination,
  normalizeSortOrder,
  parseBooleanFilter,
  parseDateFilter,
} from './query-utils';

describe('admin query utils', () => {
  it('normalizes bounded pagination', () => {
    expect(normalizePagination({ limit: '50', offset: '10' })).toEqual({
      limit: 50,
      offset: 10,
    });
    expect(normalizePagination({ limit: '5000', offset: '-1' })).toEqual({
      limit: 100,
      offset: 0,
    });
    expect(
      normalizePagination({}, { defaultLimit: 25, maxLimit: 250 }),
    ).toEqual({
      limit: 25,
      offset: 0,
    });
  });

  it('builds pagination metadata', () => {
    expect(buildPaginationMeta({ total: 75, limit: 25, offset: 25 })).toEqual({
      total: 75,
      limit: 25,
      offset: 25,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it('normalizes sort order conservatively', () => {
    expect(normalizeSortOrder('asc')).toBe('asc');
    expect(normalizeSortOrder('ASC')).toBe('asc');
    expect(normalizeSortOrder('unexpected')).toBe('desc');
    expect(normalizeSortOrder(undefined)).toBe('desc');
  });

  it('parses boolean filters without guessing', () => {
    expect(parseBooleanFilter(true)).toBe(true);
    expect(parseBooleanFilter('true')).toBe(true);
    expect(parseBooleanFilter('FALSE')).toBe(false);
    expect(parseBooleanFilter('yes')).toBeUndefined();
  });

  it('parses date filters safely', () => {
    expect(parseDateFilter('2026-05-09T00:00:00.000Z')?.toISOString()).toBe(
      '2026-05-09T00:00:00.000Z',
    );
    expect(parseDateFilter('not-a-date')).toBeUndefined();
  });
});
