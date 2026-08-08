import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import './index.css';
import { Calculator } from './components/pages/Calculator';
import { History } from './components/pages/History';
import { BillDetails } from './components/pages/BillDetails';
import { Layout } from './components/Layout';

// Wrapper component to handle route parameters for BillDetails
function BillDetailsWrapper() {
  const { id } = useParams<{ id: string }>();
  return <BillDetails id={id || ''} />;
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
      const isDark = savedMode ? savedMode === 'true' : prefersDark;
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
      return isDark;
    }
    return false;
  });

  // Update the document class and localStorage when dark mode changes
  const handleDarkModeChange = (isDark: boolean) => {
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDark.toString());
  };

  return (
    <BrowserRouter>
      <Layout isDarkMode={isDarkMode} setIsDarkMode={handleDarkModeChange}>
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/history" element={<History />} />
          <Route path="/bill/:id" element={<BillDetailsWrapper />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
