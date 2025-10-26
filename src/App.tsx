import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import TopAnimeList from './components/TopAnimeList';

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <TopAnimeList />
      </main>
      <Footer />
    </div>
  );
}

export default App;
