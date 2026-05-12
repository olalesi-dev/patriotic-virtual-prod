export const userSortKeys = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'role',
  'disabled',
  'emailVerified',
] as const;

export type UserSortKey = (typeof userSortKeys)[number];

export const normalizeUserSortBy = (sortBy?: string): UserSortKey =>
  userSortKeys.includes(sortBy as UserSortKey)
    ? (sortBy as UserSortKey)
    : 'createdAt';
