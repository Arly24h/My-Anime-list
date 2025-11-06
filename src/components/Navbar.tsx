import { useState } from 'react';
import './Navbar.css';

type NavItem = {
  label: string;
  href: string;
};

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

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery) return;
    window.location.hash = `search?q=${encodeURIComponent(searchQuery)}`;
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
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav__links ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
          {primaryLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>

        <form className="nav__search" role="search" onSubmit={onSearchSubmit}>
          <input
            type="search"
            placeholder="Search anime, tags, users..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search"
          />
          <button type="submit">Search</button>
        </form>

        <nav className={`nav__user ${menuOpen ? 'is-open' : ''}`} aria-label="User">
          {userLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href="#signup" className="nav__signup" onClick={() => setMenuOpen(false)}>
            Sign up
          </a>
          <a href="#sign-in" className="nav__signin" onClick={() => setMenuOpen(false)}>
            Sign in
          </a>
        </nav>
      </div>
    </header>
  );
}
