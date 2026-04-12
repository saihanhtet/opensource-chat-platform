# opensource-chat-app — Bruno API collection

This folder is a **[Bruno](https://www.usebruno.com/)** collection for exercising the **HTTP REST API** (`/api/...`) while the backend is running. Collections are plain files in the repo so you can open them directly—no separate export step.

## Install Bruno and open this folder

1. **Download Bruno** from **[https://www.usebruno.com/](https://www.usebruno.com/)** and install the desktop app ([git-native, local-first API client](https://www.usebruno.com/)).
2. **Get this project** on your computer (clone the repo or download a ZIP that includes the `bruno` directory).
3. In Bruno: **Open Collection** → pick this **`bruno`** folder (the same directory as `opencollection.yml`). You should see folders such as Auth, Teams, Messages, etc.

If you only have a ZIP, extract it first; Bruno needs a real folder path on disk.

## Prerequisites

1. **Backend running** with `backend/.env` configured (see [../readme/backend-setup.md](../readme/backend-setup.md)).
2. Default API base URL: **`http://localhost:3001/api`** — set in collection variables as `BaseURL` if your `PORT` differs.
3. **Demo users** (optional but recommended): from the repo root run `bun run seed`, then use:
   - `alice@demo.local` / `demo1234`
   - `bob@demo.local` / `demo1234`
   - `carol@demo.local` / `demo1234`

Collection variables `demoEmail`, `demoEmail2`, `demoEmailReceiver`, and `demoPassword` are pre-filled for that seed.

## Cookies (auth)

Protected routes use an **httpOnly** cookie named `token` set on **Sign In**. In Bruno, enable **cookie jar** / session handling for the collection so follow-up requests send the cookie to the same host (`localhost:3001`).

Typical flow:

1. **Sign In** (or **Sign In (second user)** / **Sign In (receiver)** for another account).
2. **Check Token** — should return `200` and the user JSON.
3. Call **Teams**, **Messages**, etc.

Use **Sign Out** to clear the session cookie.

## ID variables (copy from responses)

Many requests use placeholders:

| Variable | Set from |
|----------|-----------|
| `myUserId` | `_id` from **Check Token** (current user) |
| `otherUserId` | Another user’s `_id` (e.g. seed user from DB or second account’s Check Token) |
| `teamId` | **Create Team** or **List Teams** response |
| `teamMemberId` | **List Members** response |
| `conversationId` | **List Conversations** or **Create Conversation** response |
| `messageId` | **List Messages** response |
| `friendRequestId` | **List Friend Requests** response |
| `fileId` | **List Files** response |

Paste values into **Collection variables** (or an environment) in Bruno.

## Folder map (matches Express routes)

| Folder | Mount |
|--------|--------|
| Auth | `/api/auth` |
| Settings | `/api/auth/profile` |
| Teams | `/api/teams` |
| Team Members | `/api/team-members` |
| Conversations | `/api/conversations` |
| Messages | `/api/messages` |
| Friend Requests | `/api/friend-requests` |
| Files | `/api/files` |

## Friend request “accept” flow (seed)

Seed includes a **pending** request from Bob → Carol. To accept:

1. **Sign In (receiver)** (`carol@demo.local`).
2. **List Friend Requests** — copy the pending request `_id` into `friendRequestId`.
3. **Update Status (receiver only)** — `accepted`.

## Real-time / WebSockets

This API is **REST + cookies** today. **Bruno only drives HTTP** here. Live chat push (WebSockets, SSE, etc.) is **not** in this collection; add a separate WS client or Bruno WS support when the server exposes a real-time channel.
