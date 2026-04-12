# opensource-chat-app

Open-source chat platform: **Bun** + **Express** + **MongoDB** backend and **Next.js** frontend.

## Documentation

Detailed setup lives in the **[readme](./readme/)** folder:

- **[readme/README.md](./readme/README.md)** — overview and quick start  
- **[readme/backend-setup.md](./readme/backend-setup.md)** — API server, env, tests, seed  
- **[readme/frontend-setup.md](./readme/frontend-setup.md)** — Next.js app  

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
