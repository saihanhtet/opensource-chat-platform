"use client"

import * as React from "react"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"

export function useTeamRealtime(options: { teamId?: string; onChange?: () => void }) {
  const socket = useSocket()
  const { teamId, onChange } = options

  React.useEffect(() => {
    if (!socket || !onChange) return
    socket.on(SOCKET_EVENTS.teamCreated, onChange)
    socket.on(SOCKET_EVENTS.teamUpdated, onChange)
    socket.on(SOCKET_EVENTS.teamDeleted, onChange)
    socket.on(SOCKET_EVENTS.teamMemberCreated, onChange)
    socket.on(SOCKET_EVENTS.teamMemberUpdated, onChange)
    socket.on(SOCKET_EVENTS.teamMemberRemoved, onChange)
    return () => {
      socket.off(SOCKET_EVENTS.teamCreated, onChange)
      socket.off(SOCKET_EVENTS.teamUpdated, onChange)
      socket.off(SOCKET_EVENTS.teamDeleted, onChange)
      socket.off(SOCKET_EVENTS.teamMemberCreated, onChange)
      socket.off(SOCKET_EVENTS.teamMemberUpdated, onChange)
      socket.off(SOCKET_EVENTS.teamMemberRemoved, onChange)
    }
  }, [onChange, socket])

  React.useEffect(() => {
    if (!socket || !teamId) return
    socket.emit(SOCKET_EVENTS.roomJoin, { type: "team", id: teamId })
    return () => {
      socket.emit(SOCKET_EVENTS.roomLeave, { type: "team", id: teamId })
    }
  }, [socket, teamId])
}
