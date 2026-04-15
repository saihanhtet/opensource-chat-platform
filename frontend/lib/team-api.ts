import { apiUrl } from "@/lib/api"

export type CurrentUser = {
  _id: string
  username: string
  email: string
  profilePic?: string
  bio?: string
  status?: string
  lastSeenAt?: string
  updatedAt?: string
}

export type Team = {
  _id: string
  teamName: string
  description?: string
  createdBy: string
  teamType?: "personal" | "group"
  rolePermissions?: {
    statusManagement?: {
      owner?: Array<"owner" | "admin" | "moderator" | "member">
      admin?: Array<"owner" | "admin" | "moderator" | "member">
      moderator?: Array<"owner" | "admin" | "moderator" | "member">
      member?: Array<"owner" | "admin" | "moderator" | "member">
    }
  }
}

export type TeamMemberUser = {
  _id: string
  username: string
  email: string
  profilePic?: string
  status?: string
  lastSeenAt?: string
  updatedAt?: string
}

export type TeamMember = {
  _id: string
  teamId: string
  userId: TeamMemberUser
  memberRole: "owner" | "admin" | "moderator" | "member"
  status: "pending" | "active" | "removed"
  joinedAt: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed"
    throw new Error(message)
  }
  return data as T
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await fetch(apiUrl("/api/auth/check-token"), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<CurrentUser>(res)
}

export async function getTeams(): Promise<Team[]> {
  const res = await fetch(apiUrl("/api/teams"), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<Team[]>(res)
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await fetch(apiUrl(`/api/team-members?teamId=${encodeURIComponent(teamId)}`), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<TeamMember[]>(res)
}

export async function createTeam(input: {
  teamName: string
  description?: string
}): Promise<Team> {
  const res = await fetch(apiUrl("/api/teams"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<Team>(res)
}

export async function updateTeam(
  teamId: string,
  input: {
    teamName?: string
    description?: string
    rolePermissions?: Team["rolePermissions"]
  }
): Promise<Team> {
  const res = await fetch(apiUrl(`/api/teams/${teamId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<Team>(res)
}

export async function updateTeamMember(
  memberId: string,
  input: {
    memberRole?: "owner" | "admin" | "moderator" | "member"
    status?: "pending" | "active" | "removed"
  }
): Promise<TeamMember> {
  const res = await fetch(apiUrl(`/api/team-members/${memberId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<TeamMember>(res)
}

export async function getTeamById(teamId: string): Promise<Team> {
  const res = await fetch(apiUrl(`/api/teams/${teamId}`), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<Team>(res)
}

export async function addTeamMemberByIdentifier(input: {
  teamId: string
  identifier: string
  memberRole?: "owner" | "admin" | "moderator" | "member"
}): Promise<TeamMember> {
  const res = await fetch(apiUrl("/api/team-members"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<TeamMember>(res)
}
