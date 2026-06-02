# PORTIONS

PORTIONS is a Pharmacy Command OS for multi-branch pharmacies. It helps owners and managers monitor chronic patients, refill follow-ups, online orders, branch performance, stock intelligence, reports, and AI-style operating briefs from one dashboard.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Update `DATABASE_URL` in `.env` for your local PostgreSQL database.

4. Run the Prisma migration:

```bash
npm run prisma:migrate
```

5. Seed demo data:

```bash
npm run prisma:seed
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Data

The seed creates a Zimbabwean multi-branch pharmacy dataset:

- Branches: Avondale, Borrowdale, CBD, Eastlea, Chitungwiza
- 8 staff members
- 30 chronic patients
- 40 follow-up tasks
- 25 orders
- 60 stock items
- 6 reports

## Routes

- `/` Dashboard
- `/patients` Chronic Patients
- `/patients/[id]` Patient detail
- `/follow-ups` Follow-Up Queue
- `/orders` Orders
- `/orders/[id]` Order detail
- `/branches` Branches
- `/branches/[id]` Branch detail
- `/stock` Stock Intelligence
- `/ai-brief` AI Brief
- `/reports` Reports
- `/settings` Settings

Authentication is intentionally not implemented yet. The app uses an admin route group and shared shell so an admin login layer can be added later.
