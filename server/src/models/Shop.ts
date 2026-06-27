import mongoose, { Document, Schema } from 'mongoose';

export interface IShop extends Document {
  name: string;
  address: string;
  description: string;
  photoUrl?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  averageRating: number;
  reviewCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    photoUrl: { type: String },
    // GeoJSON Point — enables $near queries for future proximity search
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    // Denormalized for performance: avoids aggregation on every map load
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ShopSchema.index({ location: '2dsphere' });

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
