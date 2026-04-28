const defaultFrontendUrl = 'https://patriotictelehealth.com';

export const normalizeOrigin = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
};

export const buildPortalUrl = (
  path: string,
  source: Record<string, string | undefined> = process.env,
): string => {
  const baseUrl =
    normalizeOrigin(source.FRONTEND_URL) ??
    normalizeOrigin(source.NEXT_PUBLIC_APP_URL) ??
    defaultFrontendUrl;

  return new URL(path, baseUrl).toString();
};
