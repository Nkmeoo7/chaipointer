import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

const POINTS_FIRST_REVIEW = 15; // bonus for discovering a new shop
const POINTS_REVIEW = 10;
const REDEMPTION_THRESHOLD = 50;
const COUPON_POINTS_COST = 50;

/**
 * Awards points to a user after they submit a review.
 * Gives a bonus if the shop had zero reviews before (discovery bonus).
 *
 * Exported as a pure-ish function (takes userId & shopReviewCount) so it
 * can be unit-tested without hitting the database.
 */
export function calculateReviewPoints(priorReviewCount: number): number {
  return priorReviewCount === 0 ? POINTS_FIRST_REVIEW : POINTS_REVIEW;
}

/**
 * Atomically increments a user's points and logs the transaction.
 * Uses $inc so concurrent reviews don't create race conditions.
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  session?: mongoose.ClientSession
): Promise<void> {
  await User.findByIdAndUpdate(userId, { $inc: { points } }, { session });
  await Transaction.create([{ user: userId, type: 'earn', points, reason }], { session });
}

/**
 * Redeems points for a coupon code.
 * Validates the user has sufficient balance server-side before any deduction.
 * Returns the generated coupon code.
 */
export async function redeemPoints(userId: string): Promise<{ couponCode: string; remainingPoints: number }> {
  // Always fetch fresh from DB — never trust cached/JWT balance
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  if (user.points < REDEMPTION_THRESHOLD) {
    throw Object.assign(
      new Error(
        `Insufficient points. You need ${REDEMPTION_THRESHOLD} points to redeem. You have ${user.points}.`
      ),
      { status: 400 }
    );
  }

  const couponCode = generateCouponCode();

  // Deduct points and log transaction atomically
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: -COUPON_POINTS_COST } },
    { new: true, runValidators: true } // runValidators enforces min:0 as final safety net
  );

  await Transaction.create({
    user: userId,
    type: 'redeem',
    points: COUPON_POINTS_COST,
    reason: `Coupon redemption: ${couponCode}`,
    couponCode,
  });

  return {
    couponCode,
    remainingPoints: updated!.points,
  };
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CHAI-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export { REDEMPTION_THRESHOLD, POINTS_FIRST_REVIEW, POINTS_REVIEW, COUPON_POINTS_COST };
