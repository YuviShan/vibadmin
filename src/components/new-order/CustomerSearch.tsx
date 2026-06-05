import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { searchPartners } from '../../api/endpoints';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Partner } from '../../types/api';

interface CustomerSearchProps {
  location: string;
  value: Partner | null;
  onSelect: (partner: Partner | null) => void;
  disabled?: boolean;
}

export function CustomerSearch({ location, value, onSelect, disabled }: CustomerSearchProps) {
  const [query, setQuery] = useState(value ? `${value.code} — ${value.name}` : '');
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 300);
  const wrapRef = useRef<HTMLDivElement>(null);

  const canSearch = debounced.trim().length >= 2 && !disabled && location && location !== '—';
  const searchQuery = useQuery({
    queryKey: ['partner-search', debounced, location],
    queryFn: async () => {
      const q = debounced.trim();
      if (location && location !== '—') {
        const filtered = await searchPartners(q, location);
        if (filtered.length > 0) return filtered;
      }
      return searchPartners(q);
    },
    enabled: canSearch && !value,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(partner: Partner) {
    onSelect(partner);
    setQuery(`${partner.code} — ${partner.name}`);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQuery('');
    setOpen(true);
  }

  return (
    <div className="search-field" ref={wrapRef}>
      <label className="form-field">
        <span>Customer</span>
        <div className="search-input-wrap">
          <input
            type="text"
            placeholder="Type 2+ characters to search…"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              if (value) onSelect(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {value && (
            <button type="button" className="btn-icon sm" onClick={clear} aria-label="Clear">
              ×
            </button>
          )}
        </div>
      </label>
      {open && canSearch && !value && (
        <ul className="search-dropdown">
          {searchQuery.isLoading && <li className="search-hint">Searching…</li>}
          {searchQuery.data?.length === 0 && !searchQuery.isLoading && (
            <li className="search-hint">No customers found</li>
          )}
          {searchQuery.data?.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p)}>
                <strong>{p.code}</strong>
                <span>{p.name}</span>
                {p.city && <small>{p.city}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length > 0 && query.length < 2 && !value && (
        <p className="field-hint">Enter at least 2 characters</p>
      )}
    </div>
  );
}
