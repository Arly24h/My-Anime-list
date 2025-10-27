import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TopAnimeList from './components/TopAnimeList';
import TrendingList from './components/TrendingList';

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <TrendingList />
        <TopAnimeList />
      </main>
      <Footer />
    </div>
  );
}

export default App;
