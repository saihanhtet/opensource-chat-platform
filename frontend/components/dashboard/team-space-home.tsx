"use client"

import * as breadcrumb from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import * as teamApi from "@/lib/team-api"
import Link from "next/link"
import * as React from "react"

export function TeamSpaceHome({
  teamId,
  staffDashboard,
}: {
  teamId: string
  /** Link to admin or moderation dashboard for staff; omit for regular members. */
  staffDashboard?: { href: string; label: string }
}) {
  const [teamName, setTeamName] = React.useState<string>()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(undefined)
      try {
        const team = await teamApi.getTeamById(teamId)
        if (!cancelled) setTeamName(team.teamName)
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load space.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teamId])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <breadcrumb.Breadcrumb>
            <breadcrumb.BreadcrumbList>
              <breadcrumb.BreadcrumbItem>
                <breadcrumb.BreadcrumbPage>{teamName ?? "Space"}</breadcrumb.BreadcrumbPage>
              </breadcrumb.BreadcrumbItem>
            </breadcrumb.BreadcrumbList>
          </breadcrumb.Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-6">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <div className="max-w-lg space-y-4 rounded-xl border bg-muted/30 p-6">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">{teamName}</h1>
              <p className="text-sm text-muted-foreground">
                Pick a channel in the sidebar to chat, or open a direct message from the member list.
              </p>
            </div>
            {staffDashboard ? (
              <Button asChild>
                <Link href={staffDashboard.href}>{staffDashboard.label}</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Space settings and moderation are limited to the owner, admins, and moderators.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </>
  )
}
