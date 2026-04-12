# opensource-chat-app — backend setup

The **backend** is a **Bun** + **Express** + **TypeScript** API using **Mongoose** for MongoDB. It powers authentication, teams, conversations, messages, friend requests, and file metadata for **opensource-chat-app**.

## Where to put `.env`

Use **only** the backend directory:

| Location | Use |
|----------|-----|
| **`backend/.env`** | **Yes** — this is the file the server loads (`dotenv.config()` runs with the backend as the working directory). |
| Repository root | **No** — not read by the API. |
| **`frontend/.env`** / **`frontend/.env.local`** | **No** for API secrets — the Next.js app never loads `backend/.env`. The frontend may use `.env.local` later for **`NEXT_PUBLIC_*`** values only (public browser config). |

Create the file as:

```text
opensource-chat-app/backend/.env
```

Keep it out of Git (`backend/.gitignore` already lists `.env`). Copy variables from the example block below; replace placeholders with your real values.

## Requirements

- [Bun](https://bun.sh) (v1.3+ recommended)
- MongoDB (local `mongod` or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Install

```bash
cd backend
bun install
```

## Environment variables

All variables below belong in **`backend/.env`** (see **Where to put `.env`** at the top of this page). Do not commit real secrets. Example:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/chatapp

# Auth (use a long random string in production)
JWT_SECRET=your-secret-key

# Used in emails and CORS-related flows; set to your frontend origin
CLIENT_URL=http://localhost:3000

# Email (optional — welcome mail on sign-up)
RESEND_API=
SENDER_EMAIL=
SENDER_NAME=opensource-chat-app

# Profile image uploads (optional)
CLOUD_NAME=
CLOUD_API=
CLOUD_SECRET=
```

- **`MONGODB_URI`** — required; the app exits if it is missing.
- **`JWT_SECRET`** — required for signed cookies used by protected routes.
- **Resend / Cloudinary** — optional; features degrade gracefully or skip when unset.

## Run the API

Development (watch mode):

```bash
bun run dev
```

Production-style (single run):

```bash
bun run start
```

Default listen address: **`http://localhost:3001`** (or `PORT` from `.env`).

API routes are mounted under **`/api`** (for example `/api/auth`, `/api/teams`, `/api/messages`).

## Tests

Integration tests use **Bun’s test runner**, **Supertest**, and **mongodb-memory-server** (no local MongoDB required for tests).

```bash
bun run test
```

From the monorepo root:

```bash
bun run test
```

## Demo database seed

Loads demo users, a team, conversations, messages, friend requests, and a sample file record. **Default mode wipes** the collections used by the app (users, teams, team members, conversations, messages, friend requests, uploaded-file metadata) in the database pointed to by `MONGODB_URI`, then inserts fresh demo data.

```bash
bun run seed
```

- **Password for all demo accounts:** `demo1234`
- **Emails:** `alice@demo.local`, `bob@demo.local`, `carol@demo.local`, `dave@demo.local`

To insert only into an **empty** database without wiping:

```bash
bun run seed --append
```

## Project layout (backend)

```
backend/
├── src/
│   ├── app.ts              # Express app factory (routes, no listen)
│   ├── server.ts           # listen + DB connect + production static
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── scripts/seed.ts     # Demo seed CLI
│   └── ...
├── tests/                  # Integration tests
└── package.json
```

## Cookies and the frontend

Sign-in sets an **httpOnly** cookie (`token`). The browser must call the API with **credentials** (`fetch(..., { credentials: 'include' })`) and the API must allow your frontend origin (you may need CORS configuration if the UI is not same-origin or not proxied).

## Production notes

With `NODE_ENV=production`, the server can serve the **Next.js static export** from `frontend/out` if you build the frontend into that path. For a split deployment (API on one host, Next on another), run the API alone and configure the frontend’s API base URL and CORS accordingly.
