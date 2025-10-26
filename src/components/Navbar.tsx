import { useState } from 'react';
import './Navbar.css';

type NavItem = {
  label: string;
  href: string;
};

// TODO: Add a "Top Anime" subsection under the Discover page later
const primaryLinks: NavItem[] = [
  { label: 'Browse', href: '#browse' },
  { label: 'Discover', href: '#discover' },
  { label: 'Seasonal', href: '#seasonal' },
  { label: 'Genres', href: '#genres' },
  { label: 'Community', href: '#community' },
];

const userLinks: NavItem[] = [
  { label: 'Watchlist', href: '#watchlist' },
  { label: 'My List', href: '#my-list' },
  { label: 'Favorites', href: '#favorites' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire up real search; for now just navigate to a placeholder route
    const q = query.trim();
    if (!q) return;
    // Replace with router navigation when available
    window.location.hash = `search?q=${encodeURIComponent(q)}`;
    setMenuOpen(false);
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <a className="nav__brand" href="#home" aria-label="Home">
          <span className="nav__title">My Anime List</span>
        </a>

        <button
          className="nav__burger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav__links ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
          {primaryLinks.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>

        <form className="nav__search" role="search" onSubmit={onSearchSubmit}>
          <input
            type="search"
            placeholder="Search anime, tags, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          <button type="submit">Search</button>
        </form>

        <nav className={`nav__user ${menuOpen ? 'is-open' : ''}`} aria-label="User">
          {userLinks.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="#sign-in" className="nav__signin" onClick={() => setMenuOpen(false)}>
            Sign in
          </a>
        </nav>
      </div>
    </header>
  );
}
