import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StreamDetails from './pages/StreamDetails';
import CreateStream from './pages/CreateStream';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/streams/:id" element={<StreamDetails />} />
            <Route path="/create" element={<CreateStream />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
