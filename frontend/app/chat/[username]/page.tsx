"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Separator } from "@/components/ui/separator"
import * as sidebar from "@/components/ui/sidebar"
import * as chatApi from "@/lib/chat-api"
import { rewriteToFormal } from "@/lib/gemini-api"
import { presenceLabel } from "@/lib/presence"
import {
  RiAttachment2,
  RiArrowUpLine,
  RiFileDownloadLine,
  RiFileTextLine,
} from "@remixicon/react"

export default function ChatPage() {
  const resolveAttachmentName = React.useCallback((fileUrl: string) => {
    try {
      const lastSegment = fileUrl.split("/").pop() ?? "file"
      return decodeURIComponent(lastSegment.split("?")[0] ?? "file")
    } catch {
      return "file"
    }
  }, [])

  const [filesByUrl, setFilesByUrl] = React.useState<Record<string, chatApi.UploadedFileRecord>>({})
  const attachmentKind = React.useCallback(
    (fileUrl: string) => {
      const byMime = filesByUrl[fileUrl]?.fileType?.toLowerCase()
      if (byMime?.startsWith("image/")) return "image"
      if (byMime?.startsWith("video/")) return "video"
      if (byMime?.startsWith("audio/")) return "audio"

      const lower = fileUrl.toLowerCase().split("?")[0] ?? ""
      if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return "image"
      if (/\.(mp4|webm|mov|m4v|ogg)$/.test(lower)) return "video"
      if (/\.(mp3|wav|m4a|aac|oga|flac)$/.test(lower)) return "audio"
      return "file"
    },
    [filesByUrl]
  )

  const params = useParams<{ username: string }>()
  const username = params.username
  const [conversationId, setConversationId] = React.useState<string>()
  const [myUserId, setMyUserId] = React.useState("")
  const [peerName, setPeerName] = React.useState("")
  const [peerStatus, setPeerStatus] = React.useState<string>()
  const [peerLastSeenAt, setPeerLastSeenAt] = React.useState<string>()
  const [messages, setMessages] = React.useState<chatApi.ChatMessage[]>([])
  const [draft, setDraft] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [rewriting, setRewriting] = React.useState(false)
  const [typingUsers, setTypingUsers] = React.useState<string[]>([])
  const [error, setError] = React.useState<string>()
  const listRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const syncMessages = React.useCallback(
    async (id: string) => {
      const latest = await chatApi.getConversationMessages(id)
      setMessages((prev) => {
        if (prev.length === latest.length) {
          const same = prev.every((message, index) => message._id === latest[index]?._id)
          if (same) return prev
        }
        return latest
      })
    },
    []
  )

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(undefined)
      try {
        const setup = await chatApi.ensureDirectConversation(username)
        if (!mounted) return
        setConversationId(setup.conversation._id)
        setMyUserId(setup.me._id)
        setPeerName(setup.peer.username)
        setPeerStatus(setup.peer.status)
        setPeerLastSeenAt(setup.peer.lastSeenAt ?? setup.peer.updatedAt)

        await syncMessages(setup.conversation._id)
        const files = await chatApi.getConversationFiles(setup.conversation._id)
        if (!mounted) return
        setFilesByUrl(
          Object.fromEntries(files.map((file) => [file.fileUrl, file]))
        )
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load chat")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [syncMessages, username])

  React.useEffect(() => {
    if (!conversationId) return
    const interval = window.setInterval(() => {
      void syncMessages(conversationId)
      void chatApi.getTypingStatus(conversationId).then((users) => {
        setTypingUsers(users.map((user) => user.username))
      })
      void chatApi.getConversationFiles(conversationId).then((files) => {
        setFilesByUrl(Object.fromEntries(files.map((file) => [file.fileUrl, file])))
      })
      void chatApi.getUserByUsername(username).then((peer) => {
        setPeerStatus(peer.status)
        setPeerLastSeenAt(peer.lastSeenAt ?? peer.updatedAt)
      })
    }, 1500)
    return () => {
      window.clearInterval(interval)
    }
  }, [conversationId, syncMessages, username])

  React.useEffect(() => {
    if (!conversationId) return
    const hasText = draft.trim().length > 0
    void chatApi.setTypingStatus({ conversationId, isTyping: hasText })
    return () => {
      void chatApi.setTypingStatus({ conversationId, isTyping: false })
    }
  }, [conversationId, draft])

  React.useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!conversationId || (!draft.trim() && !selectedFile)) return
    setSending(true)
    setError(undefined)
    try {
      const message = selectedFile
        ? (
            await chatApi.uploadChatFile({
              conversationId,
              file: selectedFile,
              content: draft.trim(),
            })
          ).message
        : await chatApi.sendMessage({
            conversationId,
            content: draft.trim(),
          })
      setMessages((prev) =>
        prev.some((existing) => existing._id === message._id) ? prev : [...prev, message]
      )
      setDraft("")
      setSelectedFile(null)
      await chatApi.setTypingStatus({ conversationId, isTyping: false })
      await syncMessages(conversationId)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleRewrite = async () => {
    if (!draft.trim()) return
    setRewriting(true)
    setError(undefined)
    try {
      const rewritten = await rewriteToFormal({
        text: draft.trim(),
        model: "gemini-2.0-flash",
      })
      setDraft(rewritten.rewrittenText)
    } catch (rewriteError) {
      setError(rewriteError instanceof Error ? rewriteError.message : "Failed to rewrite text")
    } finally {
      setRewriting(false)
    }
  }

  return (
    <sidebar.SidebarProvider>
      <AppSidebar />
      <sidebar.SidebarInset className="h-svh">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <sidebar.SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-full" />
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${peerStatus === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
            <h1 className="font-semibold">@{peerName || username}</h1>
            <span className="text-xs text-muted-foreground">
              {presenceLabel(peerStatus, peerLastSeenAt)}
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
          {loading ? <p className="p-4 text-sm text-muted-foreground">Loading chat...</p> : null}
          {error ? <p className="p-4 text-sm text-destructive">{error}</p> : null}

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            ) : null}
            {messages.map((message) => {
              const isMine = message.senderId === myUserId
              const isAudioAttachment =
                !!message.fileUrl && attachmentKind(message.fileUrl) === "audio"
              return (
                <div key={message._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`px-3 py-2 text-sm shadow-sm ${
                      isMine
                        ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-2xl rounded-bl-md border bg-background text-foreground"
                    } ${
                      isAudioAttachment
                        ? "w-[min(22rem,82vw)]"
                        : "max-w-[78%]"
                    }`}
                  >
                    {message.content ? <p>{message.content}</p> : null}
                    {message.fileUrl ? (
                      <div className="mt-2">
                        {attachmentKind(message.fileUrl) === "image" ? (
                          <a href={message.fileUrl} target="_blank" rel="noreferrer">
                            <img
                              src={message.fileUrl}
                              alt={resolveAttachmentName(message.fileUrl)}
                              className="max-h-80 rounded-lg object-cover"
                            />
                          </a>
                        ) : null}

                        {attachmentKind(message.fileUrl) === "video" ? (
                          <video
                            controls
                            className="max-h-80 rounded-lg"
                            src={message.fileUrl}
                          />
                        ) : null}

                        {attachmentKind(message.fileUrl) === "audio" ? (
                          <div
                            className={`w-full rounded-lg p-2 ${
                              isMine ? "bg-primary-foreground/20" : "bg-muted"
                            }`}
                          >
                            <audio
                              controls
                              className="block w-full max-w-full"
                              src={message.fileUrl}
                            />
                          </div>
                        ) : null}

                        {attachmentKind(message.fileUrl) === "file" ? (
                          <div className={`flex items-center justify-between gap-3 rounded-lg p-3 ${isMine ? "bg-primary-foreground/20" : "bg-muted"}`}>
                            <div className="flex min-w-0 items-center gap-2">
                              <RiFileTextLine className="size-5 shrink-0" />
                              <span className="truncate text-xs">
                                {filesByUrl[message.fileUrl]?.fileName ?? resolveAttachmentName(message.fileUrl)}
                              </span>
                            </div>
                            <a
                              href={message.fileUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                            >
                              <RiFileDownloadLine className="size-4" />
                              Download
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
          
          {!loading && typingUsers.length > 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
            </p>
          ) : null}

          <form onSubmit={handleSend} className="border-t bg-background p-3">
            <div className="rounded-2xl border bg-background">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message @${peerName || username}`}
                className="h-12 w-full rounded-t-2xl border-0 bg-transparent px-4 text-sm outline-none"
              />
              {selectedFile ? (
                <div className="px-4 pb-2 text-xs text-muted-foreground">
                  File: {selectedFile.name}
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t px-2 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleRewrite}
                    disabled={!draft.trim() || rewriting}
                    className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                    title="Rewrite text with Gemini free model"
                  >
                    {rewriting ? "Rewriting..." : "Rewrite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                    title="Attach file"
                  >
                    <RiAttachment2 className="size-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setSelectedFile(file)
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={(!draft.trim() && !selectedFile) || !conversationId || sending}
                  className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50"
                  title={sending ? "Sending..." : "Send message"}
                >
                  <RiArrowUpLine className="size-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </sidebar.SidebarInset>
    </sidebar.SidebarProvider>
  )
}
