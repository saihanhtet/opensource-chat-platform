# opensource-chat-app — documentation

This folder holds setup and project documentation for **opensource-chat-app**, an open-source chat platform with a Bun/Express API and a Next.js frontend.

## Guides

| Document | Description |
|----------|-------------|
| [Backend setup](./backend-setup.md) | API server, environment variables, MongoDB, tests, demo seed |
| [Frontend setup](./frontend-setup.md) | Next.js app, dev server, build, and how it talks to the API |

## API testing (Bruno)

The **[`bruno/`](../bruno/)** folder is a **[Bruno](https://www.usebruno.com/)** collection (git-friendly API requests) for all `/api` routes.

1. Install **[Bruno](https://www.usebruno.com/)** — download the app from **[https://www.usebruno.com/](https://www.usebruno.com/)**.
2. With this repository on your machine (clone or ZIP), open Bruno and use **Open Collection**.
3. Select the project’s **`bruno`** folder (it must contain `opencollection.yml`).
4. Start the API (`bun run --cwd backend dev`), set `backend/.env`, optionally `bun run seed`, then call **Sign In** and the rest of the folders.

See **[`bruno/README.md`](../bruno/README.md)** for `BaseURL`, cookie jar, ID variables, and demo accounts.

## Environment file location

**Create a single `.env` file inside `backend/`** (`backend/.env`). The Express app reads configuration from there. Do **not** place the main secrets file in the monorepo root or under `frontend/` — the frontend does not load that file. For Next.js-only public variables (e.g. `NEXT_PUBLIC_API_URL`), you may optionally add `frontend/.env.local` (see [Frontend setup](./frontend-setup.md)).

Never commit `.env`; it should stay ignored by Git.

## Quick start (monorepo root)

From the repository root:

```bash
bun install --cwd backend
bun install --cwd frontend
```

Create **`backend/.env`** (see [Backend setup](./backend-setup.md)), start MongoDB, then:

```bash
# Terminal 1 — API (default http://localhost:3000)
bun run --cwd backend dev

# Terminal 2 — UI (default http://localhost:5173)
bun run --cwd frontend dev
```

Optional: load demo data into the database (see backend guide):

```bash
bun run seed
```

## Repository layout

```
opensource-chat-app/
├── backend/
│   └── .env          # API secrets & config (you create this; not committed)
├── bruno/            # Bruno API collection (open this folder in Bruno)
├── frontend/         # Next.js UI (optional .env.local for NEXT_PUBLIC_* only)
├── readme/           # This documentation
└── package.json      # Root scripts (build, start, test, seed)
```

## Root scripts

| Command | Purpose |
|---------|---------|
| `bun run build` | Install deps and build the frontend |
| `bun run start` | Start the backend (production-style) |
| `bun run test` | Run backend integration tests |
| `bun run seed` | Seed the database with demo users and data |
