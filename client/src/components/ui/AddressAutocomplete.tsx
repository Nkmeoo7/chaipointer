import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ────────────────────────────────────────────────────────────────────
export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when user picks a suggestion — gives the full result */
  onSelect?: (result: NominatimResult) => void;
  placeholder?: string;
  className?: string;
  /** If true, renders with smaller text (for the directions panel) */
  compact?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ChaiSpot/1.0 (internship-project)';

/** Map Nominatim class/type to a short readable badge */
function typeBadge(result: NominatimResult): string {
  const map: Record<string, string> = {
    amenity: '🏪',
    restaurant: '🍽',
    cafe: '☕',
    shop: '🛍',
    road: '🛣',
    residential: '🏘',
    city: '🏙',
    town: '🏡',
    village: '🌿',
    state: '📍',
    country: '🌍',
    university: '🎓',
    hospital: '🏥',
    park: '🌳',
    tourism: '🗺',
  };
  return map[result.type] ?? map[result.class] ?? '📌';
}

/** Build a shorter display label from address parts */
function shortLabel(result: NominatimResult): string {
  const a = result.address;
  const parts = [
    a.road,
    a.suburb,
    a.city ?? a.town ?? a.village,
    a.state,
    a.country,
  ].filter(Boolean);
  return parts.slice(0, 3).join(', ');
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder = 'Search for an address…',
  className = '',
  compact = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch suggestions (debounced 400 ms) ──────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${NOMINATIM}?` +
          new URLSearchParams({
            q,
            format: 'json',
            limit: '6',
            addressdetails: '1',
          }),
        { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce on every keystroke
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 400);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          pick(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // ── Pick a suggestion ─────────────────────────────────────────────────────
  const pick = (result: NominatimResult) => {
    onChange(result.display_name);
    onSelect?.(result);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className={`input pr-8 ${compact ? 'text-sm' : ''} ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {/* Spinner / clear icon */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
          ) : value ? (
            <button
              className="pointer-events-auto hover:text-white transition-colors"
              onMouseDown={e => { e.preventDefault(); onChange(''); setSuggestions([]); setOpen(false); }}
              tabIndex={-1}
              aria-label="Clear"
            >
              ×
            </button>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 glass-card p-1 max-h-60 overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {suggestions.map((s, i) => (
              <li
                key={s.place_id}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={e => { e.preventDefault(); pick(s); }}
                className={`
                  flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors
                  ${i === activeIndex ? 'bg-chai-800/40 border border-chai-700/30' : 'hover:bg-white/5'}
                `}
              >
                <span className="text-base mt-0.5 flex-shrink-0">{typeBadge(s)}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {shortLabel(s) || s.display_name.split(',')[0]}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {s.display_name}
                  </p>
                </div>
              </li>
            ))}
            <li className="px-3 py-1.5 text-[10px] text-zinc-600 border-t border-white/5 mt-1">
              Powered by © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:text-zinc-400">OpenStreetMap</a> / Nominatim
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
