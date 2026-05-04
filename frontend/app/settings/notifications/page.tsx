"use client"

import * as React from "react"
import { toast } from "sonner"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { useNotificationPreferences } from "@/components/providers/notification-preferences-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  mergeNotificationPreferences,
  notificationToastDurationMs,
  updateNotificationPreferencesApi,
} from "@/lib/notification-preferences"
import type { NotificationPreferences } from "@/lib/team-api"

export default function NotificationSettingsPage() {
  const { preferences, applyFromUser } = useNotificationPreferences()
  const [draft, setDraft] = React.useState<NotificationPreferences>(preferences)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    setDraft(preferences)
  }, [preferences])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await updateNotificationPreferencesApi({
        toastMessages: draft.toastMessages,
        toastFriendRequests: draft.toastFriendRequests,
        toastTeamUpdates: draft.toastTeamUpdates,
        toastTeamMembership: draft.toastTeamMembership,
        toastDurationSeconds: draft.toastDurationSeconds,
      })
      applyFromUser(res.user)
      const merged = mergeNotificationPreferences(res.user.notificationPreferences)
      toast.success("Notification settings saved.", {
        duration: notificationToastDurationMs(merged),
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  const handleTryToast = () => {
    toast.message("Preview", {
      description: "This is how long in-app toasts stay visible with your current setting.",
      duration: notificationToastDurationMs(draft),
    })
  }

  const toggle = (key: keyof Pick<NotificationPreferences, "toastMessages" | "toastFriendRequests" | "toastTeamUpdates" | "toastTeamMembership">) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-semibold">Notifications</h1>
        </header>
        <div className="p-6">
          <p className="mb-6 max-w-xl text-sm text-muted-foreground">
            Choose which realtime alerts appear as toasts and how long they stay on screen (2–30
            seconds). These settings are saved to your account and apply on every device where you are
            signed in.
          </p>
          <form onSubmit={handleSave} className="max-w-xl space-y-6 rounded-lg border p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">Toast alerts</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={draft.toastMessages}
                  onChange={() => toggle("toastMessages")}
                />
                New chat messages (when you are not the sender)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={draft.toastFriendRequests}
                  onChange={() => toggle("toastFriendRequests")}
                />
                Friend requests (created or updated)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={draft.toastTeamUpdates}
                  onChange={() => toggle("toastTeamUpdates")}
                />
                Team / space settings updated
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={draft.toastTeamMembership}
                  onChange={() => toggle("toastTeamMembership")}
                />
                Team membership (invites, role or status changes)
              </label>
            </div>
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-4">
                <Label htmlFor="toast-duration">Toast visibility</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {draft.toastDurationSeconds}s
                </span>
              </div>
              <input
                id="toast-duration"
                type="range"
                min={2}
                max={30}
                step={1}
                className="w-full accent-primary"
                value={draft.toastDurationSeconds}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    toastDurationSeconds: Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Shorter toasts feel lighter; longer ones help if you read slowly or step away briefly.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save notifications"}
              </Button>
              <Button type="button" variant="outline" onClick={handleTryToast}>
                Preview toast timing
              </Button>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
