import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { redeemPoints, REDEMPTION_THRESHOLD } from '../services/points';

const router = Router();

// GET /api/points/balance — get current user's balance and history
router.get('/balance', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('points email');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const transactions = await Transaction.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      points: user.points,
      redemptionThreshold: REDEMPTION_THRESHOLD,
      canRedeem: user.points >= REDEMPTION_THRESHOLD,
      transactions,
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch balance.' });
  }
});

// POST /api/points/redeem — redeem points for a coupon code
router.post('/redeem', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await redeemPoints(req.userId!);
    res.json({
      message: `Coupon generated! Use "${result.couponCode}" at a participating chai shop.`,
      couponCode: result.couponCode,
      remainingPoints: result.remainingPoints,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status ?? 500;
    res.status(status).json({ message: error.message || 'Redemption failed.' });
  }
});

export default router;
