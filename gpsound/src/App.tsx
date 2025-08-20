import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DrawMapZones from './components/DrawMapZones';
import LibraryPlayground from './components/LibraryPlayground';

// @ts-ignore
window.type = true;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DrawMapZones />} />
        <Route path="/playground" element={<LibraryPlayground />} />
      </Routes>
    </Router>
  );
}

export default App;