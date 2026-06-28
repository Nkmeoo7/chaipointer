import { Router, Request, Response } from 'express';
import { Shop } from '../models/Shop';
import { geocodeAddress, getDirections } from '../services/mapbox';
import axios from 'axios';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/shops — list all shops, with optional search/filter/proximity
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, minRating, lat, lng, radius } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (name) {
      query.name = { $regex: name as string, $options: 'i' };
    }
    if (minRating) {
      const rating = parseFloat(minRating as string);
      if (!isNaN(rating)) query.averageRating = { $gte: rating };
    }

    // Proximity search — if lat & lng provided, use $near with 2dsphere index
    // radius defaults to 5 km (5000 m)
    if (lat && lng) {
      const radiusM = radius ? parseFloat(radius as string) : 5000;
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng as string), parseFloat(lat as string)] },
          $maxDistance: radiusM,
        },
      };
    }

    // $near already sorts by distance; without it sort by newest
    const shops = await Shop.find(query).select('-__v').sort(lat && lng ? {} : { createdAt: -1 });
    res.json({ shops });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shops.' });
  }
});


// POST /api/shops — create a new shop (geocodes address server-side)
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, address, description, photoUrl } = req.body;

    if (!name || !address) {
      res.status(400).json({ message: 'Name and address are required.' });
      return;
    }

    // Geocoding happens server-side; the Mapbox token is never sent to the client
    const [lng, lat] = await geocodeAddress(address);

    const shop = await Shop.create({
      name,
      address,
      description: description || '',
      photoUrl,
      location: { type: 'Point', coordinates: [lng, lat] },
      createdBy: req.userId,
    });

    res.status(201).json({ shop });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status ?? 500;
    res.status(status).json({ message: error.message || 'Failed to create shop.' });
  }
});

// POST /api/shops/osm — Proxy for Overpass API to bypass adblockers
router.post('/osm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius } = req.body;
    if (!lat || !lng || !radius) {
      res.status(400).json({ message: 'lat, lng, and radius are required.' });
      return;
    }
    
    const query = `[out:json][timeout:10];(node["amenity"="cafe"](around:${radius},${lat},${lng});node["vending"="coffee"](around:${radius},${lat},${lng}););out center;`;
    
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    res.json({ elements: response.data.elements || [] });
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: string }; message?: string };
    console.error('OSM Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch from OSM API' });
  }
});

// GET /api/shops/:id — get single shop
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await Shop.findById(req.params.id).select('-__v');
    if (!shop) {
      res.status(404).json({ message: 'Shop not found.' });
      return;
    }
    res.json({ shop });
  } catch {
    res.status(500).json({ message: 'Failed to fetch shop.' });
  }
});

// GET /api/shops/:id/directions — proxy Directions API (keeps token server-side)
router.get('/:id/directions', async (req: Request, res: Response): Promise<void> => {
  try {
    const shopId = req.params.id;
    const { startLng, startLat, startAddress, endLng, endLat } = req.query;

    let endCoords: [number, number];
    let shopName = 'Destination';

    if (shopId.startsWith('osm-')) {
      if (!endLng || !endLat) {
        res.status(400).json({ message: 'External OSM shops require endLng and endLat in query.' });
        return;
      }
      endCoords = [parseFloat(endLng as string), parseFloat(endLat as string)];
    } else {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        res.status(404).json({ message: 'Shop not found.' });
        return;
      }
      endCoords = [
        shop.location.coordinates[0],
        shop.location.coordinates[1],
      ];
      shopName = shop.name;
    }

    let startCoords: [number, number];

    if (startLng && startLat) {
      // Browser geolocation provided coordinates
      startCoords = [parseFloat(startLng as string), parseFloat(startLat as string)];
    } else if (startAddress) {
      // Manual address fallback: geocode the start address too
      startCoords = await geocodeAddress(startAddress as string);
    } else {
      res
        .status(400)
        .json({ message: 'Provide either startLng+startLat or startAddress.' });
      return;
    }

    const geometry = await getDirections(startCoords, endCoords);
    res.json({ geometry, shopName });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    const status = error.status ?? 500;
    res.status(status).json({ message: error.message || 'Failed to get directions.' });
  }
});

export default router;
