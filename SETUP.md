# Setup Instructions for Lanci LoveVerse

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies

From the root directory:
```bash
npm run install:all
```

This installs dependencies for both frontend and backend.

### 2. Configure Environment Variables

#### Backend (.env)
Copy `backend/.env.example` to `backend/.env` and update:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lanci_loveverse?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

Make sure to:
- Replace `user`, `password`, `localhost`, `5432` with your PostgreSQL credentials
- Create a database named `lanci_loveverse` in PostgreSQL
- Set a strong JWT_SECRET for production

#### Frontend (.env)
Copy `frontend/.env.example` to `frontend/.env` (optional, defaults work for dev)

### 3. Set Up Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed
```

The seed script creates:
- 3 levels (Candy Hearts, Spasi me, Running Heart)
- 9 shop items (outfits, effects, emotes)

### 4. Start Development Servers

From the root directory:
```bash
npm run dev
```

This starts both servers:
- **Backend API**: http://localhost:3001
- **Frontend App**: http://localhost:5173

Or run separately:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. First Time Setup

1. Open http://localhost:5173
2. Enter name (will auto-fill "Lanci" on focus with special message)
3. Register with email and password
4. Create your avatar (upload photo, choose body color)
5. Start playing on the Love Map!

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Verify DATABASE_URL in backend/.env is correct
- Check that the database `lanci_loveverse` exists

### Port Already in Use
- Change PORT in backend/.env or frontend/.env.example
- Kill processes using ports 3001 or 5173

### Upload Issues
- Ensure `backend/uploads/avatars` directory exists (created automatically)
- Check file permissions

## Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
cd backend
npm start
```

Frontend build output will be in `frontend/dist/` - serve it with a static file server or configure backend to serve it.

