"use client"

import * as breadcrumb from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  mergeTeamMemberIntoList,
  removeTeamMemberFromList,
  teamMemberFromSocketPayload,
} from "@/lib/team-member-socket-merge"
import * as teamApi from "@/lib/team-api"
import { usePresenceRealtime } from "@/lib/use-presence-realtime"
import { useTeamRealtime } from "@/lib/use-team-realtime"
import { cn } from "@/lib/utils"
import { RiUserAddLine } from "@remixicon/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

const SELECTED_TEAM_STORAGE_KEY = "selected-team-id"

type TeamRole = "owner" | "admin" | "moderator" | "member"
const teamRoles: TeamRole[] = ["owner", "admin", "moderator", "member"]

export type TeamDashboardMode = "admin" | "moderation"

export function TeamDashboardPanel({
  teamId,
  dashboardMode = "admin",
}: {
  teamId: string
  dashboardMode?: TeamDashboardMode
}) {
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
  const [createChannelRoles, setCreateChannelRoles] = React.useState<TeamRole[]>(["owner"])
  const [error, setError] = React.useState<string>()
  const [actionMessage, setActionMessage] = React.useState<string>()
  const [accessDenied, setAccessDenied] = React.useState(false)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string>()

  const isOwner = Boolean(selectedTeam && currentUserId && selectedTeam.createdBy === currentUserId)
  const isStaff = Boolean(
    currentUserRole && ["owner", "admin", "moderator"].includes(currentUserRole)
  )

  const selectedTeamRef = React.useRef(selectedTeam)
  selectedTeamRef.current = selectedTeam
  const currentUserIdRef = React.useRef(currentUserId)
  currentUserIdRef.current = currentUserId

  const loadTeam = React.useCallback(async (mode: "full" | "silent" = "full") => {
    const silent = mode === "silent"
    if (!silent) {
      setLoading(true)
      setError(undefined)
      setAccessDenied(false)
    }
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
      const ownerUser = team.createdBy === me._id
      const activeAdmin = membership?.status === "active" && membership.memberRole === "admin"
      const activeModerator = membership?.status === "active" && membership.memberRole === "moderator"
      const adminDashboardOk = ownerUser || activeAdmin
      const moderationDashboardOk = activeModerator
      const hasAccess =
        dashboardMode === "admin" ? adminDashboardOk : moderationDashboardOk
      setAccessDenied(!hasAccess)
      const role = ownerUser
        ? "owner"
        : membership?.status === "active"
          ? membership.memberRole
          : undefined
      setCurrentUserRole(role as TeamRole | undefined)
      setStatusPermissions({
        owner: team.rolePermissions?.statusManagement?.owner ?? ["owner", "admin", "moderator", "member"],
        admin: team.rolePermissions?.statusManagement?.admin ?? ["moderator", "member"],
        moderator: team.rolePermissions?.statusManagement?.moderator ?? ["member"],
        member: team.rolePermissions?.statusManagement?.member ?? [],
      })
      const channelCreators = team.rolePermissions?.channelManagement?.createChannel
      setCreateChannelRoles(
        Array.isArray(channelCreators) && channelCreators.length > 0
          ? [...channelCreators]
          : ["owner"]
      )
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load team.")
      setMembers([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dashboardMode, teamId])

  React.useEffect(() => {
    void loadTeam("full")
  }, [loadTeam])

  React.useEffect(() => {
    if (currentUserRole === "moderator" && addMemberRole !== "member") {
      setAddMemberRole("member")
    }
  }, [currentUserRole, addMemberRole])

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

  const assignableRolesForMemberRow = (member: teamApi.TeamMember): TeamRole[] => {
    if (!currentUserRole || !canEditMember(member)) return []
    const rowRole = member.memberRole
    const ordered: TeamRole[] = ["member", "moderator", "admin", "owner"]
    const next: TeamRole[] = []
    for (const r of ordered) {
      if (canManageTarget(r) && roleRank[currentUserRole] > roleRank[r]) {
        next.push(r)
      }
    }
    if (next.length === 0) return []
    if (!next.includes(rowRole)) {
      return [...next, rowRole].sort((a, b) => roleRank[b] - roleRank[a])
    }
    return next
  }

  const isModerationUi = dashboardMode === "moderation"
  const dashboardCrumb = isModerationUi ? "Moderation" : "Admin"
  const dashboardTitle = isModerationUi ? "Moderation" : "Space admin"
  const dashboardSubtitle = isModerationUi
    ? "Invite members and update roster status for people you are allowed to moderate. Role and permission matrix are managed by admins."
    : "Manage membership, roles, and roster status (including bans) for this space."

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
    nextStatus: "pending" | "active" | "removed" | "banned"
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
      await loadTeam("silent")
      setActionMessage("Member removed from the team.")
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove member.")
    } finally {
      setRemovingMemberId(undefined)
    }
  }

  const handleAddMember = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setAddingMember(true)
    setInviteError(undefined)
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
      setInviteOpen(false)
      setActionMessage("Member added successfully.")
    } catch (addError) {
      setInviteError(addError instanceof Error ? addError.message : "Failed to add member.")
    } finally {
      setAddingMember(false)
    }
  }

  const inviteRoleOptions = React.useMemo(() => {
    const base: { id: TeamRole; label: string; hint: string }[] = [
      { id: "member", label: "Member", hint: "Chat, channels, and DMs in this space." },
    ]
    if (currentUserRole === "owner" || currentUserRole === "admin") {
      base.push(
        { id: "moderator", label: "Moderator", hint: "Invite members and moderate the roster." },
        { id: "admin", label: "Admin", hint: "Manage settings, roles, and permissions." }
      )
    }
    return base
  }, [currentUserRole])

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

  const toggleCreateChannelRole = (role: TeamRole) => {
    if (role === "owner") return
    setCreateChannelRoles((prev) => {
      const withOwner = prev.includes("owner") ? prev : (["owner", ...prev] as TeamRole[])
      return withOwner.includes(role)
        ? withOwner.filter((r) => r !== role)
        : [...withOwner, role]
    })
  }

  const handleSavePermissions = async () => {
    setSavingPermissions(true)
    setError(undefined)
    setActionMessage(undefined)
    try {
      const rolePermissions: NonNullable<Parameters<typeof teamApi.updateTeam>[1]["rolePermissions"]> = {
        statusManagement: statusPermissions,
      }
      if (isOwner) {
        const withOwner = createChannelRoles.includes("owner")
          ? createChannelRoles
          : (["owner", ...createChannelRoles] as TeamRole[])
        rolePermissions.channelManagement = { createChannel: withOwner }
      }
      await teamApi.updateTeam(teamId, {
        rolePermissions,
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

  const applySocketMemberUpsert = React.useCallback(
    (raw: unknown) => {
      const incoming = teamMemberFromSocketPayload(raw)
      if (!incoming || incoming.teamId !== teamId) return
      setMembers((prev) => mergeTeamMemberIntoList(prev, incoming))

      const me = currentUserIdRef.current
      const st = selectedTeamRef.current
      if (!me || incoming.userId._id !== me) return
      if (st?.createdBy === me) return
      const adminOk = incoming.status === "active" && incoming.memberRole === "admin"
      const modOk = incoming.status === "active" && incoming.memberRole === "moderator"
      const stillIn = dashboardMode === "admin" ? adminOk : modOk
      setCurrentUserRole(incoming.memberRole as TeamRole)
      setAccessDenied(!stillIn)
    },
    [dashboardMode, teamId]
  )

  const applySocketMemberRemoved = React.useCallback(
    (raw: unknown) => {
      const payload = raw as { _id?: string; teamId?: string; userId?: string }
      const removedId = payload._id
      if (!removedId || String(payload.teamId) !== teamId) return
      setMembers((prev) => removeTeamMemberFromList(prev, removedId))
      if (payload.userId && payload.userId === currentUserIdRef.current) {
        window.localStorage.removeItem(SELECTED_TEAM_STORAGE_KEY)
        router.push("/personal")
      }
    },
    [router, teamId]
  )

  useTeamRealtime({
    teamId,
    onTeamMemberCreated: applySocketMemberUpsert,
    onTeamMemberUpdated: applySocketMemberUpsert,
    onTeamMemberRemoved: applySocketMemberRemoved,
    onTeamUpdated: () => {
      void loadTeam("silent")
    },
    onTeamDeleted: () => {
      void loadTeam("silent")
    },
    onTeamCreated: () => {
      void loadTeam("silent")
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading space admin…
      </div>
    )
  }

  if (accessDenied) {
    const deniedBody =
      dashboardMode === "moderation"
        ? "Only users with the moderator role can open the moderation dashboard."
        : "Only the space owner and admins can open the admin dashboard. If you are a moderator, use Moderation from the sidebar instead."
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-lg font-medium">Access denied</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{deniedBody}</p>
        <Button asChild variant="outline">
          <Link href={`/team/${teamId}`}>Back to space</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <breadcrumb.Breadcrumb>
            <breadcrumb.BreadcrumbList>
              <breadcrumb.BreadcrumbItem className="hidden md:block">
                <breadcrumb.BreadcrumbLink href={`/team/${teamId}`}>Space</breadcrumb.BreadcrumbLink>
              </breadcrumb.BreadcrumbItem>
              <breadcrumb.BreadcrumbSeparator className="hidden md:block" />
              <breadcrumb.BreadcrumbItem>
                <breadcrumb.BreadcrumbPage>{dashboardCrumb}</breadcrumb.BreadcrumbPage>
              </breadcrumb.BreadcrumbItem>
              <breadcrumb.BreadcrumbSeparator className="hidden md:block" />
              <breadcrumb.BreadcrumbItem className="hidden md:block">
                <breadcrumb.BreadcrumbPage>{selectedTeamName ?? "…"}</breadcrumb.BreadcrumbPage>
              </breadcrumb.BreadcrumbItem>
            </breadcrumb.BreadcrumbList>
          </breadcrumb.Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Space</p>
            <p className="mt-2 text-xl font-semibold">{selectedTeamName ?? "…"}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Roster</p>
            <p className="mt-2 text-xl font-semibold">{members.length}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Online now</p>
            <p className="mt-2 text-xl font-semibold">
              {members.filter((member) => member.userId?.status === "active").length}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Pending / banned</p>
            <p className="mt-2 text-xl font-semibold">
              {members.filter((m) => m.status === "pending").length} /{" "}
              {members.filter((m) => m.status === "banned").length}
            </p>
          </div>
        </div>
        <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{dashboardTitle}</h2>
              {currentUserRole ? (
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Your role:{" "}
                  <span className="normal-case text-foreground">{currentUserRole}</span>
                </p>
              ) : null}
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{dashboardSubtitle}</p>
          <div
            className={cn(
              "mb-4 grid gap-3",
              isOwner ? "md:grid-cols-2" : "md:grid-cols-1"
            )}
          >
            {isOwner ? (
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
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="member-search">Search members</Label>
              <Input
                id="member-search"
                placeholder="Search by username or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {isStaff ? (
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setInviteError(undefined)
                  setInviteOpen(true)
                }}
                className="gap-2 rounded-full px-5 shadow-sm"
              >
                <RiUserAddLine className="size-4" />
                Invite people
              </Button>
              <Dialog
                open={inviteOpen}
                onOpenChange={(open) => {
                  setInviteOpen(open)
                  if (!open) {
                    setInviteError(undefined)
                    setAddMemberIdentifier("")
                    setAddMemberRole("member")
                  }
                }}
              >
                <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
                  <DialogHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15">
                        <RiUserAddLine className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1 pr-10">
                        <DialogTitle>Invite people</DialogTitle>
                        <DialogDescription>
                          Add someone by username or email. They will appear in the roster with the role you choose.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <form
                    className="space-y-6 px-6 py-6"
                    onSubmit={(e) => {
                      void handleAddMember(e)
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="member-identifier" className="text-sm font-medium">
                        Username or email
                      </Label>
                      <Input
                        id="member-identifier"
                        value={addMemberIdentifier}
                        onChange={(event) => setAddMemberIdentifier(event.target.value)}
                        placeholder="e.g. alex or alex@example.com"
                        autoComplete="off"
                        className="h-11 rounded-xl border-0 bg-muted/50 ring-1 ring-border/80 transition-shadow placeholder:text-muted-foreground/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Role</Label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {inviteRoleOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setAddMemberRole(option.id)}
                            className={cn(
                              "flex flex-col rounded-xl border px-3 py-3 text-left text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                              addMemberRole === option.id
                                ? "border-primary/60 bg-primary/8 font-medium text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                                : "border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <span className="capitalize text-foreground">{option.label}</span>
                            <span className="mt-1 text-[11px] leading-snug font-normal text-muted-foreground">
                              {option.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
                    <DialogFooter className="border-0 bg-transparent p-0 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setInviteOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-full px-6"
                        disabled={addingMember || !addMemberIdentifier.trim()}
                      >
                        {addingMember ? "Adding…" : "Add to space"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
          {currentUserRole === "owner" || currentUserRole === "admin" ? (
            <div className="mb-4 rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Role Access Control</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Roster matrix: which target roles each staff role may set status for (invite acceptance,
                active, banned, removed) and which member roles they may reassign or remove. Channel creation
                is controlled separately below (space owner only).
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
              {isOwner ? (
                <div className="mb-3 mt-4 border-t pt-3">
                  <p className="mb-1 text-sm font-medium">Who can create channels</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    The space owner may always create channels. Grant this to other roles when you want
                    delegated structure (for example admins running projects without bothering the owner).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input type="checkbox" checked disabled />
                      <span className="capitalize">Owner</span>
                    </label>
                    {(["admin", "moderator", "member"] as const).map((role) => (
                      <label key={`create-${role}`} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={createChannelRoles.includes(role)}
                          onChange={() => toggleCreateChannelRole(role)}
                        />
                        <span className="capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                {savingPermissions ? "Saving..." : "Save role permissions"}
              </Button>
            </div>
          ) : null}
          {actionMessage ? <p className="mb-2 text-sm text-emerald-600">{actionMessage}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!error && filteredMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users for this team yet.</p>
          ) : null}
          {!error && filteredMembers.length > 0 ? (
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
                        {(() => {
                          const roleChoices = assignableRolesForMemberRow(member)
                          if (roleChoices.length === 0) return null
                          if (
                            roleChoices.length === 1
                            && roleChoices[0] === member.memberRole
                          ) {
                            return (
                              <span className="rounded-md border border-transparent bg-muted/50 px-2 py-1 text-xs capitalize text-muted-foreground">
                                {member.memberRole}
                              </span>
                            )
                          }
                          return (
                            <select
                              className="h-8 rounded-md border bg-background px-2 text-xs capitalize"
                              value={member.memberRole}
                              disabled={updatingMemberId === member._id}
                              onChange={(event) =>
                                handleMemberRoleChange(member._id, event.target.value as TeamRole)
                              }
                            >
                              {roleChoices.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )
                        })()}
                        <select
                          className="h-8 rounded-md border bg-background px-2 text-xs"
                          value={member.status}
                          disabled={updatingMemberId === member._id}
                          onChange={(event) =>
                            handleMemberStatusChange(
                              member._id,
                              event.target.value as "pending" | "active" | "removed" | "banned"
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="banned">Banned</option>
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
