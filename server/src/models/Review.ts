import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  shop: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    shop: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Compound unique index: the authoritative guard against duplicate reviews.
// This enforces the constraint at the DB level, not just in application code.
ReviewSchema.index({ shop: 1, user: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
