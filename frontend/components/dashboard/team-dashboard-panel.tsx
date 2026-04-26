"use client"

import * as breadcrumb from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import * as teamApi from "@/lib/team-api"
import { usePresenceRealtime } from "@/lib/use-presence-realtime"
import { useTeamRealtime } from "@/lib/use-team-realtime"
import { useRouter } from "next/navigation"
import * as React from "react"

const SELECTED_TEAM_STORAGE_KEY = "selected-team-id"

type TeamRole = "owner" | "admin" | "moderator" | "member"
const teamRoles: TeamRole[] = ["owner", "admin", "moderator", "member"]

export function TeamDashboardPanel({ teamId }: { teamId: string }) {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = React.useState<teamApi.Team>()
  const [selectedTeamName, setSelectedTeamName] = React.useState<string>()
  const [currentUserId, setCurrentUserId] = React.useState<string>()
  const [currentUserRole, setCurrentUserRole] = React.useState<TeamRole>()
  const [teamNameDraft, setTeamNameDraft] = React.useState("")
  const [addMemberIdentifier, setAddMemberIdentifier] = React.useState("")
  const [addMemberRole, setAddMemberRole] = React.useState<TeamRole>("member")
  const [members, setMembers] = React.useState<teamApi.TeamMember[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [savingTeamName, setSavingTeamName] = React.useState(false)
  const [addingMember, setAddingMember] = React.useState(false)
  const [savingPermissions, setSavingPermissions] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string>()
  const [removingMemberId, setRemovingMemberId] = React.useState<string>()
  const [statusPermissions, setStatusPermissions] = React.useState<
    Record<TeamRole, TeamRole[]>
  >({
    owner: ["owner", "admin", "moderator", "member"],
    admin: ["moderator", "member"],
    moderator: ["member"],
    member: [],
  })
  const [error, setError] = React.useState<string>()
  const [actionMessage, setActionMessage] = React.useState<string>()

  const isOwner = Boolean(selectedTeam && currentUserId && selectedTeam.createdBy === currentUserId)

  const loadTeam = React.useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const [me, team, teamMembers] = await Promise.all([
        teamApi.getCurrentUser(),
        teamApi.getTeamById(teamId),
        teamApi.getTeamMembers(teamId),
      ])
      setCurrentUserId(me._id)
      setSelectedTeam(team)
      setSelectedTeamName(team.teamName)
      setTeamNameDraft(team.teamName)
      setMembers(teamMembers)
      const membership = teamMembers.find((member) => member.userId?._id === me._id)
      const role = team.createdBy === me._id ? "owner" : membership?.memberRole
      setCurrentUserRole(role as TeamRole | undefined)
      setStatusPermissions({
        owner: team.rolePermissions?.statusManagement?.owner ?? ["owner", "admin", "moderator", "member"],
        admin: team.rolePermissions?.statusManagement?.admin ?? ["moderator", "member"],
        moderator: team.rolePermissions?.statusManagement?.moderator ?? ["member"],
        member: team.rolePermissions?.statusManagement?.member ?? [],
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load team.")
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  React.useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  const filteredMembers = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    if (!searchTerm) return members
    return members.filter((member) => {
      const username = member.userId?.username?.toLowerCase() ?? ""
      const email = member.userId?.email?.toLowerCase() ?? ""
      return username.includes(searchTerm) || email.includes(searchTerm)
    })
  }, [members, search])

  const roleRank: Record<TeamRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  }

  const canManageTarget = (targetRole: TeamRole) =>
    currentUserRole ? statusPermissions[currentUserRole].includes(targetRole) : false

  const getTargetRole = (member: teamApi.TeamMember): TeamRole => {
    if (selectedTeam?.createdBy === member.userId?._id) return "owner"
    return member.memberRole
  }

  const canEditMember = (member: teamApi.TeamMember) => {
    if (!currentUserRole || !currentUserId) return false
    if (member.userId?._id === currentUserId) return false
    const targetRole = getTargetRole(member)
    return canManageTarget(targetRole) && roleRank[currentUserRole] > roleRank[targetRole]
  }

  const canRemoveOtherMember = (member: teamApi.TeamMember) => {
    if (!currentUserRole || !currentUserId || !selectedTeam) return false
    if (member.userId?._id === currentUserId) return false
    if (selectedTeam.createdBy === member.userId?._id) return false
    const targetRole = getTargetRole(member)
    return canManageTarget(targetRole)
  }

  const handleTeamNameSave = async () => {
    if (!isOwner) return
    setSavingTeamName(true)
    setError(undefined)
    setActionMessage(undefined)
    try {
      const updatedTeam = await teamApi.updateTeam(teamId, { teamName: teamNameDraft.trim() })
      setSelectedTeamName(updatedTeam.teamName)
      setTeamNameDraft(updatedTeam.teamName)
      setSelectedTeam(updatedTeam)
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
      const updated = await teamApi.updateTeamMember(memberId, { status: nextStatus })
      setMembers((prev) => prev.map((member) => (member._id === memberId ? updated : member)))
      setActionMessage("Member status updated.")
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update member status.")
    } finally {
      setUpdatingMemberId(undefined)
    }
  }

  const handleMemberRoleChange = async (memberId: string, nextRole: TeamRole) => {
    setUpdatingMemberId(memberId)
    setError(undefined)
    setActionMessage(undefined)
    try {
      const updated = await teamApi.updateTeamMember(memberId, { memberRole: nextRole })
      setMembers((prev) => prev.map((member) => (member._id === memberId ? updated : member)))
      setActionMessage("Member role updated.")
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Failed to update member role.")
    } finally {
      setUpdatingMemberId(undefined)
    }
  }

  const handleRemoveOrLeaveMember = async (member: teamApi.TeamMember) => {
    const isSelf = member.userId?._id === currentUserId
    if (
      isSelf
        ? !window.confirm("Leave this team? You will lose access until someone adds you again.")
        : !window.confirm(
            `Remove ${member.userId?.username ?? "this member"} from the team? This cannot be undone from here.`
          )
    ) {
      return
    }
    setRemovingMemberId(member._id)
    setError(undefined)
    setActionMessage(undefined)
    try {
      await teamApi.deleteTeamMember(member._id)
      if (isSelf) {
        window.localStorage.removeItem(SELECTED_TEAM_STORAGE_KEY)
        router.push("/personal")
        return
      }
      await loadTeam()
      setActionMessage("Member removed from the team.")
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove member.")
    } finally {
      setRemovingMemberId(undefined)
    }
  }

  const handleAddMember = async (event: React.FormEvent) => {
    event.preventDefault()
    setAddingMember(true)
    setError(undefined)
    setActionMessage(undefined)
    try {
      await teamApi.addTeamMemberByIdentifier({
        teamId,
        identifier: addMemberIdentifier.trim(),
        memberRole: addMemberRole,
      })
      const refreshedMembers = await teamApi.getTeamMembers(teamId)
      setMembers(refreshedMembers)
      setAddMemberIdentifier("")
      setAddMemberRole("member")
      setActionMessage("Member added successfully.")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add member.")
    } finally {
      setAddingMember(false)
    }
  }

  const togglePermission = (controller: TeamRole, target: TeamRole) => {
    setStatusPermissions((prev) => {
      const current = prev[controller]
      return {
        ...prev,
        [controller]: current.includes(target)
          ? current.filter((item) => item !== target)
          : [...current, target],
      }
    })
  }

  const handleSavePermissions = async () => {
    setSavingPermissions(true)
    setError(undefined)
    setActionMessage(undefined)
    try {
      await teamApi.updateTeam(teamId, {
        rolePermissions: { statusManagement: statusPermissions },
      })
      setActionMessage("Role permissions updated.")
    } catch (permissionError) {
      setError(
        permissionError instanceof Error
          ? permissionError.message
          : "Failed to update role permissions."
      )
    } finally {
      setSavingPermissions(false)
    }
  }

  useTeamRealtime({
    teamId,
    onChange: () => {
      void loadTeam()
    },
  })

  usePresenceRealtime((payload) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.userId?._id === payload.userId
          ? {
              ...member,
              userId: {
                ...member.userId,
                status: payload.status,
                lastSeenAt: payload.lastSeenAt,
              },
            }
          : member
      )
    )
  })

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <breadcrumb.Breadcrumb>
            <breadcrumb.BreadcrumbList>
              <breadcrumb.BreadcrumbItem className="hidden md:block">
                <breadcrumb.BreadcrumbLink href={`/team/${teamId}`}>Team</breadcrumb.BreadcrumbLink>
              </breadcrumb.BreadcrumbItem>
              <breadcrumb.BreadcrumbSeparator className="hidden md:block" />
              <breadcrumb.BreadcrumbItem>
                <breadcrumb.BreadcrumbPage>{selectedTeamName ?? "Team"}</breadcrumb.BreadcrumbPage>
              </breadcrumb.BreadcrumbItem>
            </breadcrumb.BreadcrumbList>
          </breadcrumb.Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Team</p>
            <p className="mt-2 text-xl font-semibold">{selectedTeamName ?? "…"}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="mt-2 text-xl font-semibold">{members.length}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="mt-2 text-xl font-semibold">
              {members.filter((member) => member.userId?.status === "active").length}
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
                  disabled={!isOwner}
                />
                <Button
                  onClick={handleTeamNameSave}
                  disabled={!isOwner || savingTeamName || !teamNameDraft.trim()}
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
          {currentUserRole === "owner" || currentUserRole === "admin" ? (
            <form onSubmit={handleAddMember} className="mb-4 grid gap-3 rounded-md border p-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="member-identifier">Add member (username or email)</Label>
                <Input
                  id="member-identifier"
                  value={addMemberIdentifier}
                  onChange={(event) => setAddMemberIdentifier(event.target.value)}
                  placeholder="username or email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="member-role">Role</Label>
                <div className="flex gap-2">
                  <select
                    id="member-role"
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    value={addMemberRole}
                    onChange={(event) => setAddMemberRole(event.target.value as TeamRole)}
                  >
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={addingMember || !addMemberIdentifier.trim()}>
                    {addingMember ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
          {currentUserRole === "owner" || currentUserRole === "admin" ? (
            <div className="mb-4 rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Role Access Control</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Select which target roles each role can change status for.
              </p>
              {(["admin", "moderator"] as const).map((controller) => (
                <div key={controller} className="mb-2 flex items-center gap-3">
                  <span className="w-20 text-sm capitalize">{controller}</span>
                  <div className="flex flex-wrap gap-2">
                    {teamRoles.map((target) => (
                      <label key={`${controller}-${target}`} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={statusPermissions[controller].includes(target)}
                          onChange={() => togglePermission(controller, target)}
                        />
                        <span className="capitalize">{target}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                {savingPermissions ? "Saving..." : "Save role permissions"}
              </Button>
            </div>
          ) : null}
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
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{member.userId?.username ?? "Unknown user"}</p>
                    <p className="text-xs text-muted-foreground">{member.userId?.email ?? "-"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    {canEditMember(member) ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs capitalize"
                          value={member.memberRole}
                          disabled={updatingMemberId === member._id}
                          onChange={(event) =>
                            handleMemberRoleChange(member._id, event.target.value as TeamRole)
                          }
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="member">Member</option>
                        </select>
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
                        {canRemoveOtherMember(member) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={removingMemberId === member._id}
                            onClick={() => void handleRemoveOrLeaveMember(member)}
                          >
                            {removingMemberId === member._id ? "Removing…" : "Remove"}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
                          <span className="capitalize">{getTargetRole(member)}</span>
                          <span className="capitalize">{member.status}</span>
                        </div>
                        {member.userId?._id === currentUserId && getTargetRole(member) !== "owner" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={removingMemberId === member._id}
                            onClick={() => void handleRemoveOrLeaveMember(member)}
                          >
                            {removingMemberId === member._id ? "Leaving…" : "Leave team"}
                          </Button>
                        ) : canRemoveOtherMember(member) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={removingMemberId === member._id}
                            onClick={() => void handleRemoveOrLeaveMember(member)}
                          >
                            {removingMemberId === member._id ? "Removing…" : "Remove"}
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
