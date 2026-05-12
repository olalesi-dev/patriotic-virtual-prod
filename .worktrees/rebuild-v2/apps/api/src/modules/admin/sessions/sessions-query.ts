export const adminSessionSortKeys = [
  'loggedInAt',
  'lastActivityAt',
  'expiresAt',
  'name',
  'email',
  'role',
  'loginMethod',
] as const;

export type AdminSessionSortKey = (typeof adminSessionSortKeys)[number];

export const normalizeAdminSessionSortBy = (
  sortBy?: string,
): AdminSessionSortKey =>
  adminSessionSortKeys.includes(sortBy as AdminSessionSortKey)
    ? (sortBy as AdminSessionSortKey)
    : 'loggedInAt';
