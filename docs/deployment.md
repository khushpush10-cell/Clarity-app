# Deployment Guide (Vercel)

## Prerequisites

- Vercel account
- MySQL database (PlanetScale, Railway, or equivalent)

## Steps

1. Create project on Vercel and link repository.
2. Set environment variables from `.env.example` in Vercel Project Settings.
3. Ensure `DATABASE_URL` points to your production MySQL instance.
4. Run Prisma migrations during deployment pipeline:

```bash
npm run prisma:migrate:deploy
```

5. Deploy using Vercel dashboard or CLI.

`vercel.json` is included for baseline function and build settings.
