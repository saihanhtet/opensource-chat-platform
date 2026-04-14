"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { TeamMember } from "@/lib/team-api"

export default function Page() {
  const [selectedTeamName, setSelectedTeamName] = React.useState<string>()
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()
  const handleTeamDataChange = React.useCallback(
    (data: {
      selectedTeamName?: string
      members: TeamMember[]
      loading: boolean
      error?: string
    }) => {
      setSelectedTeamName(data.selectedTeamName)
      setMembers(data.members)
      setLoading(data.loading)
      setError(data.error)
    },
    []
  )

  return (
    <SidebarProvider>
      <AppSidebar onTeamDataChange={handleTeamDataChange} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedTeamName ?? "Select a Team"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Selected Team</p>
              <p className="mt-2 text-xl font-semibold">{selectedTeamName ?? "N/A"}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Members</p>
              <p className="mt-2 text-xl font-semibold">{members.length}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="mt-2 text-xl font-semibold">
                {
                  members.filter((member) => member.userId?.status === "active")
                    .length
                }
              </p>
            </div>
          </div>
          <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
            <h2 className="mb-4 text-lg font-semibold">Team Users</h2>
            {loading ? <p className="text-sm text-muted-foreground">Loading users...</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!loading && !error && members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users for this team yet.</p>
            ) : null}
            {!loading && !error && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{member.userId?.username ?? "Unknown user"}</p>
                      <p className="text-xs text-muted-foreground">{member.userId?.email ?? "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm capitalize">{member.memberRole}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
