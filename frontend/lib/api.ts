/**
 * Builds an absolute URL for backend API routes.
 * Defaults to same-origin (empty prefix) when the app is served from Express in production.
 * Set NEXT_PUBLIC_API_URL (e.g. http://localhost:3001) when the UI runs on a different origin (e.g. next dev on :3000).
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
