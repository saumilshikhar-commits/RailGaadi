import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/utils';
import { useTrainSearch } from '../../hooks/useTrainQueries';
import type { Train } from '../../types';
import { addRecentSearch } from '../../services/localStorage';
import './TrainSearch.css';

interface TrainSearchProps {
  autoFocus?: boolean;
  onSelect?: (train: Train) => void;
}

export function TrainSearch({ autoFocus, onSelect }: TrainSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 250);
  const { data: results, isLoading, isError } = useTrainSearch(debouncedQuery);

  // Open dropdown when we have input
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) setOpen(true);
    else setOpen(false);
    setActiveIndex(-1);
  }, [debouncedQuery]);

  // Auto focus
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((train: Train) => {
    addRecentSearch({
      trainId: train.id,
      trainNumber: train.number,
      trainName: train.name,
    });
    setOpen(false);
    setQuery('');
    if (onSelect) {
      onSelect(train);
    } else {
      navigate(`/live/${train.id}`);
    }
  }, [navigate, onSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = query.trim();
      if (activeIndex >= 0 && results?.[activeIndex]) {
        handleSelect(results[activeIndex]);
      } else if (results && results.length > 0) {
        handleSelect(results[0]);
      } else if (trimmed) {
        // Direct train number / name ENTER search
        addRecentSearch({
          trainId: trimmed,
          trainNumber: trimmed,
          trainName: `Train ${trimmed}`,
        });
        setOpen(false);
        setQuery('');
        if (onSelect) {
          onSelect({ id: trimmed, number: trimmed, name: `Train ${trimmed}`, provider: 'railradar' });
        } else {
          navigate(`/live/${trimmed}`);
        }
      }
      return;
    }

    if (!open || !results?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }, [open, results, activeIndex, query, handleSelect, navigate, onSelect]);

  const showDropdown = open && debouncedQuery.length >= 2;
  const showLoading = isLoading && debouncedQuery.length >= 2;
  const showNoResults = !isLoading && !isError && results?.length === 0 && debouncedQuery.length >= 2;
  const showError = isError && debouncedQuery.length >= 2;

  return (
    <div
      ref={containerRef}
      className="train-search"
      role="combobox"
      aria-expanded={showDropdown}
      aria-haspopup="listbox"
    >
      <div className={`train-search-field ${open ? 'focused' : ''}`}>
        <span className="train-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          id="train-search-input"
          type="text"
          role="searchbox"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search train number or name (e.g. 12951, Rajdhani)"
          aria-label="Search for a train by number or name"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (debouncedQuery.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="train-search-input"
        />
        {showLoading && (
          <span className="train-search-spinner" aria-label="Searching...">
            <span className="spinner" />
          </span>
        )}
        {query && (
          <button
            className="train-search-clear"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <kbd className="train-search-kbd">⌘K</kbd>
      </div>

      {showDropdown && (
        <div className="train-search-dropdown" role="presentation">
          {showNoResults && (
            <div className="train-search-empty">
              <p>Press <strong>ENTER</strong> to track <strong>"{query}"</strong> live</p>
            </div>
          )}

          {showError && (
            <div className="train-search-error">
              Unable to reach train directory. Press ENTER to search live telemetry directly.
            </div>
          )}

          {results && results.length > 0 && (
            <ul className="train-search-results" role="listbox">
              {results.map((train, idx) => (
                <li
                  key={train.id}
                  role="option"
                  aria-selected={activeIndex === idx}
                  className={`train-result ${activeIndex === idx ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(train)}
                >
                  <span className="train-result-icon">🚆</span>
                  <div className="train-result-info">
                    <span className="train-result-number">{train.number}</span>
                    <span className="train-result-name">{train.name}</span>
                  </div>
                  {train.origin && train.destination && (
                    <div className="train-result-route">
                      {train.origin.name} → {train.destination.name}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
