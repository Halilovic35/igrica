# Lanci LoveVerse 💖

A personal 2D love universe web game built for Lana (Lanci).

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT tokens

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env` and configure
   - Copy `frontend/.env.example` to `frontend/.env` and configure

3. Set up database:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed
```

4. Run development servers:
```bash
npm run dev
```

This will start:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

## Project Structure

```
├── backend/          # Express API server
├── frontend/         # React application
└── package.json      # Root workspace config
```

