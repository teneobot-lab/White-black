
import React from 'react';
// Explicitly importing standard v6 routing components from react-router-dom.
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/Store';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Transactions from './components/Transactions';
import History from './components/History';
import AiAssistant from './components/AiAssistant';
import Admin from './components/Admin';
import RejectManager from './components/RejectManager';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/history" element={<History />} />
            <Route path="/reject" element={<RejectManager />} />
            <Route path="/ai" element={<AiAssistant />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
