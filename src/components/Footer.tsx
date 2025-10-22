import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <a href="#home" className="footer__title">My Anime List</a>
          <p className="footer__tag">Track, discover, and enjoy anime.</p>
        </div>

        <nav className="footer__col" aria-label="Discover">
          <h3>Discover</h3>
          <a href="#discover">Discover</a>
          <a href="#seasonal">Seasonal</a>
          <a href="#genres">Genres</a>
          <a href="#community">Community</a>
        </nav>

        <nav className="footer__col" aria-label="Library">
          <h3>Library</h3>
          <a href="#watchlist">Watchlist</a>
          <a href="#my-list">My List</a>
          <a href="#favorites">Favorites</a>
        </nav>

        <nav className="footer__col" aria-label="About">
          <h3>About</h3>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </nav>
      </div>

      <div className="footer__meta">
        <p>
          Data via <a href="https://docs.anilist.co" target="_blank" rel="noreferrer">AniList API</a>
        </p>
        <p>© {year} My Anime List. All rights reserved.</p>
      </div>
    </footer>
  );
}
