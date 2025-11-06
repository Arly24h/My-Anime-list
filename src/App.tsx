import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TopAnimeList from './components/TopAnimeList';
import TrendingList from './components/TrendingList';
import { useEffect, useMemo, useState } from 'react';
import Signup from './pages/Signup';
import AnimePage from './pages/AnimePage';

function App() {
  const [hash, setHash] = useState<string>(window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = useMemo(() => hash.replace(/^#/, ''), [hash]);
  const isSignup = route.toLowerCase() === 'signup';
  const animeId = useMemo(() => {
    const m = route.match(/^anime\/(\d+)/i);
    return m ? Number(m[1]) : null;
  }, [route]);

  return (
    <div className="app">
      <Navbar />
      <main>
        {animeId ? (
          <AnimePage id={animeId} />
        ) : isSignup ? (
          <Signup />
        ) : (
          <>
            <TrendingList />
            <TopAnimeList />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
