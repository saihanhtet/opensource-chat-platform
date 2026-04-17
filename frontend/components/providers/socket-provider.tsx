"use client"

import * as React from "react"
import { getSocketClient } from "@/lib/socket-client"

export const SocketContext = React.createContext<ReturnType<typeof getSocketClient> | null>(null)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket] = React.useState(() => getSocketClient())

  React.useEffect(() => {
    if (!socket.connected) socket.connect()
    return () => {
      socket.off()
      socket.disconnect()
    }
  }, [socket])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
