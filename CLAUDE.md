# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Project Overview

**TNS FashionAI** (a.k.a. `tnkr-app`) is a Next.js web app for a Colombian fashion company. Users log in, register garment sales, view a sales dashboard, and request AI-generated production/collection recommendations from Claude.

UI strings are in Spanish.

---

## Running the App

```bash
cd ~/TNKR/tnkr-app
npm run dev
```

App: http://localhost:3000 (auto-redirects `/` → `/login`)

Stop:
```bash
kill $(lsof -ti:3000)
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, inline styles (no Tailwind components yet though Tailwind v4 is installed) |
| Auth + DB | Supabase (`@supabase/supabase-js`) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — model `claude-sonnet-4-20250514` |

---

## Architecture

### Routes (`app/`)

- **`page.tsx`** — Server-side `redirect('/login')`.
- **`login/page.tsx`** — Client component. Email/password form. Calls `supabase.auth.signInWithPassword`, then `window.location.href = '/dashboard'`.
- **`dashboard/page.tsx`** — Client component. Three sections via local state: `dashboard` (KPIs + bar chart + recent sales), `ventas` (form to register + table of all sales), `ia` (button that POSTs the sales summary to `/api/analizar`).
- **`api/analizar/route.ts`** — POST handler. Receives `{ ventas: string }`, calls Claude, returns `{ resultado: string }`.

### Data model (Supabase)

Single table `ventas` with columns roughly: `id`, `created_at`, `empresa` (user email), `tipo_prenda`, `color`, `talla`, `unidades`, `precio`, `temporada`. Inserts and selects go straight from the dashboard via the public Supabase key — there is no per-tenant filtering yet beyond what RLS does on the Supabase side.

### Auth flow

`login/page.tsx` uses Supabase auth. `dashboard/page.tsx` calls `supabase.auth.getUser()` on mount and redirects to `/login` if no user. There is no middleware-level route protection.

---

## Environment Variables

`.env.local` (gitignored — contains real secrets, do not paste contents into chat or commits):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `ANTHROPIC_API_KEY`

---

## Known Issues / Cleanup Notes

- `@anthropic-ai/sdk` is imported by `app/api/analizar/route.ts` but is **not** in `package.json` — `/api/analizar` will throw at runtime until you `npm install @anthropic-ai/sdk`.
- Two lockfiles exist: `~/TNKR/package-lock.json` and `~/TNKR/tnkr-app/package-lock.json`. Next.js infers the parent as workspace root and warns. Delete the outer `~/TNKR/package-lock.json` and `~/TNKR/node_modules/` if not used, or set `turbopack.root` in `next.config.ts`.
- An empty `~/TNKR/VS CODE/` folder exists alongside the app — safe to delete.
- `app/layout.tsx` still has placeholder metadata (`title: "Create Next App"`). Update before production.

---

## Notes from `AGENTS.md`

This Next.js (v16) has breaking changes vs older training data — consult `node_modules/next/dist/docs/` before writing non-trivial code and heed deprecation notices.
All changes must be committed to Git and pushed to the GitHub repository.

## Git Rule

- Every new file and every code change must be tracked in Git before considering the task complete.
- Do not leave implementation files untracked; use Git status to verify the working tree before finishing.
