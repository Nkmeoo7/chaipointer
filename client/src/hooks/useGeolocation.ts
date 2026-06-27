import { useState, useEffect, useRef } from 'react';

export interface GeolocationState {
  /** Current position — null while loading or on error */
  position: GeolocationCoordinates | null;
  /** True during the first position fetch */
  loading: boolean;
  /** Human-readable error string, or null if all is well */
  error: string | null;
  /** Manually trigger a fresh GPS read */
  refresh: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 30_000, // accept a cached position up to 30 s old
};

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const start = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // watchPosition keeps us updated as the user moves
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos.coords);
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Use manual address instead.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Use manual address instead.');
            break;
          case err.TIMEOUT:
            setError('Location timed out. Use manual address instead.');
            break;
          default:
            setError('Could not get your location.');
        }
        setLoading(false);
      },
      GEO_OPTIONS
    );
  };

  useEffect(() => {
    start();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { position, loading, error, refresh: start };
}
