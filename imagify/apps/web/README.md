# Imagify Web

Next.js 14 frontend for Imagify. Pages live in `app/`; shared components, the API client, and the auth context live in `src/`.

```bash
# From imagify/ (installs the whole workspace)
pnpm install

# Start the dev server on http://localhost:3000
cd apps/web && pnpm dev
```

API requests go to `/api/v1`, which Next.js forwards to the API at `API_URL` (default `http://localhost:4000`). To call the API directly instead, set `NEXT_PUBLIC_API_URL` (for example `http://localhost:4000/api/v1`) in `apps/web/.env.local`.
