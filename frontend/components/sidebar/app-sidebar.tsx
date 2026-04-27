"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavTeamChannels } from "@/components/sidebar/nav-team-channels"
import { NavUser } from "@/components/sidebar/nav-user"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as sheet from "@/components/ui/sheet"
import * as sidebar from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import * as friendApi from "@/lib/friend-api"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import * as teamApi from "@/lib/team-api"
import { useFriendRealtime } from "@/lib/use-friend-realtime"
import { usePresenceRealtime } from "@/lib/use-presence-realtime"
import { useSocket } from "@/lib/use-socket"
import { useTeamRealtime } from "@/lib/use-team-realtime"
import * as remixIconReact from "@remixicon/react"

const SELECTED_TEAM_KEY = "selected-team-id"

function teamLogo(index: number) {
  const logos = [
    <remixIconReact.RiGalleryLine key="gallery" />,
    <remixIconReact.RiPulseLine key="pulse" />,
    <remixIconReact.RiCommandLine key="command" />,
  ]
  return logos[index % logos.length]
}

type SidebarTeamData = {
  selectedTeamId?: string
  selectedTeamName?: string
  selectedTeam?: teamApi.Team
  currentUserId?: string
  currentUserRole?: "owner" | "admin" | "moderator" | "member"
  members: teamApi.TeamMember[]
  loading: boolean
  error?: string
}

type AppSidebarProps = React.ComponentProps<typeof sidebar.Sidebar> & {
  onTeamDataChange?: (data: SidebarTeamData) => void
}

