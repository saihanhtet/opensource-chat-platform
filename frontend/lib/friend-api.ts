import { apiUrl } from "@/lib/api"
import { getUserByUsername } from "@/lib/chat-api"

export type FriendRequestUser = {
  _id: string
  username: string
  email: string
  profilePic?: string
  status?: string
  lastSeenAt?: string
  updatedAt?: string
}

export type FriendRequest = {
  _id: string
  senderId: string | FriendRequestUser
  receiverId: string | FriendRequestUser
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  updatedAt: string
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

export async function listFriendRequests(): Promise<FriendRequest[]> {
  const res = await fetch(apiUrl("/api/friend-requests"), {
    credentials: "include",
    cache: "no-store",
  })
  return parseJson<FriendRequest[]>(res)
}

export async function createFriendRequestByUsername(username: string): Promise<FriendRequest> {
  const user = await getUserByUsername(username.trim())
  const res = await fetch(apiUrl("/api/friend-requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ receiverId: user._id }),
  })
  return parseJson<FriendRequest>(res)
}

export async function updateFriendRequestStatus(
  friendRequestId: string,
  status: "accepted" | "rejected"
): Promise<FriendRequest> {
  const res = await fetch(apiUrl(`/api/friend-requests/${friendRequestId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  })
  return parseJson<FriendRequest>(res)
}
