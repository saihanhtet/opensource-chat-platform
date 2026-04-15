"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import * as sidebar from "@/components/ui/sidebar"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <sidebar.SidebarProvider>
      <AppSidebar />
      <sidebar.SidebarInset className="h-svh">
        {children}
      </sidebar.SidebarInset>
    </sidebar.SidebarProvider>
  )
}

