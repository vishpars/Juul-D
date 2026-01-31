
import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import bridge from '@vkontakte/vk-bridge';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { AuthPage } from './pages/AuthPage';
import { Loader2 } from 'lucide-react';

// Lazy Load Modules to reduce bundle size and speed up initial load
const RosterModule = lazy(() => import('./modules/roster/App'));
const BattleModule = lazy(() => import('./modules/battle/App'));
const LoreModule = lazy(() => import('./modules/lore/App'));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050b14] text-violet-500">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin w-10 h-10" />
      <span className="font-fantasy text-sm tracking-widest opacity-70">ЗАГРУЗКА МОДУЛЯ...</span>
    </div>
  </div>
);

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return <Layout />;
};

const AppContent = () => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b14] text-violet-500">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    </HashRouter>
  );
};

function App() {
  useEffect(() => {
    bridge.send("VKWebAppInit");
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
