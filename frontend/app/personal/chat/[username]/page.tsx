"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ChatThreadPanel } from "@/components/chat/chat-thread-panel"
import * as chatApi from "@/lib/chat-api"

export default function PersonalChatPage() {
  const params = useParams<{ username: string }>()
  const username = params.username
  const [conversationId, setConversationId] = React.useState<string>()
  const [myUserId, setMyUserId] = React.useState("")
  const [peerName, setPeerName] = React.useState("")
  const [peerStatus, setPeerStatus] = React.useState<string>()
  const [peerLastSeenAt, setPeerLastSeenAt] = React.useState<string>()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(undefined)
      try {
        const setup = await chatApi.ensureDirectConversation(username)
        if (!mounted) return
        setConversationId(setup.conversation._id)
        setMyUserId(setup.me._id)
        setPeerName(setup.peer.username)
        setPeerStatus(setup.peer.status)
        setPeerLastSeenAt(setup.peer.lastSeenAt ?? setup.peer.updatedAt)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [username])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    )
  }

  if (error || !conversationId || !myUserId) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-destructive">{error ?? "Unable to open chat."}</p>
      </div>
    )
  }

  return (
    <ChatThreadPanel
      conversationId={conversationId}
      myUserId={myUserId}
      variant="direct"
      directUsername={username}
      directDisplayName={peerName}
      initialPeerStatus={peerStatus}
      initialPeerLastSeenAt={peerLastSeenAt}
      messagePlaceholder={`Message @${peerName || username}`}
    />
  )
}
