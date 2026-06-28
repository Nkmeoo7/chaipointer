import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });

    const token = signToken(user.id);
    setTokenCookie(res, token);

    res.status(201).json({
      user: { id: user.id, email: user.email, points: user.points },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user.id);
    setTokenCookie(res, token);

    res.json({ user: { id: user.id, email: user.email, points: user.points } });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me — restore session from cookie
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.default.verify(token, secret) as { userId: string };
    const { User } = await import('../models/User');
    const user = await User.findById(decoded.userId).select('email points');
    if (!user) {
      res.status(401).json({ message: 'User not found.' });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, points: user.points } });
  } catch {
    res.status(401).json({ message: 'Invalid session.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out.' });
});

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId }, secret, { expiresIn } as jwt.SignOptions);
}

function setTokenCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export default router;
