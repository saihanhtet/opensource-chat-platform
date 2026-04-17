"use client"

import * as React from "react"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"

export type PresencePayload = {
  userId: string
  status: "active" | "offline" | string
  lastSeenAt?: string
}

export function usePresenceRealtime(onPresence?: (payload: PresencePayload) => void) {
  const socket = useSocket()

  React.useEffect(() => {
    if (!socket || !onPresence) return
    const handler = (payload: PresencePayload) => onPresence(payload)
    socket.on(SOCKET_EVENTS.presenceUpdated, handler)
    return () => {
      socket.off(SOCKET_EVENTS.presenceUpdated, handler)
    }
  }, [onPresence, socket])
}
