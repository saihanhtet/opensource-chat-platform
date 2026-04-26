export const SOCKET_EVENTS = {
  roomJoin: "room:join",
  roomLeave: "room:leave",
  typingSet: "typing:set",
  typingUpdated: "typing:updated",
  messageNew: "message:new",
  messageUpdated: "message:updated",
  messageDeleted: "message:deleted",
  conversationUpdated: "conversation:updated",
  friendRequestCreated: "friendRequest:created",
  friendRequestUpdated: "friendRequest:updated",
  friendRequestDeleted: "friendRequest:deleted",
  teamCreated: "team:created",
  teamUpdated: "team:updated",
  teamDeleted: "team:deleted",
  teamMemberCreated: "teamMember:created",
  teamMemberUpdated: "teamMember:updated",
  teamMemberRemoved: "teamMember:removed",
  teamChannelCreated: "teamChannel:created",
  presenceUpdated: "presence:updated",
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
