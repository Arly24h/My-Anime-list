import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TopAnimeList from './components/TopAnimeList';
import TrendingList from './components/TrendingList';
import { useEffect, useState } from 'react';
import Signup from './pages/Signup';

function App() {
  const [hash, setHash] = useState<string>(window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isSignup = hash.replace('#', '').toLowerCase() === 'signup';

  return (
    <div className="app">
      <Navbar />
      <main>
        {isSignup ? (
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
