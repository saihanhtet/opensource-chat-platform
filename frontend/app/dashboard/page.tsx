"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type TeamMember,
  updateTeam,
  updateTeamMember,
} from "@/lib/team-api"

export default function Page() {
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>()
  const [selectedTeamName, setSelectedTeamName] = React.useState<string>()
  const [teamNameDraft, setTeamNameDraft] = React.useState("")
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [savingTeamName, setSavingTeamName] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string>()
  const [error, setError] = React.useState<string>()
  const [actionMessage, setActionMessage] = React.useState<string>()
  const handleTeamDataChange = React.useCallback(
    (data: {
      selectedTeamId?: string
      selectedTeamName?: string
      members: TeamMember[]
      loading: boolean
      error?: string
    }) => {
      setSelectedTeamId(data.selectedTeamId)
      setSelectedTeamName(data.selectedTeamName)
      setTeamNameDraft(data.selectedTeamName ?? "")
      setMembers(data.members)
      setLoading(data.loading)
      setError(data.error)
    },
    []
  )
  const filteredMembers = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    if (!searchTerm) return members
    return members.filter((member) => {
      const username = member.userId?.username?.toLowerCase() ?? ""
      const email = member.userId?.email?.toLowerCase() ?? ""
      return username.includes(searchTerm) || email.includes(searchTerm)
    })
  }, [members, search])
  const canEditTeam = Boolean(selectedTeamId && !selectedTeamId.startsWith("personal:"))

  const handleTeamNameSave = async () => {
    if (!selectedTeamId || !canEditTeam) return
    setSavingTeamName(true)
    setError(undefined)
    setActionMessage(undefined)
    try {
      const updatedTeam = await updateTeam(selectedTeamId, { teamName: teamNameDraft.trim() })
      setSelectedTeamName(updatedTeam.teamName)
      setTeamNameDraft(updatedTeam.teamName)
      setActionMessage("Team name updated.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update team name.")
    } finally {
      setSavingTeamName(false)
    }
  }

  const handleMemberStatusChange = async (
    memberId: string,
    nextStatus: "pending" | "active" | "removed"
  ) => {
    setUpdatingMemberId(memberId)
    setError(undefined)
    setActionMessage(undefined)
    try {
      const updated = await updateTeamMember(memberId, { status: nextStatus })
      setMembers((prev) => prev.map((member) => (member._id === memberId ? updated : member)))
      setActionMessage("Member status updated.")
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update member status.")
    } finally {
      setUpdatingMemberId(undefined)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar onTeamDataChange={handleTeamDataChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedTeamName ?? "Select a Team"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Selected Team</p>
              <p className="mt-2 text-xl font-semibold">{selectedTeamName ?? "N/A"}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="mt-2 text-xl font-semibold">{members.length}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="mt-2 text-xl font-semibold">
                {
                  members.filter((member) => member.userId?.status === "active")
                    .length
                }
              </p>
            </div>
          </div>
          <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
            <h2 className="mb-4 text-lg font-semibold">Team Users</h2>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="team-name-edit">Team Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="team-name-edit"
                    value={teamNameDraft}
                    onChange={(event) => setTeamNameDraft(event.target.value)}
                    disabled={!canEditTeam}
                  />
                  <Button
                    onClick={handleTeamNameSave}
                    disabled={!canEditTeam || savingTeamName || !teamNameDraft.trim()}
                  >
                    {savingTeamName ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="member-search">Search Members</Label>
                <Input
                  id="member-search"
                  placeholder="Search by username or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {actionMessage ? <p className="mb-2 text-sm text-emerald-600">{actionMessage}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!loading && !error && filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users for this team yet.</p>
            ) : null}
            {!loading && !error && filteredMembers.length > 0 ? (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{member.userId?.username ?? "Unknown user"}</p>
                      <p className="text-xs text-muted-foreground">{member.userId?.email ?? "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm capitalize">{member.memberRole}</p>
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        value={member.status}
                        disabled={updatingMemberId === member._id}
                        onChange={(event) =>
                          handleMemberStatusChange(
                            member._id,
                            event.target.value as "pending" | "active" | "removed"
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="removed">Removed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
