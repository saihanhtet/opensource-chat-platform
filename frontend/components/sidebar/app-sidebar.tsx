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
  createTeam,
  getCurrentUser,
  getTeamMembers,
  getTeams,
  type TeamMember,
} from "@/lib/team-api"
import * as sidebar from "@/components/ui/sidebar"
import * as remixicon from "@remixicon/react"

const SELECTED_TEAM_KEY = "selected-team-id"
const PERSONAL_TEAM_PREFIX = "personal:"

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
    { id: string; name: string; logo: React.ReactNode; plan: string }[]
  >([])
  const [activeTeamId, setActiveTeamId] = React.useState<string>()
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [personalMembers, setPersonalMembers] = React.useState<TeamMember[]>([])
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false)
  const [creatingTeam, setCreatingTeam] = React.useState(false)
  const [newTeamName, setNewTeamName] = React.useState("")
  const [newTeamDescription, setNewTeamDescription] = React.useState("")

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
        const fallbackTeamId = `${PERSONAL_TEAM_PREFIX}${currentUser._id}`
        const fallbackMembers: TeamMember[] = [
          {
            _id: fallbackTeamId,
            teamId: fallbackTeamId,
            userId: {
              _id: currentUser._id,
              username: currentUser.username,
              email: currentUser.email,
              profilePic: currentUser.profilePic,
              status: currentUser.status,
            },
            memberRole: "member",
            status: "active",
            joinedAt: new Date().toISOString(),
          },
        ]
        setPersonalMembers(fallbackMembers)

        const mappedTeams = fetchedTeams
          .filter((team) => team.teamType !== "personal")
          .map((team, index) => ({
            id: team._id,
            name: team.teamName,
            logo: teamLogo(index),
            plan: team.description || "Team",
          }))
        const allSelectableTeams =
          mappedTeams.length > 0
            ? mappedTeams
            : [
                {
                  id: fallbackTeamId,
                  name: "Personal Team",
                  logo: <remixicon.RiUserLine />,
                  plan: "Personal",
                },
              ]
        setTeams(allSelectableTeams)

        const storedTeamId = window.localStorage.getItem(SELECTED_TEAM_KEY)
        const selectedTeam =
          allSelectableTeams.find((team) => team.id === storedTeamId) ?? allSelectableTeams[0]
        const selectedTeamId = selectedTeam?.id
        setActiveTeamId(selectedTeamId)

        if (selectedTeamId) {
          window.localStorage.setItem(SELECTED_TEAM_KEY, selectedTeamId)
          const fetchedMembers = selectedTeamId.startsWith(PERSONAL_TEAM_PREFIX)
            ? fallbackMembers
            : await getTeamMembers(selectedTeamId)
          if (!mounted) return
          setMembers(fetchedMembers)
          onTeamDataChange?.({
            selectedTeamId,
            selectedTeamName: selectedTeam.name,
            members: fetchedMembers,
            loading: false,
          })
        } else {
          setMembers([])
          onTeamDataChange?.({ members: [], loading: false })
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
  }, [onTeamDataChange])

  const handleTeamChange = async (teamId: string) => {
    setActiveTeamId(teamId)
    window.localStorage.setItem(SELECTED_TEAM_KEY, teamId)
    setLoading(true)
    setError(undefined)
    onTeamDataChange?.({ selectedTeamId: teamId, members: [], loading: true })
    try {
      const fetchedMembers = teamId.startsWith(PERSONAL_TEAM_PREFIX)
        ? personalMembers
        : await getTeamMembers(teamId)
      setMembers(fetchedMembers)
      onTeamDataChange?.({
        selectedTeamId: teamId,
        members: fetchedMembers,
        selectedTeamName: teams.find((team) => team.id === teamId)?.name,
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
            onAddTeam={handleAddTeam}
          />
        </sidebar.SidebarHeader>
        <sidebar.SidebarContent>
          <NavMain users={mappedUsers} />
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
