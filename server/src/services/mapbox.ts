import axios from 'axios';

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN;
const MAPBOX_BASE = 'https://api.mapbox.com';

if (!MAPBOX_TOKEN) {
  console.warn('[Mapbox] MAPBOX_SECRET_TOKEN is not set. Mapbox features will fail.');
}

/**
 * Geocodes a human-readable address into [longitude, latitude] coordinates.
 * Throws descriptive errors for bad addresses or API failures.
 * Token is used server-side only — never exposed to the client.
 */
export async function geocodeAddress(address: string): Promise<[number, number]> {
  const encoded = encodeURIComponent(address);
  const url = `${MAPBOX_BASE}/geocoding/v5/mapbox.places/${encoded}.json`;

  let response;
  try {
    response = await axios.get(url, {
      params: {
        access_token: MAPBOX_TOKEN,
        limit: 1,
        types: 'address,place,poi',
      },
      timeout: 8000,
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      throw Object.assign(new Error('Mapbox Geocoding API timed out. Try again later.'), {
        status: 502,
      });
    }
    throw Object.assign(new Error('Failed to reach Mapbox Geocoding API.'), { status: 502 });
  }

  const features = response.data?.features;
  if (!features || features.length === 0) {
    throw Object.assign(
      new Error(
        'Address not found. Try a more specific address (include city or country).'
      ),
      { status: 422 }
    );
  }

  const [lng, lat] = features[0].geometry.coordinates as [number, number];
  return [lng, lat];
}

/**
 * Fetches a driving route between two coordinate pairs from the Mapbox Directions API.
 * Returns the GeoJSON geometry of the first route, or throws if no route is found.
 */
export async function getDirections(
  startCoords: [number, number],
  endCoords: [number, number]
): Promise<object> {
  const coordinates = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
  const url = `${MAPBOX_BASE}/directions/v5/mapbox/driving/${coordinates}`;

  let response;
  try {
    response = await axios.get(url, {
      params: {
        access_token: MAPBOX_TOKEN,
        geometries: 'geojson',
        overview: 'full',
        steps: false,
      },
      timeout: 8000,
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      throw Object.assign(new Error('Mapbox Directions API timed out. Try again later.'), {
        status: 502,
      });
    }
    throw Object.assign(new Error('Failed to reach Mapbox Directions API.'), { status: 502 });
  }

  const routes = response.data?.routes;
  if (!routes || routes.length === 0) {
    throw Object.assign(
      new Error('No driving route found between these two points.'),
      { status: 404 }
    );
  }

  return routes[0].geometry;
}
