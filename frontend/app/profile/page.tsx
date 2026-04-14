"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { getCurrentUser } from "@/lib/team-api"
import { updateProfile } from "@/lib/profile-api"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function ProfilePage() {
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let mounted = true
    void getCurrentUser()
      .then((user) => {
        if (!mounted) return
        setUsername(user.username)
        setEmail(user.email)
      })
      .catch((loadError) => {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const result = await updateProfile({ username, email })
      setUsername(result.user.username)
      setEmail(result.user.email)
      setMessage("Profile updated successfully.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-semibold">Profile</h1>
        </header>
        <div className="p-6">
          {loading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : null}
          <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-10 w-full rounded-md border px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-md border px-3 text-sm"
              />
            </div>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
