import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  start: { lng?: number; lat?: number; address?: string },
  end?: { lng: number; lat: number }
) => api.get(`/shops/${shopId}/directions`, { 
  params: { 
    startLng: start.lng, 
    startLat: start.lat, 
    startAddress: start.address, 
    endLng: end?.lng, 
    endLat: end?.lat 
  } 
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

// OSM Overpass
import { Shop } from '../types';

export const fetchOSMShops = async (lat: number, lng: number, radius = 3000): Promise<Shop[]> => {
  const query = `[out:json][timeout:10];
(
  node["amenity"="cafe"](around:${radius},${lat},${lng});
  node["vending"="coffee"](around:${radius},${lat},${lng});
);
out center;`;

  try {
    const res = await axios.get('https://overpass-api.de/api/interpreter', {
      params: { data: query }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (res.data.elements || []).slice(0, 30).map((el: any) => ({
      _id: `osm-${el.id}`,
      name: el.tags?.name || 'Unnamed Cafe/Tea Stall',
      address: [
        el.tags?.['addr:street'],
        el.tags?.['addr:city'],
      ].filter(Boolean).join(', ') || 'Unknown Address',
      description: 'Discovered from OpenStreetMap. Claim it to add details and reviews!',
      location: {
        type: 'Point',
        coordinates: [el.lon, el.lat],
      },
      averageRating: 0,
      reviewCount: 0,
      createdBy: 'osm',
      createdAt: new Date().toISOString(),
      isExternal: true,
    }));
  } catch (err) {
    console.error('Failed to fetch OSM shops', err);
    return [];
  }
};

export default api;
