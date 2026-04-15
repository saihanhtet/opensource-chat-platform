import { apiUrl } from "@/lib/api"
import { type CurrentUser } from "@/lib/team-api"

type UpdateProfileInput = {
  username?: string
  email?: string
  bio?: string
  profilePic?: File | null
}

type UpdatePasswordInput = {
  currentPassword: string
  newPassword: string
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

export async function updateProfile(input: UpdateProfileInput): Promise<{
  message: string
  user: CurrentUser
}> {
  const body = new FormData()
  if (input.username !== undefined) body.append("username", input.username)
  if (input.email !== undefined) body.append("email", input.email)
  if (input.bio !== undefined) body.append("bio", input.bio)
  if (input.profilePic) body.append("profilePic", input.profilePic)

  const res = await fetch(apiUrl("/api/auth/profile"), {
    method: "PUT",
    credentials: "include",
    body,
  })
  return parseJson<{ message: string; user: CurrentUser }>(res)
}

export async function updatePassword(input: UpdatePasswordInput): Promise<{ message: string }> {
  const res = await fetch(apiUrl("/api/auth/profile/password"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })
  return parseJson<{ message: string }>(res)
}
