export function relativeTimeFromNow(isoDate?: string): string {
  if (!isoDate) return "last seen recently"
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return "last seen recently"
  const diffSeconds = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (diffSeconds < 60) return "last online just now"
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `last online ${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `last online ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `last online ${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

export function presenceLabel(status?: string, lastSeenAt?: string): string {
  if (status === "active") return "Active"
  if (status === "away") return "Away"
  return relativeTimeFromNow(lastSeenAt)
}
