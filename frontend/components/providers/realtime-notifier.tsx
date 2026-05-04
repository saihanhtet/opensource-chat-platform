"use client"

import * as React from "react"
import { toast } from "sonner"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useNotificationPreferences } from "@/components/providers/notification-preferences-provider"
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
  _id?: string
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
  const { preferences, toastDurationMs } = useNotificationPreferences()
  const [currentUserId, setCurrentUserId] = React.useState<string>()

  React.useEffect(() => {
    void getCurrentUser()
      .then((user) => setCurrentUserId(user._id))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!socket) return

    const d = { duration: toastDurationMs }

    const onMessageNew = (payload: MessagePayload) => {
      if (!preferences.toastMessages) return
      const actorId = payload?._meta?.fromUserId ?? payload?.senderId
      if (!actorId || actorId === currentUserId) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      if (payload.content?.trim()) {
        toast("New message", {
          ...d,
          description: `${who} in ${space}: ${payload.content.slice(0, 80)}`,
        })
      } else if (payload.fileUrl) {
        toast("New file message", {
          ...d,
          description: `${who} shared an attachment in ${space}.`,
        })
      }
    }

    const onFriendRequestCreated = (payload: FriendRequestPayload) => {
      if (!preferences.toastFriendRequests) return
      const senderId = payload?._meta?.fromUserId ?? toUserId(payload?.senderId)
      if (!senderId || senderId === currentUserId) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      toast("New friend request", {
        ...d,
        description: `${who} sent you a friend request in ${space}.`,
      })
    }

    const onFriendRequestUpdated = (payload: FriendRequestPayload) => {
      if (!preferences.toastFriendRequests) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Personal"
      toast("Friend request updated", {
        ...d,
        description: `${who} updated a friend request in ${space}.`,
      })
    }

    const onTeamUpdated = (payload: TeamPayload) => {
      if (!preferences.toastTeamUpdates) return
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? payload?.teamName ?? "Team"
      toast("Team updated", {
        ...d,
        description: `${who} updated ${space}.`,
      })
    }

    const onTeamMemberCreated = (payload: TeamMemberPayload) => {
      if (!preferences.toastTeamMembership) return
      const userId = toUserId(payload?.userId)
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Team"
      const dedupeId = `teamMemberCreated:${payload?._id ?? userId ?? "unknown"}`
      if (userId === currentUserId) {
        toast("Added to a team", {
          ...d,
          id: dedupeId,
          description: `${who} added you to ${space}.`,
        })
        return
      }
      toast("Team member added", {
        ...d,
        id: dedupeId,
        description: `${who} added a new member in ${space}.`,
      })
    }

    const onTeamMemberUpdated = (payload: TeamMemberPayload) => {
      if (!preferences.toastTeamMembership) return
      const userId = toUserId(payload?.userId)
      const who = payload?._meta?.fromUsername ?? "Someone"
      const space = payload?._meta?.spaceName ?? "Team"
      const dedupeId = `teamMemberUpdated:${payload?._id ?? userId ?? "unknown"}:${payload?.memberRole ?? ""}:${payload?.status ?? ""}`
      if (userId === currentUserId) {
        toast("Your team access changed", {
          ...d,
          id: dedupeId,
          description: payload?.memberRole
            ? `${who} changed your role to ${payload.memberRole} in ${space}.`
            : payload?.status
              ? `${who} changed your status to ${payload.status} in ${space}.`
              : `${who} updated your membership in ${space}.`,
        })
        return
      }
      toast("Team member updated", {
        ...d,
        id: dedupeId,
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
  }, [currentUserId, preferences, socket, toastDurationMs])

  return null
}
