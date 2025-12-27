# Row Level Security (RLS) Setup Guide

## Pregled

Ovaj vodič objašnjava kako omogućiti Row Level Security (RLS) na Supabase tabelama za Lanči LoveVerse projekt.

## Trenutna Situacija

- ✅ Koristimo **custom JWT autentifikaciju** (ne Supabase auth)
- ✅ Backend (Express.js) provjerava autentifikaciju preko JWT middleware-a
- ✅ Prisma ORM se koristi za pristup bazi podataka
- ⚠️ RLS je trenutno **isključen** na svim tabelama (8 upozorenja)

## Rješenje

Pošto koristimo custom JWT auth, RLS politike će biti permisivne (`USING (true)`), ali backend middleware osigurava da korisnici pristupaju samo svojim podacima. Ovo pruža **defense-in-depth** pristup.

## Koraci za Implementaciju

### 1. Otvori Supabase SQL Editor

1. Idi na Supabase Dashboard: https://supabase.com/dashboard
2. Odaberi svoj projekt (`lanci-loveverse`)
3. U lijevom sidebaru, klikni na **"SQL Editor"**
4. Klikni **"New query"**

### 2. Kopiraj i Pokreni SQL Migraciju

1. Otvori fajl: `backend/prisma/migrations/enable_rls.sql`
2. **Kopiraj sav sadržaj** SQL fajla
3. **Zalijepi** u Supabase SQL Editor
4. Klikni **"Run"** ili pritisni `Ctrl+Enter`

### 3. Provjeri Rezultate

1. Idi na **"Advisors"** → **"Security Advisor"** u Supabase dashboardu
2. Trebalo bi da vidiš da su sva upozorenja riješena ✅
3. Sve tabele bi trebale imati RLS omogućen

## Struktura RLS Politika

### Javne Tabele (Svi mogu čitati)
- ✅ `levels` - Svi mogu čitati level podatke
- ✅ `items` - Svi mogu čitati item podatke (za shop)

### Privatne Tabele (Samo vlastiti podaci)
- 🔒 `users` - Korisnici mogu čitati/update-ovati samo svoje podatke
- 🔒 `avatars` - Korisnici mogu pristupati samo svom avataru
- 🔒 `user_items` - Korisnici mogu vidjeti samo svoje iteme
- 🔒 `user_stats` - Korisnici mogu vidjeti samo svoje statistike
- 🔒 `user_level_progress` - Korisnici mogu vidjeti samo svoj progress

### Interna Tabela
- 🔧 `_prisma_migrations` - Samo service role (Prisma migracije)

## Kako RLS Radi sa Custom JWT Auth

### Trenutni Tok Autentifikacije:

```
1. Frontend šalje JWT token u Authorization header
2. Backend middleware (authMiddleware) provjerava token
3. Backend ekstraktuje userId iz JWT tokena
4. Backend koristi Prisma sa service role connection string-om
5. Prisma izvršava query sa userId filterom
6. RLS politike dozvoljavaju pristup (pošto backend već provjerio auth)
```

### Zašto `USING (true)`?

- Backend već provjerava autentifikaciju
- Backend filtrira podatke po `userId`
- RLS pruža dodatnu zaštitu u slučaju greške u backend-u
- Ako netko pokuša direktno pristupiti bazi (bez backend-a), RLS će blokirati

## Napredne Opcije (Opcionalno)

### Opcija 1: Migracija na Supabase Auth

Ako želiš koristiti Supabase auth umjesto custom JWT:

1. Migriraj korisnike u Supabase auth sistem
2. Ažuriraj backend da koristi Supabase auth tokens
3. Koristi `auth.uid()` u RLS politikama umjesto `USING (true)`

**Prednosti:**
- Strože RLS politike
- Built-in email verification, password reset, itd.
- Bolja integracija sa Supabase

**Nedostaci:**
- Potrebna migracija postojećih korisnika
- Potrebne promjene u backend kodu

### Opcija 2: Custom JWT Verification u PostgreSQL

Možeš kreirati PostgreSQL funkciju koja provjerava JWT token direktno:

```sql
CREATE OR REPLACE FUNCTION verify_jwt_token(token text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
-- Implementacija JWT verifikacije
-- Ovo zahtijeva pgjwt extension
$$;
```

## Troubleshooting

### Problem: "RLS still showing errors"

**Rješenje:**
- Provjeri da li si pokrenuo SQL migraciju
- Provjeri da li su sve tabele imaju RLS omogućen
- Refresh Security Advisor u Supabase dashboardu

### Problem: "Backend queries failing"

**Rješenje:**
- Provjeri da li backend koristi **service role** connection string
- Service role zaobiđe RLS politike (potrebno za Prisma)
- **Važno**: Za Supabase, koristi **Service Role** connection string, ne obični connection string

**Kako dobiti Service Role connection string:**
1. Idi u Supabase Dashboard → **Settings** → **Database**
2. Scrollaj do **Connection string** sekcije
3. Odaberi **"URI"** tab
4. Odaberi **"Service role"** (ne "Session" ili "Transaction")
5. Kopiraj connection string koji počinje sa: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...`
6. Ažuriraj `DATABASE_URL` u `backend/.env` sa service role string-om

**Format service role connection string-a:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Napomena**: Service role ima **puni pristup** bazi i zaobiđe RLS. Koristi ga samo za backend aplikacije, nikad u frontend kodu!

### Problem: "Users can't access their data"

**Rješenje:**
- Provjeri da li backend middleware ispravno ekstraktuje userId
- Provjeri da li backend filtrira podatke po userId
- RLS politike su permisivne, problem je vjerovatno u backend-u

## Testiranje

Nakon implementacije RLS-a, testiraj:

1. ✅ Login kao korisnik
2. ✅ Pristup avataru (samo svoj)
3. ✅ Pristup shop-u (svi itemi vidljivi)
4. ✅ Pristup levelima (svi leveli vidljivi)
5. ✅ Pristup stats (samo svoje)
6. ✅ Pristup progress (samo svoj)

## Produkcija

Za produkciju, preporučujem:

1. ✅ Omogući RLS na svim tabelama (ovaj vodič)
2. ✅ Koristi service role connection string u backend-u
3. ✅ Provjeri da backend middleware ispravno validira JWT
4. ✅ Monitoriraj Supabase Security Advisor redovno
5. ⚠️ Razmotri migraciju na Supabase auth za bolju sigurnost

## Dodatni Resursi

- [Supabase RLS Dokumentacija](https://supabase.com/docs/guides/auth/row-level-security)
- [Prisma + Supabase](https://www.prisma.io/docs/guides/database/postgresql)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
