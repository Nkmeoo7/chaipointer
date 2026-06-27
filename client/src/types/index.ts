export interface Shop {
  _id: string;
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
  createdBy: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  shop: string;
  user: { _id: string; email: string };
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  points: number;
}

export interface Transaction {
  _id: string;
  type: 'earn' | 'redeem';
  points: number;
  reason: string;
  couponCode?: string;
  createdAt: string;
}
