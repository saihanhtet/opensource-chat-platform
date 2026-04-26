"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import * as chatApi from "@/lib/chat-api"

export default function LegacyTeamChannelRedirect() {
  const params = useParams<{ conversationId: string }>()
  const router = useRouter()
  const conversationId = params.conversationId

  React.useEffect(() => {
    let cancelled = false
    void chatApi
      .getConversationById(conversationId)
      .then((conv) => {
        if (cancelled) return
        if (conv.type === "team" && conv.teamId) {
          router.replace(`/team/${conv.teamId}/c/${conversationId}`)
        } else {
          router.replace("/personal")
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/personal")
      })
    return () => {
      cancelled = true
    }
  }, [conversationId, router])

  return (
    <div className="flex flex-1 flex-col p-6">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  )
}
