import { apiUrl } from "@/lib/api"
import { getCurrentUser, type CurrentUser } from "@/lib/team-api"

export type ChatUser = CurrentUser

export type Conversation = {
  _id: string
  type: "direct" | "team"
  teamId?: string
  participantIds: string[]
  lastMessage: string
}

export type ChatMessage = {
  _id: string
  conversationId: string
  senderId: string
  content: string
  fileUrl?: string
  timestamp: string
  editedAt?: string | null
}

export type UploadedFileRecord = {
  _id: string
  uploadedBy: string
  conversationId: string
  fileName: string
  fileType: string
  fileUrl: string
  uploadedAt: string
}

export type TypingUser = {
  _id: string
  username: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed"
    throw new Error(message)
  }
  return data as T
}

export async function getUserByUsername(username: string): Promise<ChatUser> {
  const res = await fetch(apiUrl(`/api/auth/users/by-username/${encodeURIComponent(username)}`), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<ChatUser>(res)
}

export async function ensureDirectConversation(targetUsername: string): Promise<{
  me: ChatUser
  peer: ChatUser
  conversation: Conversation
}> {
  const [me, peer] = await Promise.all([getCurrentUser(), getUserByUsername(targetUsername)])
  const listRes = await fetch(apiUrl("/api/conversations"), {
    credentials: "include",
    cache: "no-store",
  })
  const conversations = await parseJson<Conversation[]>(listRes)

  const existing = conversations.find(
    (conversation) =>
      conversation.type === "direct" &&
      conversation.participantIds.length === 2 &&
      conversation.participantIds.includes(me._id) &&
      conversation.participantIds.includes(peer._id)
  )

  if (existing) return { me, peer, conversation: existing }

  const createRes = await fetch(apiUrl("/api/conversations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type: "direct",
      participantIds: [me._id, peer._id],
    }),
  })
  const created = await parseJson<Conversation>(createRes)
  return { me, peer, conversation: created }
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(
    apiUrl(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`),
    {
      credentials: "include",
      cache: "no-store",
    }
  )
  return parseJson<ChatMessage[]>(res)
}

export async function sendMessage(input: {
  conversationId: string
  content: string
}): Promise<ChatMessage> {
  const res = await fetch(apiUrl("/api/messages"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<ChatMessage>(res)
}

export async function updateMessage(
  messageId: string,
  input: {
    content?: string
    fileUrl?: string
  }
): Promise<ChatMessage> {
  const res = await fetch(apiUrl(`/api/messages/${encodeURIComponent(messageId)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<ChatMessage>(res)
}

export async function deleteMessage(messageId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/messages/${encodeURIComponent(messageId)}`), {
    method: "DELETE",
    credentials: "include",
  })
  await parseJson<{ message: string }>(res)
}

export async function uploadChatFile(input: {
  conversationId: string
  file: File
  content?: string
}): Promise<{ file: UploadedFileRecord; message: ChatMessage }> {
  const formData = new FormData()
  formData.append("conversationId", input.conversationId)
  formData.append("file", input.file)
  if (input.content?.trim()) {
    formData.append("content", input.content.trim())
  }

  const res = await fetch(apiUrl("/api/files/upload"), {
    method: "POST",
    credentials: "include",
    body: formData,
  })
  return parseJson<{ file: UploadedFileRecord; message: ChatMessage }>(res)
}

export async function getConversationFiles(conversationId: string): Promise<UploadedFileRecord[]> {
  const res = await fetch(
    apiUrl(`/api/files?conversationId=${encodeURIComponent(conversationId)}`),
    {
      credentials: "include",
      cache: "no-store",
    }
  )
  return parseJson<UploadedFileRecord[]>(res)
}

export async function setTypingStatus(input: {
  conversationId: string
  isTyping: boolean
}): Promise<void> {
  const res = await fetch(apiUrl(`/api/conversations/${input.conversationId}/typing`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isTyping: input.isTyping }),
  })
  await parseJson<{ ok: boolean }>(res)
}

export async function getTypingStatus(conversationId: string): Promise<TypingUser[]> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/typing`), {
    credentials: "include",
    cache: "no-store",
  })
  const data = await parseJson<{ users: TypingUser[] }>(res)
  return data.users
}
