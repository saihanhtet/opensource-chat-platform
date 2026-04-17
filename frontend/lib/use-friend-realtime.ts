"use client"

import * as React from "react"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"

export function useFriendRealtime(onChange?: () => void) {
  const socket = useSocket()

  React.useEffect(() => {
    if (!socket || !onChange) return
    socket.on(SOCKET_EVENTS.friendRequestCreated, onChange)
    socket.on(SOCKET_EVENTS.friendRequestUpdated, onChange)
    socket.on(SOCKET_EVENTS.friendRequestDeleted, onChange)
    return () => {
      socket.off(SOCKET_EVENTS.friendRequestCreated, onChange)
      socket.off(SOCKET_EVENTS.friendRequestUpdated, onChange)
      socket.off(SOCKET_EVENTS.friendRequestDeleted, onChange)
    }
  }, [onChange, socket])
}
