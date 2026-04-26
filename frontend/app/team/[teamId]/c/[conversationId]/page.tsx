"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ChatThreadPanel } from "@/components/chat/chat-thread-panel"
import * as chatApi from "@/lib/chat-api"
import * as teamApi from "@/lib/team-api"

export default function TeamChannelChatPage() {
  const params = useParams<{ teamId: string; conversationId: string }>()
  const { teamId, conversationId } = params
  const [myUserId, setMyUserId] = React.useState("")
  const [teamName, setTeamName] = React.useState<string>()
  const [channelTitle, setChannelTitle] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(undefined)
      try {
        const [me, conv] = await Promise.all([
          teamApi.getCurrentUser(),
          chatApi.getConversationById(conversationId),
        ])
        if (!mounted) return
        if (conv.type !== "team" || !conv.teamId) {
          setError("This conversation is not a team channel.")
          return
        }
        if (String(conv.teamId) !== String(teamId)) {
          setError("This channel does not belong to the team in the URL.")
          return
        }
        if (!conv.participantIds.includes(me._id)) {
          setError("You are not a member of this channel.")
          return
        }
        setMyUserId(me._id)
        const team = await teamApi.getTeamById(conv.teamId)
        if (!mounted) return
        setTeamName(team.teamName)
        setChannelTitle(conv.name?.trim() ? `#${conv.name.trim()}` : "Channel")
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load channel")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [conversationId, teamId])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-muted-foreground">Loading channel...</p>
      </div>
    )
  }

  if (error || !myUserId) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-destructive">{error ?? "Unable to open channel."}</p>
      </div>
    )
  }

  return (
    <ChatThreadPanel
      conversationId={conversationId}
      myUserId={myUserId}
      variant="team"
      teamTitle={channelTitle}
      teamSubtitle={teamName ? `Team: ${teamName}` : undefined}
      messagePlaceholder={`Message ${channelTitle}`}
    />
  )
}
