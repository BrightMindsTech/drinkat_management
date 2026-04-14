# Drinkat Management System

Web-based HR, QC, and Reports for Drinkat (3 branches: MEU, HU, Airport Street).

## Roles

- **Owner**: Register/delete staff, view staff cards, approve/deny advances, upload or enter salary copy, view deduction report, create/assign checklists, view reports with analytics and charts.
- **QC staff**: Create/assign checklists, review QC submissions (rate, comment, approve/deny).
- **Staff**: Request advances, view own info, upload QC submissions (photos) for assigned checklists.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database (SQLite):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

3. Copy `.env` and ensure `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are set. Default `.env` includes:
   - `DATABASE_URL="file:./dev.db"`
   - `NEXTAUTH_SECRET="drinkat-secret-change-in-production"`
   - `NEXTAUTH_URL="http://localhost:3000"`

4. Run the app:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and sign in as owner:
   - Email: `owner@drinkat.com`
   - Password: `owner123`

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:push` — Apply Prisma schema to DB
- `npm run db:seed` — Seed branches and owner user
- `npm run db:studio` — Open Prisma Studio

## Cloudflare preview (Workers + D1 + R2)

This matches the deployed stack: OpenNext on Workers, D1, R2 uploads — not plain `next dev`.

1. **Install & Wrangler login**
   ```bash
   npm install
   npx wrangler login
   ```

2. **Secrets for NextAuth in preview** — Wrangler does not use `.env` the same way as `next dev`. Copy the example and edit:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Set `NEXTAUTH_SECRET` to a strong value. Start preview once (step 5), note the URL in the terminal (often `http://127.0.0.1:8788`), then set `NEXTAUTH_URL` in `.dev.vars` to that origin and restart preview.

3. **D1 database** — `wrangler.jsonc` references a `database_id`. It must exist in **your** Cloudflare account (or be replaced):
   - Create: `npx wrangler d1 create drinkat-management` and paste the new id into `wrangler.jsonc` (and `wrangler.seed-d1.jsonc` if you use remote seeding).
   - Apply schema to **local** D1 (used by `npm run preview`):
     ```bash
     npm run db:d1:migrate:local
     ```
   - Seed **local** D1 (owner login, branches, etc.):
     ```bash
     npm run db:seed:local
     ```
   - To seed the **remote** D1 in Cloudflare (same DB as `wrangler d1 execute --remote`), use `npm run db:seed:remote` after migrating remote.

4. **R2** — `UPLOADS` in `wrangler.jsonc` must point at a bucket in your account (create `drinkat-management-uploads` in the dashboard or via Wrangler) or adjust `bucket_name`.

5. **Run preview**
   ```bash
   npm run preview
   ```
   This runs `opennextjs-cloudflare build`, Prisma workerd fixup, then `opennextjs-cloudflare preview`. Sign in with `owner@drinkat.com` / `owner123` after seeding.

For production deploy: `npm run deploy` (requires Cloudflare resources and secrets configured).

## iOS app (Capacitor — wraps your deployed site)

The native shell loads your **live HTTPS** deployment (same app as the browser). No SwiftUI rewrite.

1. **Set your deploy URL** in `capacitor.config.ts` → `server.url` (replace `https://REPLACE_ME`, no trailing slash). Must match what you use for `NEXTAUTH_URL` / cookies (same host).

2. **Install CocoaPods** (required once on your Mac):
   ```bash
   brew install cocoapods
   ```
   Or see [Capacitor iOS setup](https://capacitorjs.com/docs/getting-started/environment-setup).

3. **Generate the iOS project** (once), from the **inner** app folder (where `package.json` lives — e.g. `.../drinkat_management/drinkat_management/`, not the parent clone folder):
   ```bash
   cd path/to/drinkat_management   # same folder as package.json + capacitor.config.ts
   npm install
   npm run cap:add:ios     # must run before cap:ios — creates ./ios/
   npm run cap:sync
   ```

4. **Open in Xcode** and run on a simulator or device:
   ```bash
   npm run cap:ios
   ```

5. After changing `capacitor.config.ts`, run `npm run cap:sync` again.

If `npx cap …` errors with **“could not determine executable to run”**, use the commands above or **`npx @capacitor/cli …`** instead of **`npx cap …`**.

Scripts: `npm run cap:sync` · `npm run cap:ios` (opens Xcode) · **`npm run cap:run:ios`** (build & launch Simulator **without** opening Xcode).

## Time clock troubleshooting (popup not showing)

If the **"Did you leave?"** popup does not appear when a clocked-in user leaves the branch geofence, check these known causes/fixes:

- Geofence watch must require **location consent only** (not push consent).
- `POST /api/time-clock/location-event` must allow location-only consent and not reject with push-related `403`.
- Client geofence transition handler should have a fallback call to `POST /api/time-clock/presence-check` when transition response is missing/failed.
- `POST /api/time-clock/presence-check` should trigger away when **outside radius + clocked in + no active away** (do not suppress just because shift ended).
- `POST /api/time-clock/location-event` should return `destination_required` on `exit` while clocked in and outside radius.

Current expected behavior:

- Presence check runs every ~3 seconds while clocked in.
- Leaving branch radius should open the forced-away modal reliably, even if push notifications are disabled.

## Tech stack

- Next.js 14 (App Router), React, TypeScript
- Tailwind CSS
- Prisma (SQLite)
- NextAuth (credentials)
- Recharts (reports)
