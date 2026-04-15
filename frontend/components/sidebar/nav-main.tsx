"use client"

import * as sidebar from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { presenceLabel } from "@/lib/presence"

interface User {
  id: string
  username: string
  isActive: boolean
  profilePic: string
  status?: string
  lastSeenAt?: string
}

export function NavMain({
  users,
  label = "Team Members",
  emptyMessage = "No users in this team yet",
}: {
  users: User[]
  label?: string
  emptyMessage?: string
}) {
  const pathname = usePathname()

  return (
    <sidebar.SidebarGroup>
      <sidebar.SidebarGroupLabel>{label}</sidebar.SidebarGroupLabel>
      <sidebar.SidebarMenu>
        {users.length === 0 ? (
          <sidebar.SidebarMenuItem>
            <sidebar.SidebarMenuButton size="lg" disabled>
              {emptyMessage}
            </sidebar.SidebarMenuButton>
          </sidebar.SidebarMenuItem>
        ) : null}
        {users.map((user) => (
          <sidebar.SidebarMenuItem key={user.id}>
            <sidebar.SidebarMenuButton
              asChild
              size="lg"
              isActive={pathname === `/chat/${user.username}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href={`/chat/${user.username}`}>
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.profilePic as string} alt={user.username} />
                  <AvatarFallback className="rounded-lg">OC</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.username}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {presenceLabel(user.status, user.lastSeenAt)}
                  </span>
                </div>
                <span
                  className={`size-2 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-gray-400"}`}
                />
              </Link>
            </sidebar.SidebarMenuButton>
          </sidebar.SidebarMenuItem>
        ))}
      </sidebar.SidebarMenu>
    </sidebar.SidebarGroup>
  )
}
