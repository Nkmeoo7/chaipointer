import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Shop } from '../../types';
import { getDirections } from '../../api';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

interface MapViewProps {
  shops: Shop[];
  onShopClick: (shop: Shop) => void;
  selectedShop: Shop | null;
  onDrawRoute?: (fn: (shopId: string, start: { lng?: number; lat?: number; address?: string }) => void) => void;
}


export default function MapView({ shops, onShopClick, selectedShop, onDrawRoute }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);


  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [77.209, 28.6139], // Default: New Delhi
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers when shops change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    shops.forEach(shop => {
      const el = document.createElement('div');
      el.className = 'shop-marker';
      el.innerHTML = `
        <div style="
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,#e2a53a,#b86d14);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 20px rgba(226,165,58,0.5);
          cursor:pointer;
          border:2px solid rgba(255,255,255,0.2);
          font-size:16px;
          transition:transform 0.2s;
        ">☕</div>
      `;
      el.addEventListener('mouseenter', () => {
        (el.firstElementChild as HTMLElement).style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        (el.firstElementChild as HTMLElement).style.transform = 'scale(1)';
      });
      el.addEventListener('click', () => onShopClick(shop));

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(shop.location.coordinates)
        .addTo(map.current!);

      markersRef.current.set(shop._id, marker);
    });
  }, [shops, onShopClick]);

  // Fly to selected shop
  useEffect(() => {
    if (!map.current || !selectedShop) return;
    map.current.flyTo({
      center: selectedShop.location.coordinates,
      zoom: 14,
      duration: 1000,
    });
  }, [selectedShop]);

  const drawRoute = useCallback(async (
    shopId: string,
    start: { lng?: number; lat?: number; address?: string }
  ) => {
    if (!map.current) return;
    setLoadingRoute(true);
    setRouteError(null);

    try {
      const res = await getDirections(shopId, start);
      const geometry = res.data.geometry;

      // Remove existing route layer
      if (map.current.getLayer('route')) map.current.removeLayer('route');
      if (map.current.getSource('route')) map.current.removeSource('route');

      map.current.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry, properties: {} },
      });
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#e2a53a',
          'line-width': 4,
          'line-opacity': 0.85,
        },
      });

      // Fit map to route bounds
      const coords: [number, number][] = geometry.coordinates;
      const bounds = coords.reduce(
        (b, c) => b.extend(c as mapboxgl.LngLatLike),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setRouteError(error.response?.data?.message || 'Could not get directions.');
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  // Register drawRoute with parent so it can be called imperatively
  useEffect(() => {
    if (onDrawRoute) onDrawRoute(drawRoute);
  }, [onDrawRoute, drawRoute]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {loadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-chai-300 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-chai-400 border-t-transparent rounded-full animate-spin" />
          Getting directions…
        </div>
      )}

      {routeError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-red-400 max-w-xs text-center">
          {routeError}
          <button onClick={() => setRouteError(null)} className="ml-2 text-zinc-500 hover:text-white">×</button>
        </div>
      )}


    </div>
  );
}

// Re-export for parent to call
export type { MapViewProps };
