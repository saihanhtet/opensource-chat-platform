import { apiUrl } from "@/lib/api"
import type { CurrentUser, NotificationPreferences } from "@/lib/team-api"

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  toastMessages: true,
  toastFriendRequests: true,
  toastTeamUpdates: true,
  toastTeamMembership: true,
  toastDurationSeconds: 4,
}

export function mergeNotificationPreferences(
  raw: CurrentUser["notificationPreferences"] | undefined | null
): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(raw ?? {}) }
}

export function notificationToastDurationMs(prefs: NotificationPreferences): number {
  return Math.round(prefs.toastDurationSeconds * 1000)
}

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed"
    throw new Error(message)
  }
  return data as T
}

export async function updateNotificationPreferencesApi(input: Partial<NotificationPreferences>): Promise<{
  message: string
  user: CurrentUser
}> {
  const res = await fetch(apiUrl("/api/auth/notification-preferences"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<{ message: string; user: CurrentUser }>(res)
}
