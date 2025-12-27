# Railway Deploy Guide

## Priprema za Deploy

### 1. Environment Variables

#### Backend (.env)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PORT=3001
FRONTEND_URL="https://your-frontend-domain.railway.app"
NODE_ENV="production"
```

#### Frontend
Railway će automatski postaviti PORT varijablu.

### 2. Railway Setup

#### Opcija A: Odvojeni servisi (Preporučeno)

**Backend Service:**
1. Konektuj backend folder na Railway
2. Dodaj environment varijable iz gore
3. Railway će automatski detektovati `nixpacks.toml`
4. Build command: `npm run build`
5. Start command: `npm start`

**Frontend Service:**
1. Konektuj frontend folder na Railway
2. Build command: `npm run build`
3. Start command: `npm start` (koristi vite preview)
4. Postavi FRONTEND_URL u backend .env na frontend Railway URL

#### Opcija B: Monorepo (Backend servira frontend)

1. Konektuj root folder na Railway
2. Postavi root directory na `backend/`
3. U backend build procesu, buildaj i frontend:
   ```bash
   cd ../frontend && npm ci && npm run build
   ```
4. Backend će automatski servirati frontend build

### 3. Database Setup

1. Kreiramo PostgreSQL bazu na Railway
2. Kopiramo DATABASE_URL u backend environment variables
3. Pokrenemo migracije:
   ```bash
   npm run prisma:deploy
   ```
4. (Opciono) Seed podataka:
   ```bash
   npm run seed
   ```

### 4. Build Process

Railway će automatski:
1. Detektovati Node.js projekt
2. Koristiti `nixpacks.toml` za build konfiguraciju
3. Pokrenuti `npm ci` za instalaciju
4. Pokrenuti build komandu
5. Pokrenuti start komandu

### 5. Important Notes

- **Password Gate**: Šifra je `2908` (hardcoded u `PasswordGate.tsx`)
- **CORS**: Backend mora imati ispravan FRONTEND_URL u environment variables
- **Static Files**: Uploads folder se kreira automatski, ali za production možda treba persistent storage
- **Database**: Prisma migracije se pokreću automatski tokom build procesa

### 6. Troubleshooting

**Backend ne startuje:**
- Provjeri da li je DATABASE_URL postavljen
- Provjeri da li je JWT_SECRET postavljen
- Provjeri Railway logs za greške

**Frontend ne može da se konektuje na backend:**
- Provjeri FRONTEND_URL u backend .env
- Provjeri CORS konfiguraciju
- Provjeri da li su oba servisa pokrenuta

**Database connection errors:**
- Provjeri DATABASE_URL format
- Provjeri da li je baza kreirana na Railway
- Provjeri network access settings