export function AppSidebar({ onTeamDataChange, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const socket = useSocket()
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()
  const [currentUserId, setCurrentUserId] = React.useState("")
  const [user, setUser] = React.useState({
    name: "",
    email: "",
    avatar: "",
  })
  const [teams, setTeams] = React.useState<
    { id: string; name: string; logo: React.ReactNode; plan: string; team: teamApi.Team }[]
  >([])
  const [activeTeamId, setActiveTeamId] = React.useState<string>()
  const [members, setMembers] = React.useState<teamApi.TeamMember[]>([])
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [addFriendOpen, setAddFriendOpen] = React.useState(false)
  const [creatingTeam, setCreatingTeam] = React.useState(false)
  const [newTeamName, setNewTeamName] = React.useState("")
  const [newTeamDescription, setNewTeamDescription] = React.useState("")
  const [friendUsername, setFriendUsername] = React.useState("")
  const [friendRequests, setFriendRequests] = React.useState<
    { _id: string; sender: friendApi.FriendRequestUser }[]
  >([])
  const [unreadByUserId, setUnreadByUserId] = React.useState<Record<string, number>>({})

  const teamFromPath = pathname?.match(/^\/team\/([^/]+)/)?.[1]
  const effectiveTeamId = pathname?.startsWith("/personal")
    ? undefined
    : (teamFromPath ?? activeTeamId)
  const dmChatPathPrefix = effectiveTeamId ? `/team/${effectiveTeamId}/chat` : "/personal/chat"

  const loadPersonalData = React.useCallback(
    async (meId: string) => {
      const requests = await friendApi.listFriendRequests()
      const acceptedUsers = requests
        .filter((request) => request.status === "accepted")
        .map((request) => {
          const sender = request.senderId
          const receiver = request.receiverId
          if (typeof sender === "object" && sender._id !== meId) return sender
          if (typeof receiver === "object" && receiver._id !== meId) return receiver
          return undefined
        })
        .filter((value): value is friendApi.FriendRequestUser => Boolean(value))
      const incomingPending = requests
        .filter(
          (request) =>
            request.status === "pending" &&
            typeof request.receiverId === "object" &&
            request.receiverId._id === meId &&
            typeof request.senderId === "object"
        )
        .map((request) => ({ _id: request._id, sender: request.senderId as friendApi.FriendRequestUser }))
      setFriendRequests(incomingPending)
      setMembers(
        acceptedUsers.map((friend) => ({
          _id: friend._id,
          teamId: "personal",
          userId: friend,
          memberRole: "member",
          status: "active",
          joinedAt: new Date().toISOString(),
        }))
      )
      onTeamDataChange?.({
        currentUserId: meId,
        selectedTeamId: undefined,
        selectedTeamName: undefined,
        selectedTeam: undefined,
        currentUserRole: undefined,
        members: acceptedUsers.map((friend) => ({
          _id: friend._id,
          teamId: "personal",
          userId: friend,
          memberRole: "member",
          status: "active",
          joinedAt: new Date().toISOString(),
        })),
        loading: false,
      })
    },
    [onTeamDataChange]
  )

  const refreshTeams = React.useCallback(async () => {
    const fetchedTeams = await teamApi.getTeams()
    setTeams(
      fetchedTeams
        .filter((team) => team.teamType !== "personal")
        .map((team, index) => ({
          id: team._id,
          name: team.teamName,
          logo: teamLogo(index),
          plan: team.description || "Team",
          team,
        }))
    )
  }, [])

  const refreshActiveContext = React.useCallback(async () => {
    if (!currentUserId) return
    const pathTeam =
      typeof window !== "undefined" ? window.location.pathname.match(/^\/team\/([^/]+)/)?.[1] : undefined
    const targetTeamId = pathTeam ?? activeTeamId
    if (!targetTeamId) {
      await loadPersonalData(currentUserId)
      return
    }
    const selectedTeam = teams.find((team) => team.id === targetTeamId)
    const fetchedMembers = await teamApi.getTeamMembers(targetTeamId)
    setMembers(fetchedMembers)
    const membership = fetchedMembers.find((member) => member.userId?._id === currentUserId)
    const currentUserRole = selectedTeam?.team.createdBy === currentUserId
      ? "owner"
      : membership?.memberRole
    onTeamDataChange?.({
      selectedTeamId: targetTeamId,
      selectedTeamName: selectedTeam?.name,
      selectedTeam: selectedTeam?.team,
      currentUserId,
      currentUserRole,
      members: fetchedMembers,
      loading: false,
    })
  }, [activeTeamId, currentUserId, loadPersonalData, onTeamDataChange, teams])

  React.useEffect(() => {
    const stored = window.localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const resolvedTheme = stored === "dark" || stored === "light"
      ? stored
      : prefersDark
        ? "dark"
        : "light"
    setTheme(resolvedTheme)
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  }, [])

  React.useEffect(() => {
    let mounted = true

    const loadSidebarData = async () => {
      setLoading(true)
      setError(undefined)
      onTeamDataChange?.({ members: [], loading: true })
      try {
        const [currentUser, fetchedTeams] = await Promise.all([
          teamApi.getCurrentUser(),
          teamApi.getTeams(),
        ])

        if (!mounted) return

        setUser({
          name: currentUser.username,
          email: currentUser.email,
          avatar: currentUser.profilePic || "",
        })
        setCurrentUserId(currentUser._id)

        const mappedTeams = fetchedTeams
          .filter((team) => team.teamType !== "personal")
          .map((team, index) => ({
            id: team._id,
            name: team.teamName,
            logo: teamLogo(index),
            plan: team.description || "Team",
            team,
          }))
        setTeams(mappedTeams)

        const storedTeamId = window.localStorage.getItem(SELECTED_TEAM_KEY)
        const selectedTeam = mappedTeams.find((team) => team.id === storedTeamId)
        const selectedTeamId = selectedTeam?.id
        setActiveTeamId(selectedTeamId)

        if (selectedTeamId) {
          window.localStorage.setItem(SELECTED_TEAM_KEY, selectedTeamId)
          const fetchedMembers = await teamApi.getTeamMembers(selectedTeamId)
          if (!mounted) return
          setMembers(fetchedMembers)
          const membership = fetchedMembers.find((member) => member.userId?._id === currentUser._id)
          const currentUserRole = selectedTeam.team.createdBy === currentUser._id
            ? "owner"
            : membership?.memberRole
          onTeamDataChange?.({
            selectedTeamId,
            selectedTeamName: selectedTeam.name,
            selectedTeam: selectedTeam.team,
            currentUserId: currentUser._id,
            currentUserRole,
            members: fetchedMembers,
            loading: false,
          })
        } else {
          window.localStorage.removeItem(SELECTED_TEAM_KEY)
          await loadPersonalData(currentUser._id)
        }
      } catch (fetchError) {
        if (!mounted) return
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load sidebar data."
        setError(message)
        setMembers([])
        onTeamDataChange?.({ error: message, members: [], loading: false })
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    void loadSidebarData()
    return () => {
      mounted = false
    }
  }, [onTeamDataChange, loadPersonalData, refreshTeams])

  const handleTeamChange = async (teamId: string) => {
    router.push(`/team/${teamId}`)
    setActiveTeamId(teamId)
    window.localStorage.setItem(SELECTED_TEAM_KEY, teamId)
    setLoading(true)
    setError(undefined)
    onTeamDataChange?.({ selectedTeamId: teamId, members: [], loading: true })
    try {
      const fetchedMembers = await teamApi.getTeamMembers(teamId)
      const selectedTeam = teams.find((team) => team.id === teamId)
      const membership = fetchedMembers.find((member) => member.userId?._id === currentUserId)
      const currentUserRole = selectedTeam?.team.createdBy === currentUserId
        ? "owner"
        : membership?.memberRole
      setMembers(fetchedMembers)
      onTeamDataChange?.({
        selectedTeamId: teamId,
        members: fetchedMembers,
        selectedTeamName: selectedTeam?.name,
        selectedTeam: selectedTeam?.team,
        currentUserId,
        currentUserRole,
        loading: false,
      })
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load team members."
      setError(message)
      setMembers([])
      onTeamDataChange?.({ selectedTeamId: teamId, members: [], error: message, loading: false })
    } finally {
      setLoading(false)
    }
  }

  const handlePersonalSpaceSelect = () => {
    router.push("/personal")
    setActiveTeamId(undefined)
    window.localStorage.removeItem(SELECTED_TEAM_KEY)
    setError(undefined)
    void loadPersonalData(currentUserId)
  }

  const handleAddTeam = () => {
    setCreateTeamOpen(true)
  }

  const handleCreateTeamSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newTeamName.trim()) {
      setError("Team name is required.")
      return
    }
    setCreatingTeam(true)
    try {
      const createdTeam = await teamApi.createTeam({
        teamName: newTeamName.trim(),
        description: newTeamDescription.trim(),
      })
      const nextTeam = {
        id: createdTeam._id,
        name: createdTeam.teamName,
        logo: teamLogo(teams.length),
        plan: createdTeam.description || "Team",
        team: createdTeam,
      }
      setTeams((prev) => [nextTeam, ...prev])
      await handleTeamChange(nextTeam.id)
      setNewTeamName("")
      setNewTeamDescription("")
      setCreateTeamOpen(false)
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to create team."
      setError(message)
      onTeamDataChange?.({ members: [], error: message, loading: false })
    } finally {
      setCreatingTeam(false)
    }
  }

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
  }

  const handleAddFriend = async () => {
    if (!friendUsername.trim()) return
    setError(undefined)
    try {
      await friendApi.createFriendRequestByUsername(friendUsername.trim())
      setFriendUsername("")
      setAddFriendOpen(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send friend request.")
    }
  }

  const handleIncomingRequest = async (requestId: string, status: "accepted" | "rejected") => {
    setError(undefined)
    try {
      await friendApi.updateFriendRequestStatus(requestId, status)
      await loadPersonalData(currentUserId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update friend request."
      )
    }
  }

  const mappedUsers = members
    .map((member) => ({
      id: member.userId?._id ?? member._id,
      username: member.userId?.username ?? "unknown",
      profilePic: member.userId?.profilePic || "",
      isActive: member.userId?.status === "active",
      status: member.userId?.status,
      lastSeenAt: member.userId?.lastSeenAt ?? member.userId?.updatedAt,
      unreadCount: unreadByUserId[member.userId?._id ?? member._id] ?? 0,
    }))
    .filter((member) => member.id !== currentUserId)

  React.useEffect(() => {
    let openDmUsername: string | undefined
    const personalMatch = pathname?.match(/^\/personal\/chat\/([^/]+)$/)
    const teamDmMatch = pathname?.match(/^\/team\/[^/]+\/chat\/([^/]+)$/)
    if (personalMatch?.[1]) openDmUsername = decodeURIComponent(personalMatch[1])
    else if (teamDmMatch?.[1]) openDmUsername = decodeURIComponent(teamDmMatch[1])
    if (!openDmUsername) return
    const activeUser = mappedUsers.find((member) => member.username === openDmUsername)
    if (!activeUser) return
    setUnreadByUserId((prev) => {
      if (!prev[activeUser.id]) return prev
      return { ...prev, [activeUser.id]: 0 }
    })
  }, [mappedUsers, pathname])

  React.useEffect(() => {
    const validIds = new Set(
      members
        .map((member) => member.userId?._id ?? member._id)
        .filter((id) => id !== currentUserId)
    )
    setUnreadByUserId((prev) => {
      const next: Record<string, number> = {}
      for (const [userId, count] of Object.entries(prev)) {
        if (validIds.has(userId) && count > 0) next[userId] = count
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length === nextKeys.length) {
        const unchanged = prevKeys.every((key) => prev[key] === next[key])
        if (unchanged) return prev
      }
      return next
    })
  }, [currentUserId, members])

  React.useEffect(() => {
    if (!socket) return
    const onMessageNew = (payload: {
      senderId?: string
      conversationId?: string
      _meta?: { fromUserId?: string; fromUsername?: string }
    }) => {
      const senderId = payload?._meta?.fromUserId ?? payload?.senderId
      if (!senderId || senderId === currentUserId) return
      const sender = mappedUsers.find((member) => member.id === senderId)
      if (!sender) return
      let openDmUsername: string | undefined
      const personalMatch = pathname?.match(/^\/personal\/chat\/([^/]+)$/)
      const teamDmMatch = pathname?.match(/^\/team\/[^/]+\/chat\/([^/]+)$/)
      if (personalMatch?.[1]) openDmUsername = decodeURIComponent(personalMatch[1])
      else if (teamDmMatch?.[1]) openDmUsername = decodeURIComponent(teamDmMatch[1])
      const inSameDm = openDmUsername && sender.username === openDmUsername
      const channelMatch = pathname?.match(/^\/team\/[^/]+\/c\/([^/]+)$/)
      const openChannelId = channelMatch?.[1]
      const inSameChannel =
        openChannelId &&
        payload.conversationId &&
        String(payload.conversationId) === openChannelId
      if (inSameDm || inSameChannel) return
      setUnreadByUserId((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] ?? 0) + 1,
      }))
    }
    socket.on(SOCKET_EVENTS.messageNew, onMessageNew)
    return () => {
      socket.off(SOCKET_EVENTS.messageNew, onMessageNew)
    }
  }, [currentUserId, mappedUsers, pathname, socket])

  React.useEffect(() => {
    if (!pathname?.startsWith("/personal")) return
    setActiveTeamId(undefined)
    window.localStorage.removeItem(SELECTED_TEAM_KEY)
    if (currentUserId) void loadPersonalData(currentUserId)
  }, [pathname, currentUserId, loadPersonalData])

  const teamPathSyncKey = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!currentUserId) return
    const m = pathname?.match(/^\/team\/([^/]+)/)
    if (!m?.[1]) {
      teamPathSyncKey.current = null
      return
    }
    const id = m[1]
    const teamMetaReady = teams.some((team) => team.id === id)
    const syncKey = `${id}:${teamMetaReady ? "1" : "0"}`
    if (teamPathSyncKey.current === syncKey) return
    teamPathSyncKey.current = syncKey
    setActiveTeamId(id)
    window.localStorage.setItem(SELECTED_TEAM_KEY, id)
    setLoading(true)
    setError(undefined)
    onTeamDataChange?.({ selectedTeamId: id, members: [], loading: true })
    void (async () => {
      try {
        const fetchedMembers = await teamApi.getTeamMembers(id)
        const selectedTeam = teams.find((team) => team.id === id)
        const membership = fetchedMembers.find((member) => member.userId?._id === currentUserId)
        const currentUserRole = selectedTeam?.team.createdBy === currentUserId
          ? "owner"
          : membership?.memberRole
        setMembers(fetchedMembers)
        onTeamDataChange?.({
          selectedTeamId: id,
          members: fetchedMembers,
          selectedTeamName: selectedTeam?.name,
          selectedTeam: selectedTeam?.team,
          currentUserId,
          currentUserRole,
          loading: false,
        })
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Failed to load team members."
        setError(message)
        setMembers([])
        onTeamDataChange?.({ selectedTeamId: id, members: [], error: message, loading: false })
      } finally {
        setLoading(false)
      }
    })()
  }, [pathname, teams, currentUserId, onTeamDataChange])

  const joinedTeamSocketRoomsRef = React.useRef<Set<string>>(new Set())
  const socketRef = React.useRef(socket)
  socketRef.current = socket

  const teamIdsSocketKey = React.useMemo(
    () => JSON.stringify([...teams.map((t) => t.id)].sort()),
    [teams]
  )

  React.useEffect(() => {
    if (!socket) return
    const next = new Set(JSON.parse(teamIdsSocketKey) as string[])
    const prev = joinedTeamSocketRoomsRef.current
    for (const id of prev) {
      if (!next.has(id)) {
        socket.emit(SOCKET_EVENTS.roomLeave, { type: "team", id })
      }
    }
    for (const id of next) {
      if (!prev.has(id)) {
        socket.emit(SOCKET_EVENTS.roomJoin, { type: "team", id })
      }
    }
    joinedTeamSocketRoomsRef.current = next
  }, [socket, teamIdsSocketKey])

  React.useEffect(() => {
    return () => {
      const s = socketRef.current
      if (!s) return
      for (const id of joinedTeamSocketRoomsRef.current) {
        s.emit(SOCKET_EVENTS.roomLeave, { type: "team", id })
      }
      joinedTeamSocketRoomsRef.current = new Set()
    }
  }, [])

  const onTeamSocketChange = React.useCallback(async () => {
    await refreshTeams()
    await refreshActiveContext()
  }, [refreshTeams, refreshActiveContext])

  useTeamRealtime({
    teamId: effectiveTeamId,
    onChange: onTeamSocketChange,
  })
  useFriendRealtime(() => {
    if (!effectiveTeamId) void refreshActiveContext()
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
      <sidebar.Sidebar collapsible="icon" {...props}>
        <sidebar.SidebarHeader>
          <TeamSwitcher
            teams={teams}
            activeTeamId={teamFromPath ?? activeTeamId}
            onTeamChange={handleTeamChange}
            onPersonalSpaceSelect={handlePersonalSpaceSelect}
            onAddTeam={handleAddTeam}
          />
        </sidebar.SidebarHeader>
        <sidebar.SidebarContent>
          {!effectiveTeamId ? (
            <sidebar.SidebarGroup className="px-2">
              <sidebar.SidebarMenu>
                <sidebar.SidebarMenuItem>
                  <sidebar.SidebarMenuButton
                    size="lg"
                    tooltip="Add friend"
                    onClick={() => setAddFriendOpen(true)}
                  >
                    <remixIconReact.RiUserAddLine />
                    <span className="group-data-[collapsible=icon]:hidden">Add Friend</span>
                  </sidebar.SidebarMenuButton>
                </sidebar.SidebarMenuItem>
              </sidebar.SidebarMenu>
            </sidebar.SidebarGroup>
          ) : null}
          {effectiveTeamId ? (
            <NavTeamChannels
              teamId={effectiveTeamId}
              isOwner={
                teams.find((team) => team.id === effectiveTeamId)?.team.createdBy === currentUserId
              }
            />
          ) : null}
          <NavMain
            users={mappedUsers}
            dmPathPrefix={dmChatPathPrefix}
            label={effectiveTeamId ? "Team Members" : "Personal Contacts"}
            emptyMessage={
              effectiveTeamId
                ? "No users in this team yet"
                : "No friends yet. Add a friend to start private chat."
            }
          />
          {loading ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
          ) : null}
          {error ? (
            <div className="px-4 py-2 text-sm text-destructive">{error}</div>
          ) : null}
        </sidebar.SidebarContent>
        <sidebar.SidebarFooter>
          <NavUser user={user} theme={theme} onToggleTheme={toggleTheme} />
        </sidebar.SidebarFooter>
        <sidebar.SidebarRail />
      </sidebar.Sidebar>
      <sheet.Sheet open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <sheet.SheetContent side="right">
          <sheet.SheetHeader>
            <sheet.SheetTitle>Create Team</sheet.SheetTitle>
            <sheet.SheetDescription>
              Create a team and switch to it immediately.
            </sheet.SheetDescription>
          </sheet.SheetHeader>
          <form className="flex flex-1 flex-col gap-4 px-4" onSubmit={handleCreateTeamSubmit}>
            <div className="space-y-1">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={newTeamDescription}
                onChange={(event) => setNewTeamDescription(event.target.value)}
                placeholder="Optional team description"
              />
            </div>
            <sheet.SheetFooter>
              <Button type="submit" disabled={creatingTeam}>
                {creatingTeam ? "Creating..." : "Create team"}
              </Button>
            </sheet.SheetFooter>
          </form>
        </sheet.SheetContent>
      </sheet.Sheet>
      <sheet.Sheet open={addFriendOpen} onOpenChange={setAddFriendOpen}>
        <sheet.SheetContent side="right">
          <sheet.SheetHeader>
            <sheet.SheetTitle>Add Friend</sheet.SheetTitle>
            <sheet.SheetDescription>Send a friend request using username.</sheet.SheetDescription>
          </sheet.SheetHeader>
          <div className="space-y-4 px-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="friend-username">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="friend-username"
                  value={friendUsername}
                  onChange={(event) => setFriendUsername(event.target.value)}
                  placeholder="username"
                />
                <Button size="sm" onClick={handleAddFriend} disabled={!friendUsername.trim()}>
                  Add
                </Button>
              </div>
            </div>
            {friendRequests.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Incoming Requests</p>
                {friendRequests.map((request) => (
                  <div key={request._id} className="rounded-md border p-2">
                    <p className="text-xs">{request.sender.username}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="xs" onClick={() => handleIncomingRequest(request._id, "accepted")}>
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleIncomingRequest(request._id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </sheet.SheetContent>
      </sheet.Sheet>
    </>
  )
}
