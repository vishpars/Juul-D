
import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Map, MapPin, Scroll, Library, Settings, FolderOpen, Folder, Edit2, Trash2, ChevronDown, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
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
  market: 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/lore-library.jpg'
};

interface LoreModuleProps {
  isAdmin?: boolean;
}

const LoreModule: React.FC<LoreModuleProps> = ({ isAdmin = false }) => {
  const [currentTab, setCurrentTab] = useState<Tab>(() => {
      return (localStorage.getItem('lore_last_tab') as Tab) || 'wiki';
  });
  
  const [targetMapId, setTargetMapId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      <span className={`text-[8px] uppercase tracking-widest font-semibold transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>{label}</span>
    </button>
  );

  const showGradient = currentTab === 'library' || currentTab === 'quests';

  return (
    <div className="relative w-full h-[calc(100dvh-3rem)] md:h-screen overflow-hidden bg-slate-950 text-slate-200 flex">
      <style>{`
        @keyframes breath {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        .animate-breath {
          animation: breath 5s ease-in-out infinite;
        }
      `}</style>

      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 transition-opacity duration-700 ease-in-out pointer-events-none"
        style={{
          backgroundImage: `url(${BACKGROUNDS[currentTab]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.2) blur(3px) sepia(0.2) hue-rotate(180deg)' 
        }}
      />

      <div className={`fixed inset-x-0 bottom-[-5%] h-[90%] bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-0 transition-opacity duration-1000 ${showGradient ? 'opacity-100 animate-breath' : 'opacity-0'}`} />

      {/* Sidebar Navigation */}
      <nav 
        className={`
            relative z-50 bg-slate-950/95 border-r border-indigo-900/30 flex flex-col items-center shadow-2xl backdrop-blur-md shrink-0 transition-[width,transform] duration-300 ease-in-out
            ${isSidebarCollapsed ? 'w-0 -translate-x-full md:translate-x-0 md:w-0 md:border-r-0' : 'w-20 md:w-24 translate-x-0'}
        `}
      >
        <div className="flex flex-col w-full space-y-1 md:space-y-2 overflow-y-auto no-scrollbar flex-1 pt-4">
          <NavButton tab="wiki" icon={BookOpen} label="Вики" />
          <NavButton tab="maps" icon={Map} label="Карты" />
          <NavButton tab="locations" icon={MapPin} label="Места" />
          <NavButton tab="quests" icon={Scroll} label="Квесты" />
          <NavButton tab="library" icon={Library} label="Библиотека" />
          <NavButton tab="market" icon={Coins} label="Рынок" />
        </div>

        {/* Sidebar Toggle at Bottom */}
        <div className="mt-auto flex flex-col items-center gap-4 w-full pb-8 pt-4 border-t border-white/5 bg-black/20">
            <div 
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-2 border border-violet-500/20 rounded-full bg-slate-900 cursor-pointer hover:border-violet-500/50 transition-colors select-none group"
              title="Свернуть меню"
            >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-violet-600 shadow-[0_0_15px_rgba(139,92,246,0.6)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.8)] transition-all ${isAdmin ? 'ring-2 ring-emerald-400' : 'animate-pulse'}`} />
            </div>

            <div className="text-[10px] md:text-xs text-slate-600 font-fantasy opacity-50 flex flex-col items-center gap-1 whitespace-nowrap">
                {isAdmin && <span className="text-emerald-500 font-bold">ADMIN</span>}
            </div>
        </div>
      </nav>

      {/* Floating Toggle Button (Visible only when sidebar is collapsed) */}
      <button 
        onClick={() => setIsSidebarCollapsed(false)}
        className={`
            absolute bottom-4 left-4 z-[60] p-2 rounded-full bg-slate-900/90 border border-violet-500/50 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.5)] 
            transition-all duration-500 ease-out hover:scale-110 hover:border-violet-400 hover:text-white
            ${isSidebarCollapsed ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
        `}
      >
         <div className={`w-6 h-6 rounded-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.6)] ${isAdmin ? 'ring-1 ring-emerald-400' : 'animate-pulse'}`} />
      </button>

      {/* Main Content Area */}
      <main className="flex-1 h-full relative z-10 overflow-hidden">
        <div className="w-full h-full relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default LoreModule;
