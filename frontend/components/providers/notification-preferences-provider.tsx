"use client"

import * as React from "react"
import { Toaster } from "sonner"
import { getCurrentUser } from "@/lib/team-api"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  notificationToastDurationMs,
} from "@/lib/notification-preferences"
import type { CurrentUser, NotificationPreferences } from "@/lib/team-api"

type NotificationPreferencesContextValue = {
  preferences: NotificationPreferences
  toastDurationMs: number
  ready: boolean
  refresh: () => Promise<void>
  applyFromUser: (user: CurrentUser) => void
}

const NotificationPreferencesContext = React.createContext<
  NotificationPreferencesContextValue | undefined
>(undefined)

export function useNotificationPreferences() {
  const ctx = React.useContext(NotificationPreferencesContext)
  if (!ctx) {
    throw new Error("useNotificationPreferences must be used within NotificationPreferencesProvider")
  }
  return ctx
}

export function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  )
  const [ready, setReady] = React.useState(false)

  const applyFromUser = React.useCallback((user: CurrentUser) => {
    setPreferences(mergeNotificationPreferences(user.notificationPreferences))
  }, [])

  const refresh = React.useCallback(async () => {
    try {
      const user = await getCurrentUser()
      applyFromUser(user)
    } catch {
      setPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
    } finally {
      setReady(true)
    }
  }, [applyFromUser])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const toastDurationMs = notificationToastDurationMs(preferences)

  const value = React.useMemo(
    () => ({
      preferences,
      toastDurationMs,
      ready,
      refresh,
      applyFromUser,
    }),
    [preferences, toastDurationMs, ready, refresh, applyFromUser]
  )

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
      <Toaster richColors position="top-right" toastOptions={{ duration: toastDurationMs }} />
    </NotificationPreferencesContext.Provider>
  )
}
