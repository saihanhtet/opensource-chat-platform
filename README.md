# opensource-chat-app

Open-source chat platform: **Bun** + **Express** + **MongoDB** backend and **Next.js** frontend.

## Documentation

Detailed setup lives in the **[readme](./readme/)** folder:

- **[readme/README.md](./readme/README.md)** — overview and quick start  
- **[readme/backend-setup.md](./readme/backend-setup.md)** — API server, env, tests, seed  
- **[readme/frontend-setup.md](./readme/frontend-setup.md)** — Next.js app  
- **[bruno/README.md](./bruno/README.md)** — Bruno HTTP collection for the REST API  

## Test the API with Bruno

This repo includes a **[Bruno](https://www.usebruno.com/)** collection in the **[`bruno/`](./bruno/)** folder (plain-text requests you can version in Git).

1. **Download and install Bruno** from **[https://www.usebruno.com/](https://www.usebruno.com/)** (desktop app; local-first, no account required for local use).
2. **Clone or download** this project so you have the `bruno` folder on disk.
3. In Bruno, **Open Collection** and choose the **`bruno`** directory (the one that contains `opencollection.yml`).
4. Start the backend (`bun run --cwd backend dev`), optionally run `bun run seed` for demo logins, then run **Sign In** and the other requests.

Full details: **[bruno/README.md](./bruno/README.md)**.

## Environment variables (`.env`)

**Put your `.env` file in the `backend/` folder only** — not in the repo root and not in `frontend/`. The API loads `dotenv` from `backend/.env` when you run the server from that package.

- **Required for local API:** `MONGODB_URI`, `JWT_SECRET` (and usually `CLIENT_URL` for cookies/email links).
- **Optional:** Resend, Cloudinary, etc. — see [readme/backend-setup.md](./readme/backend-setup.md).
- **Frontend:** no `.env` is required to start Next.js. If you need a public API URL in the browser, use optional `frontend/.env.local` with `NEXT_PUBLIC_*` variables only — never put secrets there.

Add `backend/.env` to version control ignore lists (already covered by `.gitignore`).

## Quick start

```bash
bun install --cwd backend && bun install --cwd frontend
```

Create **`backend/.env`** as described above and in the backend guide, start MongoDB, then:

```bash
bun run --cwd backend dev    # API → http://localhost:3001
bun run --cwd frontend dev   # UI  → http://localhost:3000
```

Optional demo data:

```bash
bun run seed
```

## Root scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Install deps and build the frontend |
| `bun run start` | Start the backend |
| `bun run test` | Backend integration tests |
| `bun run seed` | Wipe app collections (default) and insert demo users/data |

## License

MIT
