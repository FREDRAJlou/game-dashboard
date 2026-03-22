# 🎮 Game Dashboard

Tournament and match management system for table tennis with real-time scoring and analytics.

## Features

- 🏆 Tournament Management (Singles/Doubles)
- 🎯 Live Match Scoring with Individual Player Stats
- 📊 Player & Team Statistics
- 👥 Group Management with Color Coding
- 📈 Performance Analytics & Charts

## Quick Start

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Visit: http://localhost:3000

## Vercel Deployment

### 1. Choose Database

**Vercel Postgres** (Recommended)
```bash
vercel postgres create game-dashboard-db
```

**Turso** (SQLite Edge - Easiest)
```bash
turso db create game-dashboard
turso db show game-dashboard --url
turso db tokens create game-dashboard
```

### 2. Update Schema (PostgreSQL only)

In `prisma/schema.prisma` change:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Deploy

```bash
vercel --prod
npx prisma migrate deploy
```

### 4. Create Admin

Use Prisma Studio or database GUI:
```bash
npx prisma studio
```

Create user:
- name: "Admin"
- email: "your@email.com"
- password: "secure-password"
- isAdmin: true

## Tech Stack

- Next.js 16.2 + App Router
- Prisma ORM (SQLite dev / PostgreSQL prod)
- Material-UI v7
- Chart.js + react-chartjs-2
- TypeScript

## Environment Variables

```bash
# Development (SQLite)
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
DATABASE_URL="postgresql://..."

# Production (Turso)
DATABASE_URL="libsql://..."
DATABASE_AUTH_TOKEN="..."
```

## License

MIT
