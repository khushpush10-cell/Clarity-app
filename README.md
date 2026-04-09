# Clarity

Clarity is a desktop-first productivity suite for tasks, habits, routines, focus sessions, team workspaces, and analytics.

## Stack

- Svelte 5 + SvelteKit + TypeScript (strict)
- Tailwind CSS
- Prisma + MySQL
- JWT auth + Google token flow + optional 2FA
- Vercel adapter

## Run Locally

1. Install:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

If 5173 is already in use, Vite will auto-pick the next port (for example 5174).

## Main Routes

- `/dashboard`
- `/tasks`
- `/habits`
- `/calendar`
- `/team`
- `/goals`
- `/analytics`
- `/settings`
- `/settings/workspace`

## API Surface (Implemented)

- Auth: register/login/logout/refresh/google/forgot/reset/verify-email/2fa enable-disable
- Users: me profile CRUD + session list/revoke + logout other devices
- Workspaces + members CRUD
- Tasks CRUD + complete + duplicate + comments + attachments placeholder + activity stream
- Habits CRUD + logging + stats + daily check-in
- Focus sessions start/end/stats/list
- Goals CRUD + progress updates
- Progress core + calculate + rewards
- Analytics overview/tasks/habits/focus/export
- Search endpoint
- Notifications list/create/read/read-all
- Reviews (weekly/monthly) summary endpoint
- Data export/import (JSON/CSV payloads)
- Cron backup endpoint (Vercel cron compatible)

## PWA / Offline

- `static/manifest.webmanifest`
- `src/service-worker.ts`
- `static/offline.html`
- Service worker registration in app layout

## Quality Checks

- `npm run check` passes (0 errors)
- `npm run test` passes

## Notes

- Some UI components still emit Svelte warnings (slot deprecation + a11y labels); functionality works.
- For full production hardening, add real file storage for attachments and real PDF rendering for review exports.
