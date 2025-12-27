# Brzi Setup - Supabase Connection String

## Opcija 1: Pronađi Connection String u Supabase

1. Idi na: https://supabase.com/dashboard/project/tjijfyywqtmtuaxqcqvj
2. Potraži **"Connect"** dugme na vrhu stranice
3. Klikni **"Connect"** > **"Direct connection"**
4. Kopiraj connection string

## Opcija 2: Konstruiši Connection String

Ako imaš lozinku koju si postavio pri kreiranju projekta, koristi ovaj format:

### Za Prisma (sa pgbouncer - preporučeno):
```env
DATABASE_URL="postgresql://postgres.tjijfyywqtmtuaxqcqvj:[TvojaLozinka]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### Direktan connection (bez pgbouncer):
```env
DATABASE_URL="postgresql://postgres.tjijfyywqtmtuaxqcqvj:[TvojaLozinka]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

**Zamijeni `[TvojaLozinka]` sa lozinkom!**

## Kompletan .env fajl

Nakon što imaš DATABASE_URL, zalijepi ovo u `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.tjijfyywqtmtuaxqcqvj:[TvojaLozinka]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
JWT_SECRET="lanci-loveverse-secret-key-2024-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

## Nakon .env setup-a

```powershell
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed
```

