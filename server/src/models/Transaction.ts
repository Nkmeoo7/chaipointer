import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'earn' | 'redeem';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: TransactionType;
  points: number;
  reason: string;
  couponCode?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // 'earn' for reviews, 'redeem' for coupon generation
    type: { type: String, enum: ['earn', 'redeem'], required: true },
    points: { type: Number, required: true },
    reason: { type: String, required: true },
    // Only populated for 'redeem' transactions
    couponCode: { type: String },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
