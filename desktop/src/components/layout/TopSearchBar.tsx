import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { onFocusTopSearch } from '../../lib/top-search';
import { ExternalLink, Home, Search, X } from '../../lib/icons';
import { useSearchHistoryStore } from '../../stores/searchHistory';
import { NavButtons } from './NavButtons';
import { SEARCH_BAR_BG, SEARCH_BAR_HOVER, SEARCH_BAR_WIDTH } from './search-bar-surface';
import { SearchDropdown } from './SearchDropdown';

const SC_URL_RE = /^https?:\/\/(www\.|m\.|on\.)?soundcloud\.com\/.+/i;

function isSoundCloudUrl(input: string): boolean {
  return SC_URL_RE.test(input.trim());
}

export const TopSearchBar = React.memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearchPage = location.pathname === '/search';
  const urlQuery = searchParams.get('q') ?? '';
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'users'>('tracks');
  const [resolveUrl, setResolveUrl] = useState<string | null>(null);
  const addQuery = useSearchHistoryStore((s) => s.addQuery);

  const isUrl = isSoundCloudUrl(inputValue);
  const surface = `${SEARCH_BAR_BG} ${SEARCH_BAR_HOVER}`;

  useEffect(() => {
    return onFocusTopSearch(() => {
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  }, []);

  useEffect(() => {
    if (!isSearchPage) return;
    setInputValue(urlQuery);
    setDebouncedQuery(urlQuery.trim());
  }, [isSearchPage, urlQuery]);

  useEffect(() => {
    if (isUrl) {
      setDebouncedQuery('');
      return;
    }
    setResolveUrl(null);
    const handler = setTimeout(() => {
      const q = inputValue.trim();
      setDebouncedQuery(q);
      if (q) addQuery(q);
      if (isSearchPage) {
        setSearchParams(q ? { q } : {}, { replace: true });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [inputValue, isUrl, addQuery, isSearchPage, setSearchParams]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  const goFullSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      if (isSoundCloudUrl(q)) {
        setResolveUrl(q);
        setOpen(true);
        return;
      }
      addQuery(q);
      if (isSearchPage) {
        setSearchParams({ q });
      } else {
        navigate(`/search?q=${encodeURIComponent(q)}`);
        close();
      }
    },
    [addQuery, navigate, close, isSearchPage, setSearchParams],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      goFullSearch(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    if (isSoundCloudUrl(pasted)) {
      e.preventDefault();
      setInputValue(pasted);
      setResolveUrl(pasted.trim());
      setOpen(true);
    }
  };

  const handleHistorySelect = (query: string) => {
    goFullSearch(query);
  };

  return (
    <div
      ref={rootRef}
      data-no-drag
      className="flex items-center gap-2 shrink-0"
    >
      <NavButtons />

      <button
        type="button"
        onClick={() => navigate('/home')}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${surface} text-[#b3b3b3] transition-colors hover:text-white`}
        title={t('nav.home')}
      >
        <Home size={20} strokeWidth={2} />
      </button>

      <div className={`relative shrink-0 ${SEARCH_BAR_WIDTH}`}>
        <div
          role="search"
          className={`flex h-10 w-full items-center rounded-full ${surface} transition-colors ${
            open ? 'ring-1 ring-white/90' : ''
          }`}
        >
          <div className="flex shrink-0 items-center justify-center pl-3.5 pr-1 text-[#b3b3b3]">
            {isUrl ? <ExternalLink size={18} className="text-accent" /> : <Search size={18} strokeWidth={2} />}
          </div>
          <input
            ref={inputRef}
            type="text"
            data-top-search-input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setOpen(!isSearchPage)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={t('search.topPlaceholder')}
            className="flex-1 min-w-0 bg-transparent text-[14px] text-white placeholder:text-[#b3b3b3] outline-none py-2 pr-1"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setDebouncedQuery('');
                setResolveUrl(null);
                if (isSearchPage) setSearchParams({});
              }}
              className="flex shrink-0 items-center justify-center px-2.5 text-[#b3b3b3] hover:text-white"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {open && !isSearchPage && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[60] w-full">
            <SearchDropdown
              inputValue={inputValue}
              debouncedQuery={debouncedQuery}
              resolveUrl={resolveUrl}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onHistorySelect={handleHistorySelect}
              onFullSearch={goFullSearch}
              onClose={close}
            />
          </div>
        )}
      </div>
    </div>
  );
});
