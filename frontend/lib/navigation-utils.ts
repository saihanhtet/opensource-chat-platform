/** Same-origin path only — avoids open redirects from query params. */
export function safeAppPath(value: string | undefined | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }
  return value
}
