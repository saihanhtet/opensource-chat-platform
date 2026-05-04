"use client"

import { TeamSpaceHome } from "@/components/dashboard/team-space-home"
import * as teamApi from "@/lib/team-api"
import { useParams } from "next/navigation"
import * as React from "react"

export default function TeamSpaceRootPage() {
  const params = useParams<{ teamId: string }>()
  const teamId = params.teamId
  const [loading, setLoading] = React.useState(true)
  const [staffDashboard, setStaffDashboard] = React.useState<
    { href: string; label: string } | undefined
  >()

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const [me, team, members] = await Promise.all([
          teamApi.getCurrentUser(),
          teamApi.getTeamById(teamId),
          teamApi.getTeamMembers(teamId),
        ])
        if (cancelled) return
        const mine = members.find((m) => m.userId?._id === me._id)
        const isOwner = team.createdBy === me._id
        const activeMod = mine?.status === "active" && mine.memberRole === "moderator"
        const activeAdmin = mine?.status === "active" && mine.memberRole === "admin"
        if (isOwner || activeAdmin) {
          setStaffDashboard({
            href: `/team/${teamId}/admin`,
            label: "Open space admin",
          })
        } else if (activeMod) {
          setStaffDashboard({
            href: `/team/${teamId}/moderation`,
            label: "Open moderation",
          })
        } else {
          setStaffDashboard(undefined)
        }
      } catch {
        if (!cancelled) setStaffDashboard(undefined)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teamId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading space…
      </div>
    )
  }

  return <TeamSpaceHome teamId={teamId} staffDashboard={staffDashboard} />
}
