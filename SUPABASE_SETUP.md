# Supabase Setup Guide za Lanci LoveVerse

## Zašto Supabase?
- ✅ **Besplatan** - 500MB baza podataka, dovoljno za development
- ✅ **Automatski PostgreSQL** - ne treba instalirati lokalno
- ✅ **Connection string** - dobiješ odmah nakon kreiranja
- ✅ **Web dashboard** - lako upravljanje bazom
- ✅ **Prisma kompatibilan** - radi direktno sa našim setup-om

## Koraci za Setup

### 1. Kreiraj Supabase Account
1. Idi na: https://supabase.com
2. Klikni **"Start your project"** (besplatno)
3. Login sa **GitHub** ili **Google** accountom

### 2. Kreiraj Novi Projekt
1. Klikni **"New Project"**
2. Unesi:
   - **Name**: `lanci-loveverse`
   - **Database Password**: **ZAPAMTI OVU LOZINKU!** (npr. `LanciLove2025!`)
   - **Region**: Odaberi najbližu (npr. `West Europe` ili `Central EU`)
3. Klikni **"Create new project"**
4. Sačekaj 2-3 minute da se kreira

### 3. Dobij Connection String
1. Kada se projekt kreira, idi u **Settings** (lijevo u sidebaru)
2. Klikni **Database**
3. Scrollaj do **Connection string**
4. Odaberi **URI** format
5. **Kopiraj** connection string (izgleda ovako):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### 4. Ažuriraj .env Fajl
Zamijeni `DATABASE_URL` u `backend/.env` sa kopiranim connection string-om:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="lanci-loveverse-secret-key-2024-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

**VAŽNO**: Zamijeni `[YOUR-PASSWORD]` sa lozinkom koju si postavio pri kreiranju projekta!

### 5. Pokreni Migracije
```powershell
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed
```

## Alternativne Opcije

### Neon (Serverless PostgreSQL)
- https://neon.tech
- Također besplatan tier
- Brz setup

### Railway
- https://railway.app
- $5 besplatno kredita mjesečno
- Može hostovati i backend i frontend

## Troubleshooting

**Problem**: Connection refused
- **Rješenje**: Provjeri da li si zamijenio `[YOUR-PASSWORD]` u connection string-u

**Problem**: Database does not exist
- **Rješenje**: Supabase automatski kreira `postgres` bazu, koristi to ime

**Problem**: SSL required
- **Rješenje**: Dodaj `?sslmode=require` na kraj connection string-a

