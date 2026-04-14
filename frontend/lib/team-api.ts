import { apiUrl } from "@/lib/api"

export type CurrentUser = {
  _id: string
  username: string
  email: string
  profilePic?: string
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
  memberRole: "owner" | "admin" | "member"
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
