"use client"

import { apiUrl } from "@/lib/api"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import * as dropdownMenu from "@/components/ui/dropdown-menu"
import * as sidebar from "@/components/ui/sidebar"
import * as remixicon from "@remixicon/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface User {
  name: string
  email: string
  avatar: string
}

export function NavUser({
  user,
  theme,
  onToggleTheme,
}: {
  user: User
  theme: "light" | "dark"
  onToggleTheme: () => void
}) {
  const { isMobile } = sidebar.useSidebar()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch(apiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
    })
    router.push("/login")
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
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <remixicon.RiMore2Fill className="ml-auto size-4" />
            </sidebar.SidebarMenuButton>
          </dropdownMenu.DropdownMenuTrigger>
          <dropdownMenu.DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <dropdownMenu.DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </dropdownMenu.DropdownMenuLabel>
            <dropdownMenu.DropdownMenuSeparator />
            <dropdownMenu.DropdownMenuGroup>
              <dropdownMenu.DropdownMenuItem asChild>
                <Link href="/profile">
                  <remixicon.RiCheckboxCircleLine />
                  Account
                </Link>
              </dropdownMenu.DropdownMenuItem>
              <dropdownMenu.DropdownMenuItem onClick={onToggleTheme}>
                {theme === "dark" ? (
                  <remixicon.RiSunLine />
                ) : (
                  <remixicon.RiMoonClearLine />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </dropdownMenu.DropdownMenuItem>
              <dropdownMenu.DropdownMenuItem asChild>
                <Link href="/settings/notifications">
                  <remixicon.RiNotificationLine />
                  Notifications
                </Link>
              </dropdownMenu.DropdownMenuItem>
            </dropdownMenu.DropdownMenuGroup>
            <dropdownMenu.DropdownMenuSeparator />
            <dropdownMenu.DropdownMenuItem onClick={handleLogout}>
              <remixicon.RiLogoutBoxLine
              />
              Log out
            </dropdownMenu.DropdownMenuItem>
          </dropdownMenu.DropdownMenuContent>
        </dropdownMenu.DropdownMenu>
      </sidebar.SidebarMenuItem>
    </sidebar.SidebarMenu>
  )
}
