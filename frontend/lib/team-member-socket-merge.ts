import type { TeamMember, TeamMemberUser } from "@/lib/team-api"

const asStringId = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value
  if (value && typeof value === "object" && "toString" in value) {
    const s = String((value as { toString: () => string }).toString())
    return s.length > 0 && s !== "[object Object]" ? s : undefined
  }
  return undefined
}

const asUser = (value: unknown): TeamMemberUser | undefined => {
  if (!value || typeof value !== "object") return undefined
  const o = value as Record<string, unknown>
  const _id = asStringId(o._id)
  if (!_id) return undefined
  return {
    _id,
    username: typeof o.username === "string" ? o.username : "",
    email: typeof o.email === "string" ? o.email : "",
    profilePic: typeof o.profilePic === "string" ? o.profilePic : undefined,
    status: typeof o.status === "string" ? o.status : undefined,
    lastSeenAt: typeof o.lastSeenAt === "string" ? o.lastSeenAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  }
}

const asRole = (value: unknown): TeamMember["memberRole"] => {
  if (value === "owner" || value === "admin" || value === "moderator" || value === "member") {
    return value
  }
  return "member"
}

const asStatus = (value: unknown): TeamMember["status"] => {
  if (value === "pending" || value === "active" || value === "removed" || value === "banned") {
    return value
  }
  return "active"
}

/** Normalize a populated team member document from the socket (same shape as REST). */
export function teamMemberFromSocketPayload(raw: unknown): TeamMember | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const _id = asStringId(o._id)
  const teamId = asStringId(o.teamId)
  const userId = asUser(o.userId)
  if (!_id || !teamId || !userId) return null
  return {
    _id,
    teamId,
    userId,
    memberRole: asRole(o.memberRole),
    status: asStatus(o.status),
    joinedAt: typeof o.joinedAt === "string" ? o.joinedAt : new Date().toISOString(),
  }
}

export function mergeTeamMemberIntoList(prev: TeamMember[], next: TeamMember): TeamMember[] {
  const index = prev.findIndex((row) => row._id === next._id)
  if (index >= 0) {
    const copy = [...prev]
    copy[index] = next
    return copy
  }
  return [next, ...prev]
}

export function removeTeamMemberFromList(prev: TeamMember[], memberId: string): TeamMember[] {
  return prev.filter((row) => row._id !== memberId)
}
