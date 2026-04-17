"use client"

import * as React from "react"
import { SocketContext } from "@/components/providers/socket-provider"

export function useSocket() {
  return React.useContext(SocketContext)
}
