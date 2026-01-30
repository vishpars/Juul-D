
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutGrid, Users, Sword, Library, LogOut, Hexagon, ChevronLeft, ChevronRight, X, RefreshCw, AlertCircle, KeyRound, Check } from 'lucide-react';
import { NavItem } from '../../types';
import { CacheService } from '../../utils/cache';

interface SidebarProps {
  isDesktopCollapsed: boolean;
  toggleDesktopSidebar: () => void;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

const REFRESH_COOLDOWN = 60 * 60 * 1000; // 1 hour in ms
const LAST_REFRESH_KEY = 'juul_d_last_refresh';

export const Sidebar: React.FC<SidebarProps> = ({ 
  isDesktopCollapsed, 
  toggleDesktopSidebar,
  isMobileOpen,
  closeMobileSidebar
}) => {
  const { signOut, user, isAdmin, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // Password Change State
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { label: 'Распутье', path: '/', icon: LayoutGrid },
    { label: 'Летопись Душ', path: '/roster', icon: Users },
    { label: 'Построение Последовательности', path: '/battle', icon: Sword },
    { label: 'Информация о Мире', path: '/lore', icon: Library },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    if (window.innerWidth < 1150) closeMobileSidebar();
  };

  const handleRefreshData = async () => {
      setRefreshError(null);
      
      if (!isAdmin) {
          const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
          if (lastRefresh) {
              const timeSince = Date.now() - parseInt(lastRefresh, 10);
              if (timeSince < REFRESH_COOLDOWN) {
                  const minutesLeft = Math.ceil((REFRESH_COOLDOWN - timeSince) / 60000);
                  setRefreshError(`Ждите ${minutesLeft} мин.`);
                  setTimeout(() => setRefreshError(null), 3000);
                  return;
              }
          }
      }

      setIsRefreshing(true);
      // Clear all cache
      CacheService.clearAll();
      
      // Update timestamp
      localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
      
      // Simulate a small delay for visual feedback, then reload page to re-fetch fresh data
      setTimeout(() => {
          setIsRefreshing(false);
          window.location.reload();
      }, 800);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1150) closeMobileSidebar();
  }

  const handleChangePassword = async () => {
      if (newPassword.length < 6) {
          setPassMessage("Мин. 6 символов");
          return;
      }
      try {
          await updatePassword(newPassword);
          setPassMessage("Успешно!");
          setTimeout(() => {
              setShowPasswordInput(false);
              setNewPassword("");
              setPassMessage(null);
          }, 1500);
      } catch (e: any) {
          setPassMessage("Ошибка");
          console.error(e);
      }
  };

