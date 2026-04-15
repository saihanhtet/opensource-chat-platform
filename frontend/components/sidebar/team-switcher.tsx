"use client"

import * as React from "react"

import * as dropdownMenu from "@/components/ui/dropdown-menu"
import * as sidebar from "@/components/ui/sidebar"
import { RiArrowUpDownLine, RiAddLine, RiUserLine } from "@remixicon/react"


interface Team {
  id: string
  name: string
  logo: React.ReactNode
  plan: string
}

export function TeamSwitcher({
  teams,
  activeTeamId,
  onTeamChange,
  onPersonalSpaceSelect,
  onAddTeam,
}: {
  teams: Team[]
  activeTeamId?: string
  onTeamChange: (teamId: string) => void
  onPersonalSpaceSelect: () => void
  onAddTeam: () => void
}) {
  const { isMobile } = sidebar.useSidebar()
  const activeTeam = activeTeamId
    ? teams.find((team) => team.id === activeTeamId)
    : undefined

  if (!activeTeam && !activeTeamId) {
    return (
      <sidebar.SidebarMenu>
        <sidebar.SidebarMenuItem>
          <dropdownMenu.DropdownMenu>
            <dropdownMenu.DropdownMenuTrigger asChild>
              <sidebar.SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <RiUserLine className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">No Team (Personal)</span>
                  <span className="truncate text-xs">Private chats</span>
                </div>
                <RiArrowUpDownLine className="ml-auto" />
              </sidebar.SidebarMenuButton>
            </dropdownMenu.DropdownMenuTrigger>
            <dropdownMenu.DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <dropdownMenu.DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </dropdownMenu.DropdownMenuLabel>
              <dropdownMenu.DropdownMenuItem className="gap-2 p-2" onClick={onPersonalSpaceSelect}>
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <RiUserLine className="size-4" />
                </div>
                No Team (Personal)
              </dropdownMenu.DropdownMenuItem>
              {teams.map((team, index) => (
                <dropdownMenu.DropdownMenuItem
                  key={team.id}
                  onClick={() => onTeamChange(team.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  {team.name}
                  <dropdownMenu.DropdownMenuShortcut>⌘{index + 1}</dropdownMenu.DropdownMenuShortcut>
                </dropdownMenu.DropdownMenuItem>
              ))}
              <dropdownMenu.DropdownMenuSeparator />
              <dropdownMenu.DropdownMenuItem className="gap-2 p-2" onClick={onAddTeam}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <RiAddLine className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Add team</div>
              </dropdownMenu.DropdownMenuItem>
            </dropdownMenu.DropdownMenuContent>
          </dropdownMenu.DropdownMenu>
        </sidebar.SidebarMenuItem>
      </sidebar.SidebarMenu>
    )
  }

  if (!activeTeam) {
    return (
      <sidebar.SidebarMenu>
        <sidebar.SidebarMenuItem>
          <sidebar.SidebarMenuButton size="lg" onClick={onAddTeam}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <RiAddLine className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No team selected</span>
              <span className="truncate text-xs">Create your first team</span>
            </div>
          </sidebar.SidebarMenuButton>
        </sidebar.SidebarMenuItem>
      </sidebar.SidebarMenu>
    )
  }

  return (
    <sidebar.SidebarMenu>
      <sidebar.SidebarMenuItem>
        <dropdownMenu.DropdownMenu>
          <dropdownMenu.DropdownMenuTrigger asChild>
            <sidebar.SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeTeam.logo}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <RiArrowUpDownLine className="ml-auto" />
            </sidebar.SidebarMenuButton>
          </dropdownMenu.DropdownMenuTrigger>
          <dropdownMenu.DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <dropdownMenu.DropdownMenuLabel className="text-xs text-muted-foreground">
              Teams
            </dropdownMenu.DropdownMenuLabel>
            <dropdownMenu.DropdownMenuItem className="gap-2 p-2" onClick={onPersonalSpaceSelect}>
              <div className="flex size-6 items-center justify-center rounded-md border">
                <RiUserLine className="size-4" />
              </div>
              No Team (Personal)
            </dropdownMenu.DropdownMenuItem>
            {teams.map((team, index) => (
              <dropdownMenu.DropdownMenuItem
                key={team.id}
                onClick={() => onTeamChange(team.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {team.logo}
                </div>
                {team.name}
                <dropdownMenu.DropdownMenuShortcut>⌘{index + 1}</dropdownMenu.DropdownMenuShortcut>
              </dropdownMenu.DropdownMenuItem>
            ))}
            <dropdownMenu.DropdownMenuSeparator />
            <dropdownMenu.DropdownMenuItem className="gap-2 p-2" onClick={onAddTeam}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <RiAddLine className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add team</div>
            </dropdownMenu.DropdownMenuItem>
          </dropdownMenu.DropdownMenuContent>
        </dropdownMenu.DropdownMenu>
      </sidebar.SidebarMenuItem>
    </sidebar.SidebarMenu>
  )
}
