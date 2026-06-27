import axios from 'axios';

// ─── Nominatim (OpenStreetMap) — Free, no API key required ─────────────────
// Usage policy: max 1 request/second, must include a descriptive User-Agent
// Docs: https://nominatim.org/release-docs/develop/api/Search/
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ChaiSpot/1.0 (internship-project)';

// ─── OSRM (Open Source Routing Machine) — Free public demo server ──────────
// Docs: https://project-osrm.org/docs/v5.5.1/api/
const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Geocodes a human-readable address into [longitude, latitude] using Nominatim.
 * Throws descriptive errors for bad addresses or API failures.
 * No API key required — completely free.
 */
export async function geocodeAddress(address: string): Promise<[number, number]> {
  let response;
  try {
    response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 0,
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      timeout: 8000,
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      throw Object.assign(
        new Error('Geocoding service timed out. Try again later.'),
        { status: 502 }
      );
    }
    throw Object.assign(
      new Error('Failed to reach the geocoding service (Nominatim/OSM).'),
      { status: 502 }
    );
  }

  const results = response.data;
  if (!results || results.length === 0) {
    throw Object.assign(
      new Error(
        'Address not found. Try a more specific address (include city or country).'
      ),
      { status: 422 }
    );
  }

  // Nominatim returns lat/lon as strings
  const lat = parseFloat(results[0].lat);
  const lon = parseFloat(results[0].lon);
  return [lon, lat]; // GeoJSON order: [longitude, latitude]
}

/**
 * Fetches a driving route between two coordinate pairs using OSRM.
 * Returns a GeoJSON LineString geometry for drawing on the map.
 * No API key required — completely free.
 */
export async function getDirections(
  startCoords: [number, number],
  endCoords: [number, number]
): Promise<object> {
  // OSRM expects coordinates as "lng,lat;lng,lat"
  const coordinates = `${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coordinates}`;

  let response;
  try {
    response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: false,
      },
      timeout: 8000,
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
      throw Object.assign(
        new Error('Routing service timed out. Try again later.'),
        { status: 502 }
      );
    }
    throw Object.assign(
      new Error('Failed to reach the routing service (OSRM).'),
      { status: 502 }
    );
  }

  if (response.data?.code !== 'Ok' || !response.data?.routes?.length) {
    throw Object.assign(
      new Error('No driving route found between these two points.'),
      { status: 404 }
    );
  }

  return response.data.routes[0].geometry;
}
