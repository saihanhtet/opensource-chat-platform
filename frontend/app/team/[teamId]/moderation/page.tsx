"use client"

import { TeamDashboardPanel } from "@/components/dashboard/team-dashboard-panel"
import * as teamApi from "@/lib/team-api"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"

export default function TeamSpaceModerationPage() {
  const params = useParams<{ teamId: string }>()
  const router = useRouter()
  const teamId = params.teamId

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [me, team, members] = await Promise.all([
          teamApi.getCurrentUser(),
          teamApi.getTeamById(teamId),
          teamApi.getTeamMembers(teamId),
        ])
        if (cancelled) return
        const isOwner = team.createdBy === me._id
        const mine = members.find((m) => m.userId?._id === me._id)
        const role =
          isOwner ? "owner" : mine?.status === "active" ? mine.memberRole : undefined
        if (role === "owner" || role === "admin") {
          router.replace(`/team/${teamId}/admin`)
        }
      } catch {
        /* panel will show error */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, teamId])

  return <TeamDashboardPanel teamId={teamId} dashboardMode="moderation" />
}
