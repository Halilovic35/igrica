import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import avatarRoutes from './routes/avatar';
import statsRoutes from './routes/stats';
import levelsRoutes from './routes/levels';
import shopRoutes from './routes/shop';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/shop', shopRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lanci LoveVerse API is running' });
});

// Serve frontend static files in production (if frontend is built in monorepo)
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    // Handle React Router - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
        if (err) {
          next(err);
        }
      });
    });
  }
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`💖 Lanci LoveVerse API server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
}).on('error', (err: any) => {
  console.error('Failed to start server:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or change the PORT in .env`);
  }
});

