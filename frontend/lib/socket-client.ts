"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

function resolveSocketUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL
  if (explicit) return explicit
  const apiBase = process.env.NEXT_PUBLIC_API_URL
  if (!apiBase) return undefined
  try {
    const parsed = new URL(apiBase, window.location.origin)
    return parsed.origin
  } catch {
    return undefined
  }
}

export function getSocketClient(): Socket {
  if (socket) return socket
  socket = io(resolveSocketUrl(), {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
  })
  return socket
}
