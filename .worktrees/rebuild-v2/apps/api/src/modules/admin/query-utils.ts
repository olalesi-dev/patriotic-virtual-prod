export interface PaginationInput {
  limit?: number | string;
  offset?: number | string;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export const parsePositiveInteger = (
  value: number | string | undefined,
  fallback: number,
) => {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const normalizePagination = (
  input: PaginationInput,
  options: PaginationOptions = {},
): Pagination => {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 100;
  const rawLimit = parsePositiveInteger(input.limit, defaultLimit);
  const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
  const offset = parsePositiveInteger(input.offset, 0);

  return { limit, offset };
};

export const buildPaginationMeta = (input: {
  total: number;
  limit: number;
  offset: number;
}) => ({
  total: input.total,
  limit: input.limit,
  offset: input.offset,
  hasNext: input.offset + input.limit < input.total,
  hasPrevious: input.offset > 0,
});

export const normalizeSortOrder = (sortOrder?: string) =>
  sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

export const parseBooleanFilter = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
};

export const parseDateFilter = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};
