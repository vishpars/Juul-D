
import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Map, MapPin, Scroll, Library, Settings, FolderOpen, Folder, Edit2, Trash2, ChevronDown, Coins } from 'lucide-react';
import { Modal } from './components/Modal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useLoreCategories } from './hooks/useLoreCategories';
import { useLibraryCategories } from './hooks/useLibraryCategories';

// Pages
import { LibraryPage } from './pages/LibraryPage';
import QuestBoardPage from './pages/QuestBoardPage';
import WikiPage from './pages/WikiPage';
import LocationsPage from './pages/LocationsPage';
import MapsPage from './pages/MapsPage';
import MarketPage from './pages/MarketPage';

type Tab = 'wiki' | 'maps' | 'locations' | 'quests' | 'library' | 'market';

const BACKGROUNDS: Record<Tab, string> = {
  wiki: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-states.jpg',
  maps: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-maps.jpg',
  locations: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-locations.jpg',
  quests: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-quests.jpg',
  library: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-library.jpg',
  market: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-library.jpg' // Placeholder BG
};

interface LoreModuleProps {
  isAdmin?: boolean;
}

const LoreModule: React.FC<LoreModuleProps> = ({ isAdmin = false }) => {
  // Use lazy initializer to read from localStorage or default to 'wiki'
  const [currentTab, setCurrentTab] = useState<Tab>(() => {
      return (localStorage.getItem('lore_last_tab') as Tab) || 'wiki';
  });
  
  const [targetMapId, setTargetMapId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Persist tab change
  useEffect(() => {
      localStorage.setItem('lore_last_tab', currentTab);
  }, [currentTab]);

  const navigateToMap = (mapId: string) => {
      setTargetMapId(mapId);
      setCurrentTab('maps');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'library': return <LibraryPage isAdmin={isAdmin} />;
      case 'quests': return <QuestBoardPage isAdmin={isAdmin} />;
      case 'wiki': return <WikiPage isAdmin={isAdmin} />;
      case 'locations': return <LocationsPage isAdmin={isAdmin} onNavigateToMap={navigateToMap} />;
      case 'maps': return <MapsPage isAdmin={isAdmin} initialMapId={targetMapId} />;
      case 'market': return <MarketPage isAdmin={isAdmin} />;
      default: return <WikiPage isAdmin={isAdmin} />;
    }
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentTab(tab)}
      title={label}
      className={`flex flex-col items-center justify-center p-3 w-full transition-all duration-300 border-l-4 ${
        currentTab === tab 
          ? 'bg-indigo-900/80 border-violet-500 text-violet-400 shadow-[inset_10px_0_20px_-10px_rgba(139,92,246,0.3)]' 
          : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
      }`}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-[8px] uppercase tracking-widest font-semibold">{label}</span>
    </button>
  );

  const showGradient = currentTab === 'library' || currentTab === 'quests';

  return (
    // Updated container to handle full screen layout
    <div className="relative w-full h-[calc(100dvh-3rem)] md:h-screen overflow-hidden bg-slate-950 text-slate-200">
      <style>{`
        @keyframes breath {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        .animate-breath {
          animation: breath 5s ease-in-out infinite;
        }
      `}</style>

      {/* Dynamic Background Layer 1: Image */}
      <div 
        className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out"
        // здесь задний фон
        style={{
          backgroundImage: `url(${BACKGROUNDS[currentTab]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.2) blur(3px) sepia(0.2) hue-rotate(180deg)' // Darker, purple tint
        }}
      />

      {/* Dynamic Background Layer 2: Pulsing Gradient - ONLY FOR LIBRARY AND QUESTS */}
      <div className={`absolute inset-x-0 bottom-[-5%] h-[90%] bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-0 transition-opacity duration-1000 ${showGradient ? 'opacity-100 animate-breath' : 'opacity-0'}`} />

      {/* Floating Collapsed Toggle Button (Bottom Left) */}
      <button 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={`
            absolute bottom-4 left-4 z-[60] p-2 rounded-full bg-slate-900/90 border border-violet-500/50 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.5)] 
            transition-all duration-500 ease-out hover:scale-110 hover:border-violet-400 hover:text-white
            ${isSidebarCollapsed ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
        `}
      >
         <div className={`w-6 h-6 rounded-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.6)] ${isAdmin ? 'ring-1 ring-emerald-400' : 'animate-pulse'}`} />
      </button>

      {/* Sidebar Navigation */}
      <nav 
        className={`
            absolute inset-y-0 left-0 bg-slate-950/95 border-r border-indigo-900/30 flex flex-col items-center z-50 py-4 md:py-6 shadow-2xl backdrop-blur-md
            transition-[transform,opacity] duration-500 ease-in-out w-20 md:w-24
            ${isSidebarCollapsed ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
        `}
      >
        <div 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="mb-4 md:mb-8 p-2 border border-violet-500/20 rounded-full bg-slate-900 cursor-pointer hover:border-violet-500/50 transition-colors select-none group"
        >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.8)] transition-all ${isAdmin ? 'animate-none ring-2 ring-emerald-400' : 'animate-pulse'}`} />
        </div>
        
        <div className="flex flex-col w-full space-y-1 md:space-y-2 overflow-y-auto no-scrollbar">
          <NavButton tab="wiki" icon={BookOpen} label="Вики" />
          <NavButton tab="maps" icon={Map} label="Карты" />
          <NavButton tab="locations" icon={MapPin} label="Места" />
          <NavButton tab="quests" icon={Scroll} label="Квесты" />
          <NavButton tab="library" icon={Library} label="Библиотека" />
          <NavButton tab="market" icon={Coins} label="Рынок" />
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full pb-8 md:pb-0">
            <div className="text-[10px] md:text-xs text-slate-600 font-fantasy opacity-50 flex flex-col items-center gap-1 whitespace-nowrap">
                {isAdmin && <span className="text-emerald-500 font-bold">ADMIN</span>}
            </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`
          absolute inset-0 
          transition-all duration-500 
          ${isSidebarCollapsed ? 'left-0' : 'left-0 md:left-24'}
          z-10
      `}>
        <div className="w-full h-full relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default LoreModule;
