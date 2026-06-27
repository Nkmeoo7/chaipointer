import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly cookies cross-origin
});

// Auth
export const signup = (email: string, password: string) =>
  api.post('/auth/signup', { email, password });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const logout = () => api.post('/auth/logout');

// Shops
export const getShops = (params?: {
  name?: string;
  minRating?: number;
  lat?: number;
  lng?: number;
  radius?: number;
}) => api.get('/shops', { params });


export const getShop = (id: string) => api.get(`/shops/${id}`);

export const createShop = (data: {
  name: string;
  address: string;
  description: string;
  photoUrl?: string;
}) => api.post('/shops', data);

export const getDirections = (
  shopId: string,
  start: { lng?: number; lat?: number; address?: string }
) =>
  api.get(`/shops/${shopId}/directions`, {
    params: start.address
      ? { startAddress: start.address }
      : { startLng: start.lng, startLat: start.lat },
  });

// Reviews
export const getReviews = (shopId: string) =>
  api.get('/reviews', { params: { shopId } });

export const createReview = (data: { shopId: string; rating: number; text: string }) =>
  api.post('/reviews', data);

export const updateReview = (id: string, data: { rating?: number; text?: string }) =>
  api.put(`/reviews/${id}`, data);

// Points
export const getBalance = () => api.get('/points/balance');
export const redeemPoints = () => api.post('/points/redeem');

export default api;
