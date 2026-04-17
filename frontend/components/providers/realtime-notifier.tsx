"use client"

import * as React from "react"
import { toast } from "sonner"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"
import { getCurrentUser } from "@/lib/team-api"

type MessagePayload = {
  senderId?: string
  content?: string
  fileUrl?: string
  _meta?: {
    fromUserId?: string
    fromUsername?: string
    spaceName?: string
  }
}

type FriendRequestPayload = {
  senderId?: string | { _id?: string; username?: string }
  _meta?: {
    fromUserId?: string
    fromUsername?: string
    spaceName?: string
  }
}

type TeamPayload = {
  teamName?: string
  _meta?: {
    fromUserId?: string
    fromUsername?: string
    spaceName?: string
  }
}

type TeamMemberPayload = {
  userId?: string | { _id?: string; username?: string }
  memberRole?: string
  status?: string
  _meta?: {
    fromUserId?: string
    fromUsername?: string
    spaceName?: string
  }
}

const toUserId = (value: unknown): string | undefined => {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "_id" in value) {
    const id = (value as { _id?: unknown })._id
    return typeof id === "string" ? id : undefined
  }
  return undefined
}

export function RealtimeNotifier() {
  const socket = useSocket()
  const [currentUserId, setCurrentUserId] = React.useState<string>()

  React.useEffect(() => {
    void getCurrentUser()
      .then((user) => setCurrentUserId(user._id))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!socket) return

    const onMessageNew = (payload: MessagePayload) => {
      const actorId = payload?._meta?.fromUserId ?? payload?.senderId
      if (!actorId || actorId === currentUserId) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      if (payload.content?.trim()) {
        toast("New message", {
          description: `${who} in ${space}: ${payload.content.slice(0, 80)}`,
        })
      } else if (payload.fileUrl) {
        toast("New file message", {
          description: `${who} shared an attachment in ${space}.`,
        })
      }
    }

    const onFriendRequestCreated = (payload: FriendRequestPayload) => {
      const senderId = payload?._meta?.fromUserId ?? toUserId(payload?.senderId)
      if (!senderId || senderId === currentUserId) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      toast("New friend request", {
        description: `${who} sent you a friend request in ${space}.`,
      })
    }

    const onFriendRequestUpdated = (payload: FriendRequestPayload) => {
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      toast("Friend request updated", {
        description: `${who} updated a friend request in ${space}.`,
      })
    }

    const onTeamUpdated = (payload: TeamPayload) => {
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? payload?.teamName ?? "Team"
      toast("Team updated", {
        description: `${who} updated ${space}.`,
      })
    }

    const onTeamMemberCreated = (payload: TeamMemberPayload) => {
      const userId = toUserId(payload?.userId)
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Team"
      if (userId === currentUserId) {
        toast("Added to a team", {
          description: `${who} added you to ${space}.`,
        })
        return
      }
      toast("Team member added", {
        description: `${who} added a new member in ${space}.`,
      })
    }

    const onTeamMemberUpdated = (payload: TeamMemberPayload) => {
      const userId = toUserId(payload?.userId)
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Team"
      if (userId === currentUserId) {
        toast("Your team access changed", {
          description: payload?.memberRole
            ? `${who} changed your role to ${payload.memberRole} in ${space}.`
            : payload?.status
              ? `${who} changed your status to ${payload.status} in ${space}.`
              : `${who} updated your membership in ${space}.`,
        })
        return
      }
      toast("Team member updated", {
        description: `${who} updated a member in ${space}.`,
      })
    }

    socket.on(SOCKET_EVENTS.messageNew, onMessageNew)
    socket.on(SOCKET_EVENTS.friendRequestCreated, onFriendRequestCreated)
    socket.on(SOCKET_EVENTS.friendRequestUpdated, onFriendRequestUpdated)
    socket.on(SOCKET_EVENTS.teamUpdated, onTeamUpdated)
    socket.on(SOCKET_EVENTS.teamMemberCreated, onTeamMemberCreated)
    socket.on(SOCKET_EVENTS.teamMemberUpdated, onTeamMemberUpdated)

    return () => {
      socket.off(SOCKET_EVENTS.messageNew, onMessageNew)
      socket.off(SOCKET_EVENTS.friendRequestCreated, onFriendRequestCreated)
      socket.off(SOCKET_EVENTS.friendRequestUpdated, onFriendRequestUpdated)
      socket.off(SOCKET_EVENTS.teamUpdated, onTeamUpdated)
      socket.off(SOCKET_EVENTS.teamMemberCreated, onTeamMemberCreated)
      socket.off(SOCKET_EVENTS.teamMemberUpdated, onTeamMemberUpdated)
    }
  }, [currentUserId, socket])

  return null
}