  // Helper to split label for styling
  const renderLabel = (label: string) => {
    const parts = label.split(' ');
    if (parts.length > 1) {
        const first = parts[0];
        const rest = parts.slice(1).join(' ');
        return (
            <div className="flex flex-col leading-none">
                <span>{first}</span>
                <span className="ml-4 text-xs opacity-90 pt-1">{rest}</span>
            </div>
        );
    }
    return <span>{label}</span>;
  };

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-50
        bg-[#050b14]/95 backdrop-blur-xl border-r border-violet-500/20 
        flex flex-col transition-[width,transform] duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        min-[1150px]:translate-x-0
        ${isDesktopCollapsed ? 'w-20' : 'w-64'}
        overflow-visible shadow-[0_0_50px_rgba(0,0,0,0.5)]
      `}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={closeMobileSidebar}
        className="min-[1150px]:hidden absolute top-2 right-2 text-slate-400 hover:text-white p-2 z-[60] bg-black/50 rounded-full border border-white/10"
      >
        <X size={20} />
      </button>

      {/* Desktop Toggle Button */}
      <button 
        onClick={toggleDesktopSidebar}
        className="hidden min-[1150px]:flex absolute -right-3 top-24 bg-slate-900 border border-violet-500/50 text-violet-300 rounded-full p-1 shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:text-white hover:scale-110 transition-all z-[60]"
      >
        {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header / Logo */}
      <div className="h-24 flex items-center justify-center border-b border-violet-500/20 overflow-hidden shrink-0 relative bg-gradient-to-b from-violet-900/10 to-transparent">
        
        <div 
          className="flex items-center gap-3 cursor-pointer select-none"
          title="Juul-D System"
        >
           <div className={`relative flex items-center justify-center group transition-all duration-300 ${isDesktopCollapsed ? 'scale-110' : ''}`}>
             <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <Hexagon className={`w-10 h-10 ${isAdmin ? 'text-emerald-500 fill-emerald-900/20' : 'text-violet-500 fill-violet-900/20'} stroke-[1.5px] group-hover:stroke-violet-300 transition-colors relative z-10`} />
             <span className={`absolute font-fantasy font-bold text-sm ${isAdmin ? 'text-emerald-200' : 'text-violet-200'} tracking-tighter pt-0.5 group-hover:text-white transition-colors z-20`}>JD</span>
           </div>

           <h1 
             className={`
               font-fantasy text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${isAdmin ? 'from-emerald-200 to-teal-200' : 'from-violet-200 to-fuchsia-200'} tracking-widest transition-all duration-300 origin-left drop-shadow-sm
               ${isDesktopCollapsed ? 'w-0 opacity-0 scale-0 hidden min-[1150px]:block' : 'w-auto opacity-100 scale-100'}
             `}
           >
             JUUL-D
           </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) => `
              group flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-300 overflow-hidden relative border border-transparent
              ${isActive 
                ? 'bg-violet-900/20 text-violet-200 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                : 'text-slate-400 hover:bg-white/5 hover:text-violet-300 hover:border-white/10'
              }
              ${isDesktopCollapsed ? 'justify-center' : ''}
            `}
            title={isDesktopCollapsed ? item.label : ''}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`
                    min-w-[24px] w-6 h-6 transition-all duration-300 shrink-0
                    ${isActive ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''}
                  `} 
                />
                
                <div 
                  className={`
                    font-fantasy tracking-wider text-sm transition-all duration-300 uppercase
                    ${isDesktopCollapsed ? 'opacity-0 w-0 min-[1150px]:hidden' : 'opacity-100 w-auto'}
                  `}
                >
                  {renderLabel(item.label)}
                </div>
                
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 shadow-[0_0_10px_#8b5cf6]"></div>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Tools & User Footer */}
      <div className="p-4 border-t border-violet-500/20 shrink-0 bg-black/20">
        <div className="flex flex-col gap-3">
          
          {/* Refresh / Sync Button */}
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing || !!refreshError}
            className={`
                flex items-center gap-4 px-3 py-2 rounded-lg text-slate-400 border border-transparent transition-all w-full group relative overflow-hidden
                ${refreshError 
                    ? 'border-red-500/30 bg-red-900/10 text-red-400 cursor-not-allowed' 
                    : 'hover:text-emerald-300 hover:bg-emerald-900/10 hover:border-emerald-500/30'}
                ${isDesktopCollapsed ? 'justify-center' : ''}
            `}
            title="Обновить базы данных"
          >
             {refreshError ? <AlertCircle className="w-5 h-5 min-w-[20px] shrink-0" /> : <RefreshCw className={`w-5 h-5 min-w-[20px] shrink-0 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />}
             <span className={`font-fantasy tracking-wider text-xs whitespace-nowrap transition-all duration-300 uppercase ${isDesktopCollapsed ? 'hidden' : 'block'}`}>
                 {isRefreshing ? 'Синхронизация...' : (refreshError || 'Обновить Базы')}
             </span>
          </button>

          {/* Change Password Button */}
          {user && user.role !== 'guest' && (
              <div className="relative">
                  <button 
                    onClick={() => setShowPasswordInput(!showPasswordInput)}
                    className={`
                        flex items-center gap-4 px-3 py-2 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-900/10 border border-transparent hover:border-amber-500/30 transition-all w-full
                        ${isDesktopCollapsed ? 'justify-center' : ''}
                    `}
                    title="Сменить Пароль"
                  >
                    <KeyRound className="w-5 h-5 min-w-[20px] shrink-0" />
                    <span className={`font-fantasy tracking-wider text-sm whitespace-nowrap transition-all duration-300 uppercase ${isDesktopCollapsed ? 'hidden' : 'block'}`}>
                        Пароль
                    </span>
                  </button>
                  
                  {/* Password Input Overlay */}
                  {showPasswordInput && !isDesktopCollapsed && (
                      <div className="absolute bottom-full mb-2 left-0 w-full bg-slate-900 border border-violet-500/30 p-2 rounded shadow-xl animate-fadeIn z-50">
                          {passMessage ? (
                              <div className={`text-xs text-center font-bold ${passMessage === 'Успешно!' ? 'text-emerald-400' : 'text-red-400'}`}>{passMessage}</div>
                          ) : (
                              <div className="flex gap-1">
                                  <input 
                                    type="password" 
                                    placeholder="Новый пароль" 
                                    className="w-full bg-black/50 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-violet-500 outline-none"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                  <button onClick={handleChangePassword} className="bg-violet-600 text-white p-1 rounded hover:bg-violet-500"><Check size={14} /></button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          )}

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className={`
              flex items-center gap-4 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/10 border border-transparent hover:border-red-500/30 transition-all w-full
              ${isDesktopCollapsed ? 'justify-center' : ''}
            `}
            title="Выйти"
          >
            <LogOut className="w-5 h-5 min-w-[20px] shrink-0" />
            <span 
              className={`
                font-fantasy tracking-wider text-sm whitespace-nowrap transition-all duration-300 uppercase
                ${isDesktopCollapsed ? 'opacity-0 w-0 min-[1150px]:hidden' : 'opacity-100 w-auto'}
              `}
            >
              Выйти
            </span>
          </button>
          
          {/* Only show ID if Admin */}
          {user && isAdmin && !isDesktopCollapsed && (
            <div className="flex flex-col px-2 mt-1 animate-fadeIn opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[10px] truncate font-mono text-emerald-500">{user.email}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
