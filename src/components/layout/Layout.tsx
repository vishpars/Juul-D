
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BackgroundAmbience } from './BackgroundAmbience';
import { Menu, Hexagon } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const isHub = location.pathname === '/';

  return (
    <div className="min-h-screen font-sans selection:bg-violet-500/30 relative">
      {/* Background Layer - Adjusted Z-index to be visible over body bg */}
      {/* Only render BackgroundAmbience on the Hub */}
      {isHub && (
        <div className="fixed inset-0 z-0">
          <BackgroundAmbience />
        </div>
      )}
      
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#050b14]/90 backdrop-blur-md border-b border-violet-900/20 z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-violet-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
             <div className="relative flex items-center justify-center">
                 <Hexagon className="w-6 h-6 text-violet-600 fill-violet-900/20 stroke-[1.5px]" />
                 <span className="absolute font-fantasy font-bold text-[10px] text-violet-200 tracking-tighter pt-0.5">JD</span>
             </div>
             <span className="font-fantasy font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 tracking-widest">
               JUUL-D
             </span>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden animate-fadeIn"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar 
        isDesktopCollapsed={isDesktopCollapsed} 
        toggleDesktopSidebar={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
      />
      
      {/* Main content - Relative and z-10 to sit above background */}
      {/* Updated: Removed container/mx-auto and desktop padding to allow full-screen modules */}
      <main 
        className={`
          min-h-screen relative z-10 transition-all duration-300 ease-in-out
          pt-12 md:pt-0
          md:pl-20 
          ${isDesktopCollapsed ? '' : 'md:pl-64'}
        `}
      >
        <Outlet />
      </main>
    </div>
  );
};
