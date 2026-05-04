"use client"

import * as React from "react"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"

export type TeamRealtimeOptions = {
  teamId?: string
  /**
   * Generic refresh when no specific handler is provided for an event.
   * If you pass granular `onTeamMember*` handlers, member events will not call `onChange`
   * unless you also wire them to do so.
   */
  onChange?: () => void
  onTeamMemberCreated?: (payload: unknown) => void
  onTeamMemberUpdated?: (payload: unknown) => void
  onTeamMemberRemoved?: (payload: unknown) => void
  onTeamCreated?: () => void
  onTeamUpdated?: () => void
  onTeamDeleted?: () => void
  onTeamChannelCreated?: () => void
}

export function useTeamRealtime(options: TeamRealtimeOptions) {
  const socket = useSocket()
  const {
    teamId,
    onChange,
    onTeamMemberCreated,
    onTeamMemberUpdated,
    onTeamMemberRemoved,
    onTeamCreated,
    onTeamUpdated,
    onTeamDeleted,
    onTeamChannelCreated,
  } = options

  const ref = React.useRef(options)
  ref.current = options

  React.useEffect(() => {
    if (!socket) return

    const onCreated = (payload: unknown) => {
      const { onTeamMemberCreated: h, onChange: generic } = ref.current
      if (h) h(payload)
      else generic?.()
    }
    const onUpdated = (payload: unknown) => {
      const { onTeamMemberUpdated: h, onChange: generic } = ref.current
      if (h) h(payload)
      else generic?.()
    }
    const onRemoved = (payload: unknown) => {
      const { onTeamMemberRemoved: h, onChange: generic } = ref.current
      if (h) h(payload)
      else generic?.()
    }
    const onTeamCreatedEv = () => {
      const { onTeamCreated: h, onChange: generic } = ref.current
      if (h) h()
      else generic?.()
    }
    const onTeamUpdatedEv = () => {
      const { onTeamUpdated: h, onChange: generic } = ref.current
      if (h) h()
      else generic?.()
    }
    const onTeamDeletedEv = () => {
      const { onTeamDeleted: h, onChange: generic } = ref.current
      if (h) h()
      else generic?.()
    }
    const onChannelCreated = () => {
      const { onTeamChannelCreated: h, onChange: generic } = ref.current
      if (h) h()
      else generic?.()
    }

    socket.on(SOCKET_EVENTS.teamCreated, onTeamCreatedEv)
    socket.on(SOCKET_EVENTS.teamUpdated, onTeamUpdatedEv)
    socket.on(SOCKET_EVENTS.teamDeleted, onTeamDeletedEv)
    socket.on(SOCKET_EVENTS.teamMemberCreated, onCreated)
    socket.on(SOCKET_EVENTS.teamMemberUpdated, onUpdated)
    socket.on(SOCKET_EVENTS.teamMemberRemoved, onRemoved)
    socket.on(SOCKET_EVENTS.teamChannelCreated, onChannelCreated)
    return () => {
      socket.off(SOCKET_EVENTS.teamCreated, onTeamCreatedEv)
      socket.off(SOCKET_EVENTS.teamUpdated, onTeamUpdatedEv)
      socket.off(SOCKET_EVENTS.teamDeleted, onTeamDeletedEv)
      socket.off(SOCKET_EVENTS.teamMemberCreated, onCreated)
      socket.off(SOCKET_EVENTS.teamMemberUpdated, onUpdated)
      socket.off(SOCKET_EVENTS.teamMemberRemoved, onRemoved)
      socket.off(SOCKET_EVENTS.teamChannelCreated, onChannelCreated)
    }
  }, [socket])

  React.useEffect(() => {
    if (!socket || !teamId) return
    socket.emit(SOCKET_EVENTS.roomJoin, { type: "team", id: teamId })
    return () => {
      socket.emit(SOCKET_EVENTS.roomLeave, { type: "team", id: teamId })
    }
  }, [socket, teamId])
}
