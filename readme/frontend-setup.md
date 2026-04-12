# opensource-chat-app — frontend setup

The **frontend** is a **Next.js** (App Router) application with **React 19**, **TypeScript**, and **Tailwind CSS**. It is the web UI for **opensource-chat-app**.

## Environment files (backend vs frontend)

**API keys, database URL, and JWT secrets** belong in **`backend/.env` only** — see [Backend setup](./backend-setup.md). The frontend package does not read that file.

You can run `bun run dev` in `frontend/` with **no** `.env` file. If you need build-time public config (for example a browser-visible API base URL), add optional **`frontend/.env.local`** and use only variables prefixed with **`NEXT_PUBLIC_`**. Never put secrets in `NEXT_PUBLIC_*` or in the frontend repo — they would be exposed to anyone using the site.

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

Open **[http://localhost:3000](http://localhost:3000)** in the browser.

The dev server supports hot reload while you edit files under `app/`.

## Build and production serve

```bash
bun run build
bun run start
```

`next start` serves the optimized production build (default port **3000**, unless configured otherwise).

## Lint

```bash
bun run lint
```

## API base URL

The backend defaults to **`http://localhost:3001`** (see [Backend setup](./backend-setup.md)). If your Next app calls the API from the browser:

- Use the correct origin in `fetch` / API client configuration.
- Send **cookies** when using session-style auth (`credentials: 'include'` if the API sets cookies on sign-in).
- Ensure **CORS** and **SameSite** cookie settings match your deployment (localhost vs production domains).

Optional: add **`frontend/.env.local`** (still not a substitute for `backend/.env`) for public vars only, for example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

(Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.)

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
