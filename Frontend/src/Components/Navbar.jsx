import React, { useState, useEffect, useRef, useCallback } from 'react';
import AniRecs from '../assets/AniRecsLogo.svg';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import searchIcon from '../assets/search.svg';
import axios from 'axios';
import { logout, showToast } from '../../store/AuthSlice.js';

const BASE = import.meta.env.VITE_BASE_URL;

// ─── Suggestion item ──────────────────────────────────────────────────────────
function SuggestionItem({ item, onSelect }) {
  return (
    <button
      onMouseDown={() => onSelect(item)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
    >
      <img
        src={item.poster}
        alt={item.title}
        className="w-9 h-12 object-cover rounded-md shrink-0 border border-white/10"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-hanken-med truncate">{item.title}</p>
        {item.score && (
          <p className="text-[11px] text-yellow-400/80">★ {item.score}</p>
        )}
      </div>
    </button>
  );
}

// ─── Search bar with live suggestions ─────────────────────────────────────────
function SearchBar({ className = '' }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const [fetching,    setFetching]    = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const navigate    = useNavigate();

  // Global keyboard shortcut: "/" focuses the bar
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setFetching(true);
    try {
      const res = await axios.get(`${BASE}/api/search/suggestions?q=${encodeURIComponent(q)}`);
      setSuggestions(res.data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (item) => {
    navigate(`/anime/${encodeURIComponent(item.title)}/${item.animeId}`);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    if (e.key === 'Enter')  handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative w-full max-w-xl rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all focus-within:border-primary/60 focus-within:bg-primary/5">
        <img src={searchIcon} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" alt="" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search anime…"
          className="w-full bg-transparent pl-7 pr-14 text-sm text-tertiary outline-none placeholder-white/30"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-white/20 border border-white/10 rounded px-1.5 py-0.5 font-mono hidden md:block">
          /
        </kbd>
      </div>

      {/* Suggestion dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 z-[200] bg-[#1a0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {fetching ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              Searching…
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="py-1">
                {suggestions.map(item => (
                  <SuggestionItem key={item.animeId} item={item} onSelect={handleSelect} />
                ))}
              </div>
              <button
                onMouseDown={handleSubmit}
                className="w-full px-4 py-2.5 text-xs text-primary border-t border-white/5 hover:bg-white/5 text-left transition cursor-pointer font-hanken-med"
              >
                See all results for "<span className="font-hanken-bold">{query}</span>" →
              </button>
            </>
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500">No suggestions found.</div>
          )}
        </div>
      )}
    </form>
  );
}

// ─── Profile Avatar Dropdown ──────────────────────────────────────────────────
function ProfileDropdown({ userData }) {
  const [open, setOpen] = useState(false);
  const dropdownRef     = useRef(null);
  const dispatch        = useDispatch();
  const navigate        = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await axios.post(`${BASE}/api/user/auth/logout`, {}, { withCredentials: true });
    } catch { /* ignore network error on logout */ }
    dispatch(logout());
    dispatch(showToast({ message: 'Logged out successfully.', type: 'info' }));
    navigate('/');
  };

  const username = userData?.username || 'User';
  const avatar   = userData?.avatar   || '';
  const initial  = username.charAt(0).toUpperCase();

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Trigger button ── */}
      <button
        id="navbar-profile-btn"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer group"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        {/* Avatar circle */}
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/20 bg-primary/20 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt={username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-hanken-black text-primary leading-none">{initial}</span>
          )}
        </div>
        {/* Username (hidden on tiny screens) */}
        <span className="text-xs font-hanken-bold text-white/75 group-hover:text-white transition-colors hidden sm:block max-w-[72px] truncate">
          {username}
        </span>
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-white/35 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2.5 w-56 bg-[#150d10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-[200] animate-[fadeIn_0.15s_ease-out]"
          role="menu"
        >
          {/* User info header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-primary/20 flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt={username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-hanken-black text-primary leading-none">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-hanken-bold text-white truncate">{username}</p>
              <p className="text-[10px] text-gray-500 font-hanken-light truncate mt-0.5">{userData?.email || ''}</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="py-1">
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${
                  isActive ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-hanken-med">My Profile</span>
            </NavLink>

            <NavLink
              to="/discover"
              onClick={() => setOpen(false)}
              role="menuitem"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${
                  isActive ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-hanken-med">Discover</span>
            </NavLink>

            <NavLink
              to="/search"
              onClick={() => setOpen(false)}
              role="menuitem"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${
                  isActive ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <span className="font-hanken-med">Search Anime</span>
            </NavLink>
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-white/[0.07] py-1">
            <button
              onClick={handleLogout}
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-hanken-med">Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
function Navbar() {
  const authStatus = useSelector(state => state.auth.status);
  const userData   = useSelector(state => state.auth.userData);

  const Navlinks = [
    { text: 'Explore',   path: '/explore'  },
    { text: 'Genre',     path: '/genres'   },
    { text: 'Top Rated', path: '/topRated' },
  ];

  return (
    <div className="w-full py-2 animate-[fadeIn_1s_ease-out] bg-neutral mix-blend-screen backdrop-blur-sm sticky top-0 z-50">
      <nav className="mx-4 flex items-center justify-between gap-4 text-[14px]">
        <NavLink to="/">
          <img src={AniRecs} height="100px" width="150px" alt="AniRecs Logo" />
        </NavLink>

        <SearchBar className="flex-1 hidden md:block max-w-md" />

        <section className="flex items-center gap-4">
          {/* Desktop nav links */}
          <ul className="hidden md:flex gap-6">
            {Navlinks.map(link => (
              <li key={link.text} className="font-hanken-med hover:text-primary transition-colors duration-200">
                <NavLink
                  to={link.path}
                  className={({ isActive }) => isActive ? 'text-primary' : ''}
                >
                  {link.text}
                </NavLink>
              </li>
            ))}
          </ul>

          {!authStatus ? (
            /* Logged-out: Login / SignUp buttons */
            <section className="flex gap-3 font-hanken-bold">
              <NavLink
                to="/login"
                className="rounded-full border border-white/20 px-5 py-2 hover:text-primary transition-colors duration-200"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="rounded-full bg-tertiary px-5 py-2 text-primary-dark hover:bg-primary hover:text-tertiary transition"
              >
                SignUp
              </NavLink>
            </section>
          ) : (
            /* Logged-in: mobile search icon + profile dropdown */
            <div className="flex items-center gap-3">
              <NavLink
                to="/search"
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:border-primary/50 transition"
                title="Search"
              >
                <img src={searchIcon} className="w-4 h-4" alt="Search" />
              </NavLink>

              <ProfileDropdown userData={userData} />
            </div>
          )}
        </section>
      </nav>
    </div>
  );
}

export default Navbar;

export const VerticalNavbar = () => {
  const authStatus = useSelector(state => state.auth.status);

  const Navlinks = [
    { text: 'Home',         path: '/home'        },
    { text: 'Explore',      path: '/explore'     },
    { text: 'Genre',        path: '/genres'      },
    { text: 'Top Anime',    path: '/topRated'    },
    { text: 'New Releases', path: '/new-release' },
    { text: 'Watchlist',    path: '/watchlist'   },
  ];

  return (
    <div className="w-full py-2 animate-[fadeIn_1s_ease-out]">
    </div>
  );
};
