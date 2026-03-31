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

## Tech stack

- Next.js 14 (App Router), React, TypeScript
- Tailwind CSS
- Prisma (SQLite)
- NextAuth (credentials)
- Recharts (reports)
