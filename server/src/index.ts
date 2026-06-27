import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import shopRoutes from './routes/shops';
import reviewRoutes from './routes/reviews';
import pointsRoutes from './routes/points';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // required for httpOnly cookie to work cross-origin
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'chaispot-api' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/points', pointsRoutes);

// Global error handler (must be last)
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`ChaiSpot API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;
