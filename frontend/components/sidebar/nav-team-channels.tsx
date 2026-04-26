"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as sidebar from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as sheet from "@/components/ui/sheet"
import * as chatApi from "@/lib/chat-api"
import { useTeamRealtime } from "@/lib/use-team-realtime"
import { RiHashtag } from "@remixicon/react"

export function NavTeamChannels({
  teamId,
  isOwner,
}: {
  teamId: string
  isOwner: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [channels, setChannels] = React.useState<chatApi.Conversation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string>()

  const loadChannels = React.useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const list = await chatApi.listTeamChannels(teamId)
      setChannels(list)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load channels")
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  React.useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  useTeamRealtime({
    teamId,
    onChange: () => {
      void loadChannels()
    },
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    setCreateError(undefined)
    try {
      const created = await chatApi.createTeamChannel(teamId, trimmed)
      setChannels((prev) => [created, ...prev.filter((c) => c._id !== created._id)])
      setCreateOpen(false)
      setNewName("")
      router.push(`/team/${teamId}/c/${created._id}`)
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Failed to create channel")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <sidebar.SidebarGroup>
        <div className="flex items-center justify-between gap-2 pr-2">
          <sidebar.SidebarGroupLabel>Channels</sidebar.SidebarGroupLabel>
          {isOwner ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCreateOpen(true)}>
              New
            </Button>
          ) : null}
        </div>
        {loading ? (
          <sidebar.SidebarMenu>
            <sidebar.SidebarMenuItem>
              <sidebar.SidebarMenuButton size="sm" disabled className="text-muted-foreground">
                Loading channels…
              </sidebar.SidebarMenuButton>
            </sidebar.SidebarMenuItem>
          </sidebar.SidebarMenu>
        ) : null}
        {error && !loading ? (
          <p className="px-2 text-xs text-destructive">{error}</p>
        ) : null}
        <sidebar.SidebarMenu>
          {!loading && channels.length === 0 ? (
            <sidebar.SidebarMenuItem>
              <sidebar.SidebarMenuButton size="sm" disabled className="text-muted-foreground">
                No channels yet
              </sidebar.SidebarMenuButton>
            </sidebar.SidebarMenuItem>
          ) : null}
          {channels.map((channel) => {
            const href = `/team/${teamId}/c/${channel._id}`
            const label = channel.name?.trim() ? `#${channel.name.trim()}` : "Channel"
            return (
              <sidebar.SidebarMenuItem key={channel._id}>
                <sidebar.SidebarMenuButton
                  asChild
                  size="sm"
                  isActive={pathname === href}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Link href={href} className="flex min-w-0 items-center gap-2">
                    <RiHashtag className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{label}</span>
                  </Link>
                </sidebar.SidebarMenuButton>
              </sidebar.SidebarMenuItem>
            )
          })}
        </sidebar.SidebarMenu>
      </sidebar.SidebarGroup>

      <sheet.Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <sheet.SheetContent side="right">
          <sheet.SheetHeader>
            <sheet.SheetTitle>Create channel</sheet.SheetTitle>
            <sheet.SheetDescription>
              Everyone on the team can read and post in this channel.
            </sheet.SheetDescription>
          </sheet.SheetHeader>
          <form onSubmit={handleCreate} className="mt-4 flex flex-1 flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="announcements"
                maxLength={120}
                autoFocus
              />
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <sheet.SheetFooter className="gap-2 sm:flex-col">
              <Button type="submit" disabled={creating || !newName.trim()} className="w-full">
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </sheet.SheetFooter>
          </form>
        </sheet.SheetContent>
      </sheet.Sheet>
    </>
  )
}
