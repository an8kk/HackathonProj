const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${apiBaseUrl}${normalizedPath}`;
};
