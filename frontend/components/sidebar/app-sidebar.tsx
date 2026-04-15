"use client"

import * as React from "react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  createFriendRequestByUsername,
  listFriendRequests,
  type FriendRequestUser,
  updateFriendRequestStatus,
} from "@/lib/friend-api"
import {
  createTeam,
  getCurrentUser,
  getTeamMembers,
  getTeams,
  type Team,
  type TeamMember,
} from "@/lib/team-api"
import * as sidebar from "@/components/ui/sidebar"
import * as remixicon from "@remixicon/react"

const SELECTED_TEAM_KEY = "selected-team-id"

function teamLogo(index: number) {
  const logos = [
    <remixicon.RiGalleryLine key="gallery" />,
    <remixicon.RiPulseLine key="pulse" />,
    <remixicon.RiCommandLine key="command" />,
  ]
  return logos[index % logos.length]
}

type SidebarTeamData = {
  selectedTeamId?: string
  selectedTeamName?: string
  selectedTeam?: Team
  currentUserId?: string
  currentUserRole?: "owner" | "admin" | "moderator" | "member"
  members: TeamMember[]
  loading: boolean
  error?: string
}

type AppSidebarProps = React.ComponentProps<typeof sidebar.Sidebar> & {
  onTeamDataChange?: (data: SidebarTeamData) => void
}

export function AppSidebar({ onTeamDataChange, ...props }: AppSidebarProps) {
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
    { id: string; name: string; logo: React.ReactNode; plan: string; team: Team }[]
  >([])
  const [activeTeamId, setActiveTeamId] = React.useState<string>()
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [creatingTeam, setCreatingTeam] = React.useState(false)
  const [newTeamName, setNewTeamName] = React.useState("")
  const [newTeamDescription, setNewTeamDescription] = React.useState("")
  const [friendUsername, setFriendUsername] = React.useState("")
  const [friendRequests, setFriendRequests] = React.useState<
    { _id: string; sender: FriendRequestUser }[]
  >([])

  const loadPersonalData = React.useCallback(
    async (meId: string) => {
      const requests = await listFriendRequests()
      const acceptedUsers = requests
        .filter((request) => request.status === "accepted")
        .map((request) => {
          const sender = request.senderId
          const receiver = request.receiverId
          if (typeof sender === "object" && sender._id !== meId) return sender
          if (typeof receiver === "object" && receiver._id !== meId) return receiver
          return undefined
        })
        .filter((value): value is FriendRequestUser => Boolean(value))
      const incomingPending = requests
        .filter(
          (request) =>
            request.status === "pending" &&
            typeof request.receiverId === "object" &&
            request.receiverId._id === meId &&
            typeof request.senderId === "object"
        )
        .map((request) => ({ _id: request._id, sender: request.senderId as FriendRequestUser }))
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
          getCurrentUser(),
          getTeams(),
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
          const fetchedMembers = await getTeamMembers(selectedTeamId)
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
  }, [onTeamDataChange, loadPersonalData])

  const handleTeamChange = async (teamId: string) => {
    setActiveTeamId(teamId)
    window.localStorage.setItem(SELECTED_TEAM_KEY, teamId)
    setLoading(true)
    setError(undefined)
    onTeamDataChange?.({ selectedTeamId: teamId, members: [], loading: true })
    try {
      const fetchedMembers = await getTeamMembers(teamId)
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
      const createdTeam = await createTeam({
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
      await createFriendRequestByUsername(friendUsername.trim())
      setFriendUsername("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send friend request.")
    }
  }

  const handleIncomingRequest = async (requestId: string, status: "accepted" | "rejected") => {
    setError(undefined)
    try {
      await updateFriendRequestStatus(requestId, status)
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
    }))
    .filter((member) => member.id !== currentUserId)

  return (
    <>
      <sidebar.Sidebar collapsible="icon" {...props}>
        <sidebar.SidebarHeader>
          <TeamSwitcher
            teams={teams}
            activeTeamId={activeTeamId}
            onTeamChange={handleTeamChange}
            onPersonalSpaceSelect={handlePersonalSpaceSelect}
            onAddTeam={handleAddTeam}
          />
        </sidebar.SidebarHeader>
        <sidebar.SidebarContent>
          {!activeTeamId ? (
            <div className="px-4 py-2">
              <Label htmlFor="friend-username" className="mb-1 text-xs">
                Add Friend (username)
              </Label>
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
              {friendRequests.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Incoming Requests</p>
                  {friendRequests.map((request) => (
                    <div key={request._id} className="rounded-md border p-2">
                      <p className="text-xs">{request.sender.username}</p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="xs"
                          onClick={() => handleIncomingRequest(request._id, "accepted")}
                        >
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
          ) : null}
          <NavMain
            users={mappedUsers}
            label={activeTeamId ? "Team Members" : "Personal Contacts"}
            emptyMessage={
              activeTeamId
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
      <Sheet open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Create Team</SheetTitle>
            <SheetDescription>
              Create a team and switch to it immediately.
            </SheetDescription>
          </SheetHeader>
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
            <SheetFooter>
              <Button type="submit" disabled={creatingTeam}>
                {creatingTeam ? "Creating..." : "Create team"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
