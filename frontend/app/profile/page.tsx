"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { getCurrentUser } from "@/lib/team-api"
import { updatePassword, updateProfile } from "@/lib/profile-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function ProfilePage() {
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [avatarUrl, setAvatarUrl] = React.useState("")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState("")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [passwordMessage, setPasswordMessage] = React.useState("")
  const [error, setError] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")

  React.useEffect(() => {
    let mounted = true
    void getCurrentUser()
      .then((user) => {
        if (!mounted) return
        setUsername(user.username)
        setEmail(user.email)
        setBio(user.bio ?? "")
        setAvatarUrl(user.profilePic ?? "")
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
      const result = await updateProfile({ username, email, bio, profilePic: avatarFile })
      setUsername(result.user.username)
      setEmail(result.user.email)
      setBio(result.user.bio ?? "")
      setAvatarUrl(result.user.profilePic ?? "")
      setAvatarFile(null)
      setAvatarPreview("")
      setMessage("Profile updated successfully.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError("")
    setPasswordMessage("")
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.")
      return
    }
    setSavingPassword(true)
    try {
      const response = await updatePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordMessage(response.message || "Password updated successfully.")
    } catch (saveError) {
      setPasswordError(
        saveError instanceof Error ? saveError.message : "Failed to update password"
      )
    } finally {
      setSavingPassword(false)
    }
  }

  const displayedAvatar = avatarPreview || avatarUrl

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
          <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={displayedAvatar} alt={username} />
                <AvatarFallback className="rounded-lg">
                  {(username.slice(0, 2) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="w-full space-y-1">
                <Label htmlFor="profile-avatar">Avatar</Label>
                <Input
                  id="profile-avatar"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    setAvatarFile(file)
                    setAvatarPreview(file ? URL.createObjectURL(file) : "")
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-username">Username</Label>
              <Input
                id="profile-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell your team something about you"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/500</p>
            </div>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={saving || loading}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
          <form
            onSubmit={handlePasswordSubmit}
            className="mt-6 max-w-xl space-y-4 rounded-lg border p-4"
          >
            <h2 className="text-base font-semibold">Change Password</h2>
            <div className="space-y-1">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {passwordMessage ? <p className="text-sm text-emerald-600">{passwordMessage}</p> : null}
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <Button type="submit" disabled={savingPassword || loading}>
              {savingPassword ? "Updating..." : "Update password"}
            </Button>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
