"use client"

import { useParams } from "next/navigation"
import { TeamDashboardPanel } from "@/components/dashboard/team-dashboard-panel"

export default function TeamDashboardPage() {
  const params = useParams<{ teamId: string }>()
  return <TeamDashboardPanel teamId={params.teamId} />
}
