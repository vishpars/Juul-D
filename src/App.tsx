
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import bridge from '@vkontakte/vk-bridge';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AuthPage } from './pages/AuthPage';
import { Loader2 } from 'lucide-react';

// Import Modules
import RosterModule from './modules/roster/App';
import BattleModule from './modules/battle/App';
import LoreModule from './modules/lore/App';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <Layout />;
};

const AppContent = () => {
  const { isAdmin, isLoading } = useAuth();

  // Prevent HashRouter from mounting while Auth is initializing.
  // This prevents the router from consuming the OAuth token hash before Supabase processes it.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b14] text-violet-500">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="roster/*" element={<RosterModule isAdmin={isAdmin} />} />
          <Route path="battle/*" element={<BattleModule isAdmin={isAdmin} />} />
          <Route path="lore/*" element={<LoreModule isAdmin={isAdmin} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

function App() {
  useEffect(() => {
    // <--- 2. Инициализация
    bridge.send("VKWebAppInit");
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
