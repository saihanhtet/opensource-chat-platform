# opensource-chat-app — frontend setup

The **frontend** is a **Next.js** (App Router) application with **React 19**, **TypeScript**, and **Tailwind CSS**. It is the web UI for **opensource-chat-app**.

## Environment files (backend vs frontend)

**API keys, database URL, and JWT secrets** belong in **`backend/.env` only** — see [Backend setup](./backend-setup.md). The frontend package does not read that file.

With the API on **`http://localhost:3000`** and Next on **`http://localhost:5173`**, the default setup uses **same-origin `/api` in the browser** and **`next.config.ts` rewrites** to the Express server. Copy **`frontend/.env.example`** → **`frontend/.env.local`** if you need to change the proxy target:

```env
BACKEND_PROXY_URL=http://127.0.0.1:3000
```

Only set **`NEXT_PUBLIC_API_URL`** if the browser must call the API on another origin (no `/api` rewrite). Never put secrets in `NEXT_PUBLIC_*` variables — they are exposed in the browser.

**Auth:** `middleware.ts` calls **`GET /api/auth/check-token`** with your cookies. Logged-in users hitting **`/login`** or **`/signup`** are redirected home; unauthenticated users hitting protected routes are sent to **`/login`** (with optional **`?from=`**).

## Requirements

- [Bun](https://bun.sh), **npm**, **pnpm**, or **yarn** (examples below use Bun)

## Install

```bash
cd frontend
bun install
```

## Run the development server

```bash
bun run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in the browser.

The dev server supports hot reload while you edit files under `app/`.

## Build and production serve

```bash
bun run build
bun run start
```

`next start` serves the production build on port **5173** (see the `start` script in `package.json`).

## Lint

```bash
bun run lint
```

## API base URL

The backend defaults to **`http://localhost:3000`** (see [Backend setup](./backend-setup.md)). If your Next app calls the API from the browser:

- Use the correct origin in `fetch` / API client configuration.
- Send **cookies** when using session-style auth (`credentials: 'include'` if the API sets cookies on sign-in).
- Ensure **CORS** and **SameSite** cookie settings match your deployment (localhost vs production domains).

See **`frontend/.env.example`** for `BACKEND_PROXY_URL` and optional `NEXT_PUBLIC_API_URL`.

## Monorepo workflow

From the repository root:

```bash
# Install frontend dependencies
bun install --cwd frontend

# Dev UI
bun run --cwd frontend dev
```

The root `bun run build` script installs backend + frontend dependencies and runs the Next.js production build.

## Project layout (frontend)

```
frontend/
├── app/                 # App Router pages and layouts
├── public/
├── next.config.ts
├── package.json
└── ...
```

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
