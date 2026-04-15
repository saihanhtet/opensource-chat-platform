import Link from "next/link"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function ChatIndexPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-semibold">Chats</h1>
        </header>
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <p className="text-sm text-muted-foreground">
            Select a teammate from the sidebar to open a direct message.
          </p>
          <Link href="/" className="mt-4 text-sm underline">
            Go to dashboard
          </Link>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
