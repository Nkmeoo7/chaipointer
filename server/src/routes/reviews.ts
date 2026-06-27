import { Router, Request, Response } from 'express';
import { Review } from '../models/Review';
import { Shop } from '../models/Shop';
import { protect, AuthRequest } from '../middleware/auth';
import { calculateReviewPoints, awardPoints } from '../services/points';

const router = Router();

// GET /api/reviews?shopId=... — get all reviews for a shop
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopId } = req.query;
    if (!shopId) {
      res.status(400).json({ message: 'shopId query parameter is required.' });
      return;
    }

    const reviews = await Review.find({ shop: shopId })
      .populate('user', 'email')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch {
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews — submit a review (earn points)
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { shopId, rating, text } = req.body;

    if (!shopId || !rating || !text) {
      res.status(400).json({ message: 'shopId, rating, and text are required.' });
      return;
    }

    const parsedRating = parseInt(String(rating), 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      return;
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      res.status(404).json({ message: 'Shop not found.' });
      return;
    }

    // Check for existing review BEFORE creating — but the compound unique index
    // is the true enforcement layer at the DB level
    const existing = await Review.findOne({ shop: shopId, user: req.userId });
    if (existing) {
      res.status(409).json({
        message: 'You have already reviewed this shop. You can edit your existing review.',
        existingReviewId: existing._id,
      });
      return;
    }

    // Capture review count BEFORE creating the new review (determines point bonus)
    const priorReviewCount = shop.reviewCount;
    const pointsEarned = calculateReviewPoints(priorReviewCount);

    const review = await Review.create({
      shop: shopId,
      user: req.userId,
      rating: parsedRating,
      text,
    });

    // Update shop average rating and review count atomically
    const newCount = priorReviewCount + 1;
    const newAverage =
      (shop.averageRating * priorReviewCount + parsedRating) / newCount;

    await Shop.findByIdAndUpdate(shopId, {
      averageRating: Math.round(newAverage * 10) / 10,
      reviewCount: newCount,
    });

    // Award points and log transaction
    await awardPoints(
      req.userId!,
      pointsEarned,
      `Review for "${shop.name}"${priorReviewCount === 0 ? ' (first review bonus!)' : ''}`
    );

    res.status(201).json({
      review,
      pointsEarned,
      message:
        priorReviewCount === 0
          ? `🎉 First review bonus! You earned ${pointsEarned} points.`
          : `You earned ${pointsEarned} points for your review.`,
    });
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    // MongoDB duplicate key error (code 11000) from the compound unique index
    if (error.code === 11000) {
      res.status(409).json({ message: 'You have already reviewed this shop.' });
      return;
    }
    res.status(500).json({ message: 'Failed to submit review.' });
  }
});

// PUT /api/reviews/:id — edit an existing review
router.put('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, text } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      res.status(404).json({ message: 'Review not found.' });
      return;
    }

    // Only the original author can edit
    if (review.user.toString() !== req.userId) {
      res.status(403).json({ message: 'You can only edit your own reviews.' });
      return;
    }

    const oldRating = review.rating;
    const parsedRating = rating ? parseInt(String(rating), 10) : oldRating;

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5.' });
      return;
    }

    review.rating = parsedRating;
    if (text) review.text = text;
    await review.save();

    // Recalculate shop average rating
    const shop = await Shop.findById(review.shop);
    if (shop && shop.reviewCount > 0) {
      const newAverage =
        (shop.averageRating * shop.reviewCount - oldRating + parsedRating) /
        shop.reviewCount;
      await Shop.findByIdAndUpdate(review.shop, {
        averageRating: Math.round(newAverage * 10) / 10,
      });
    }

    res.json({ review, message: 'Review updated.' });
  } catch {
    res.status(500).json({ message: 'Failed to update review.' });
  }
});

export default router;
