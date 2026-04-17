"use client"

import * as React from "react"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { useSocket } from "@/lib/use-socket"

export function useChatRealtime(options: {
  conversationId?: string
  onMessageNew?: (payload: unknown) => void
  onMessageUpdated?: (payload: unknown) => void
  onMessageDeleted?: (payload: unknown) => void
  onTypingUpdated?: (payload: unknown) => void
  onConversationUpdated?: (payload: unknown) => void
}) {
  const socket = useSocket()
  const {
    conversationId,
    onMessageNew,
    onMessageUpdated,
    onMessageDeleted,
    onTypingUpdated,
    onConversationUpdated,
  } = options

  React.useEffect(() => {
    if (!socket || !conversationId) return
    socket.emit(SOCKET_EVENTS.roomJoin, { type: "conversation", id: conversationId })
    if (onMessageNew) socket.on(SOCKET_EVENTS.messageNew, onMessageNew)
    if (onMessageUpdated) socket.on(SOCKET_EVENTS.messageUpdated, onMessageUpdated)
    if (onMessageDeleted) socket.on(SOCKET_EVENTS.messageDeleted, onMessageDeleted)
    if (onTypingUpdated) socket.on(SOCKET_EVENTS.typingUpdated, onTypingUpdated)
    if (onConversationUpdated) socket.on(SOCKET_EVENTS.conversationUpdated, onConversationUpdated)
    return () => {
      if (onMessageNew) socket.off(SOCKET_EVENTS.messageNew, onMessageNew)
      if (onMessageUpdated) socket.off(SOCKET_EVENTS.messageUpdated, onMessageUpdated)
      if (onMessageDeleted) socket.off(SOCKET_EVENTS.messageDeleted, onMessageDeleted)
      if (onTypingUpdated) socket.off(SOCKET_EVENTS.typingUpdated, onTypingUpdated)
      if (onConversationUpdated) socket.off(SOCKET_EVENTS.conversationUpdated, onConversationUpdated)
      socket.emit(SOCKET_EVENTS.roomLeave, { type: "conversation", id: conversationId })
    }
  }, [
    conversationId,
    onConversationUpdated,
    onMessageDeleted,
    onMessageNew,
    onMessageUpdated,
    onTypingUpdated,
    socket,
  ])

  const setTyping = React.useCallback(
    (isTyping: boolean) => {
      if (!socket || !conversationId) return
      socket.emit(SOCKET_EVENTS.typingSet, { conversationId, isTyping })
    },
    [conversationId, socket]
  )

  return { setTyping }
}
