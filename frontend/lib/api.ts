/**
 * Builds the URL for API routes from the browser.
 *
 * - Default **empty base** = same origin (`/api/...`). Use with Next.js `rewrites` in dev
 *   (see `next.config.ts` → `BACKEND_PROXY_URL`) or when the UI and API share one host (production Express + Next).
 * - Set `NEXT_PUBLIC_API_URL` only if the browser must call the API on another origin without a rewrite.
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
