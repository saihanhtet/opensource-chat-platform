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

Keep it out of Git (`backend/.gitignore` already lists `.env`). Copy from **`backend/.env.example`** to create `backend/.env`, then edit values.

## Ports: API vs Next.js

This repo standardizes local ports so they do not clash:

| What | Port | Variable / config |
|------|------|-------------------|
| **Express API** | **3000** | `PORT` in `backend/.env` (default in code if unset) |
| **Next.js** (browser UI) | **5173** | `next dev -p 5173` / `next start -p 5173` in **`frontend/package.json`** |

Only one process can bind to a port, so the API and Next must use different values (3000 vs 5173).

**`CLIENT_URL`** is the **frontend** URL (emails, cookie context), not the API:

```env
CLIENT_URL=http://localhost:5173
PORT=3000
```

The browser calls the API at **`http://localhost:3000`** via **`NEXT_PUBLIC_API_URL`** in `frontend/.env.local` — see [Frontend setup](./frontend-setup.md).

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
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/chatapp

# Auth (use a long random string in production)
JWT_SECRET=your-secret-key

# Frontend origin (Next on 5173 in this repo)
CLIENT_URL=http://localhost:5173

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

## API smoke tests (Bruno)

Download **[Bruno](https://www.usebruno.com/)** from **[https://www.usebruno.com/](https://www.usebruno.com/)**, then **Open Collection** and select the repo’s **`bruno`** folder (contains `opencollection.yml`) to call all REST routes against a running server. See **[`bruno/README.md`](../bruno/README.md)** for `BaseURL`, cookies, and ID variables.

## Run the API

Development (watch mode):

```bash
bun run dev
```

Production-style (single run):

```bash
bun run start
```

Default listen address: **`http://localhost:3000`** (or `PORT` from `.env`).

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
│   ├── server.ts           # listen + DB connect + production Next (App Router)
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

With `NODE_ENV=production`, **`bun run --cwd backend start`** runs Express **and** the **Next.js** app from `frontend/.next` (run `bun run --cwd frontend build` first). The UI and `/api` share one origin (same port), so the auth cookie stays on that host. Set **`CLIENT_URL`** in `backend/.env` to that public URL (e.g. `http://localhost:3000` locally).

For a split deployment (API on one host, Next on another), run them separately and configure **`NEXT_PUBLIC_API_URL`**, CORS, and cookies for your domains.
