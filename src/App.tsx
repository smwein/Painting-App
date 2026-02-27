import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { Home } from './pages/Home';
import { SavedBids } from './pages/SavedBids';
import { Settings } from './pages/Settings';
import { CalculatorPage } from './pages/CalculatorPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calculator/:type" element={<CalculatorPage />} />
          <Route path="/saved-bids" element={<SavedBids />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
