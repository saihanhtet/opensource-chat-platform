"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"

export default function LegacyChatUsernameRedirect() {
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const username = params.username

  React.useEffect(() => {
    router.replace(`/personal/chat/${encodeURIComponent(username)}`)
  }, [router, username])

  return (
    <div className="flex flex-1 flex-col p-6">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  )
}
