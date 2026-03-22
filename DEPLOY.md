# Vercel Deployment Steps

## 1. Install Vercel CLI

```bash
npm i -g vercel
```

## 2. Login

```bash
vercel login
```

## 3. Link Project

```bash
vercel link
```

## 4. Create Database

Choose one:

### Vercel Postgres
```bash
vercel postgres create game-dashboard-db
```

### Turso (SQLite Edge)
```bash
# Install
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create DB
turso db create game-dashboard

# Get credentials
turso db show game-dashboard --url
turso db tokens create game-dashboard
```

## 5. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

**For Vercel Postgres:**
- `DATABASE_URL` (auto-set)

**For Turso:**
- `DATABASE_URL=libsql://your-db.turso.io`
- `DATABASE_AUTH_TOKEN=your-token`

## 6. Deploy

```bash
vercel --prod
```

## 7. Run Migrations

```bash
vercel env pull .env.production
npx prisma migrate deploy
```

## 8. Create Admin User

```bash
npx prisma studio
```

Or via SQL:
```sql
INSERT INTO User (name, email, password, isAdmin, createdAt, updatedAt)
VALUES ('Admin', 'admin@example.com', 'password', 1, datetime('now'), datetime('now'));
```

## Done! 🎉

Your app is now live at: `https://your-project.vercel.app`
