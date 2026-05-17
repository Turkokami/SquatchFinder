# Squatch Finder

Squatch Finder is a commercial pest control CRM built for Sasquatch Pest Control. It helps a small team identify, score, store, and manage prospects across the U.S. with a workflow that is simple enough to use every day.

## Included features

- Lead search with Google Places API integration and offline demo fallback
- Business profile pages with contact records, notes, and opportunity context
- Lead scoring based on business type, risk exposure, recurring-need signals, traffic, and target service area
- Pipeline board for stage-based lead management
- Outreach history logging
- Follow-up reminders
- Dashboard with activity and reminder visibility
- CSV export for lead data
- Mobile-friendly Next.js UI

## Tech stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma 7 with `@prisma/adapter-pg`
- NextAuth credentials auth

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` values into `.env` if needed, then set:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/squatch_finder?schema=public"
NEXTAUTH_SECRET="your-own-random-secret"
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-public-token"
SERVICE_AREA_CENTER_LAT="48.7519"
SERVICE_AREA_CENTER_LNG="-122.4787"
SERVICE_AREA_RADIUS_MILES="60"
SERVICE_AREA_STATES="WA,OR"
```

3. Push the Prisma schema to Postgres.

```bash
npm run db:push
```

4. Seed the demo account and sample leads.

```bash
npm run db:seed
```

5. Start the app.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo login

- Email: `owner@squatchfinder.local`
- Password: `sasquatch123`

## Useful scripts

- `npm run dev` - start the Next.js dev server
- `npm run lint` - run ESLint
- `npm run build` - create a production build
- `npm run db:generate` - generate Prisma client
- `npm run db:push` - sync schema to your Postgres database
- `npm run db:seed` - seed the demo data

## GitHub and Vercel deployment

1. Push the `squatch-finder` folder to a GitHub repository.
2. Import that repo into Vercel as a Next.js project.
3. If the repo contains multiple folders, set the Vercel `Root Directory` to `squatch-finder`.
4. Add these environment variables in Vercel:

```bash
DATABASE_URL="your-production-postgres-url"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
NEXTAUTH_SECRET="your-long-random-secret"
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
GOOGLE_PLACES_SEARCH_RADIUS_METERS="25000"
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="your-mapbox-public-token"
SERVICE_AREA_CENTER_LAT="48.7519"
SERVICE_AREA_CENTER_LNG="-122.4787"
SERVICE_AREA_RADIUS_MILES="60"
SERVICE_AREA_STATES="WA,OR"
```

5. Deploy in Vercel.
6. After the first successful deploy, run:

```bash
npm run db:push
```

7. Optional: load demo data into that database:

```bash
npm run db:seed
```

## Release readiness checklist

- `postinstall` runs `prisma generate`, so Vercel can build from a clean checkout.
- `.env.example` includes all required deployment variables.
- `npm run db:generate` succeeds.
- `npm run lint` succeeds.
- `npm run build` succeeds.
- `/api/export/leads` returns the CSV export used by the dashboard `Export CSV` button.

## Notes

- If `GOOGLE_PLACES_API_KEY` is blank, Squatch Finder falls back to demo search results so the UI still works during local setup.
- The authenticated app area is intentionally server-rendered and dynamic, which fits CRM-style data better than static generation.
- The live map view uses Mapbox GL. Add `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to enable the interactive map at `/map`.
- Optional service-area scoring can be configured with `SERVICE_AREA_CENTER_LAT`, `SERVICE_AREA_CENTER_LNG`, `SERVICE_AREA_RADIUS_MILES`, or fallback `SERVICE_AREA_STATES`.
- A normalized PostgreSQL reference schema is available at [docs/postgresql-crm-schema.sql](C:\Users\turko\Documents\New project 3\squatch-finder\docs\postgresql-crm-schema.sql).
