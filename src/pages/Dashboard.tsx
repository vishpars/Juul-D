
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Sword, Library, ArrowRight, Activity, ShieldCheck, Sparkles, AlertTriangle, Ghost } from 'lucide-react';
import { ModuleCardProps } from '../types';
import { useAuth } from '../context/AuthContext';

// --- SPLASHES DATA ---
// Массив сплешей для главной страницы
const SPLASHES = [
    { text: "Не забудь обновить сейв.", type: 'helpful' },
    { text: "Зелья лечения имеют срок годности.", type: 'helpful' },
    { text: "Бестиарий пополнился новыми ужасами.", type: 'helpful' },
    { text: "За тобой следят из монитора.", type: 'harmful' },
    { text: "Твой персонаж хочет умереть.", type: 'harmful' },
    { text: "Гоблин украл твой носок.", type: 'funny' },
    { text: "Здесь НЕ могла быть ваша реклама.", type: 'funny' },
    { text: "Система перегружена пафосом.", type: 'funny' },
    { text: "Котики правят миром.", type: 'funny' },
];

const ModuleCard: React.FC<ModuleCardProps & { color: string }> = ({ title, description, path, icon: Icon, color }) => {
  // Dynamic color classes based on prop
  const colors: any = {
      violet: {
          bg: 'bg-violet-950/30',
          border: 'border-violet-500/30',
          hoverBorder: 'group-hover:border-violet-400',
          iconBg: 'bg-violet-900/40',
          iconText: 'text-violet-300',
          title: 'group-hover:from-violet-200 group-hover:to-fuchsia-200',
          glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
          btn: 'text-violet-400'
      },
      emerald: {
          bg: 'bg-emerald-950/30',
          border: 'border-emerald-500/30',
          hoverBorder: 'group-hover:border-emerald-400',
          iconBg: 'bg-emerald-900/40',
          iconText: 'text-emerald-300',
          title: 'group-hover:from-emerald-200 group-hover:to-teal-200',
          glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
          btn: 'text-emerald-400'
      },
      indigo: {
          bg: 'bg-indigo-950/30',
          border: 'border-indigo-500/30',
          hoverBorder: 'group-hover:border-indigo-400',
          iconBg: 'bg-indigo-900/40',
          iconText: 'text-indigo-300',
          title: 'group-hover:from-indigo-200 group-hover:to-blue-200',
          glow: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]',
          btn: 'text-indigo-400'
      },
      // Added Red for Battle
      red: {
          bg: 'bg-red-950/30',
          border: 'border-red-500/30',
          hoverBorder: 'group-hover:border-red-400',
          iconBg: 'bg-red-900/40',
          iconText: 'text-red-300',
          title: 'group-hover:from-red-200 group-hover:to-orange-200',
          glow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]',
          btn: 'text-red-400'
      }
  };

  const theme = colors[color] || colors.violet;

  return (
    <Link to={path} className="group relative block h-64 w-full">
        <div className={`absolute inset-0 ${theme.bg} backdrop-blur-md border ${theme.border} rounded-xl transition-all duration-500 overflow-hidden ${theme.hoverBorder} ${theme.glow} group-hover:-translate-y-2 clip-path-polygon`}>
            
            {/* Background Grid FX */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                 }}>
            </div>
            
            {/* Radial Gradient Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 blur-3xl rounded-full group-hover:bg-white/10 transition-colors"></div>

            <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-lg ${theme.iconBg} border border-white/5 ${theme.iconText} group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={28} />
                    </div>
                    <ArrowRight className={`w-5 h-5 ${theme.btn} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
                </div>

                <div>
                    <h2 className={`text-xl font-fantasy font-bold text-white tracking-widest mb-2 transition-colors bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 ${theme.title}`}>
                        {title}
                    </h2>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed line-clamp-2 group-hover:text-slate-300 transition-colors">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    </Link>
  );
};

export const Dashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();

  // Pick random splash based on date to keep it consistent for the day
  const dailySplash = useMemo(() => {
      const date = new Date();
      const seed = date.getDate() + date.getMonth() + date.getFullYear(); // Simple seed
      const index = seed % SPLASHES.length;
      return SPLASHES[index];
  }, []);

  // Determine icon/color for splash
  const getSplashIcon = (type: string) => {
      switch(type) {
          case 'helpful': return <Activity size={16} className="animate-pulse text-emerald-400" />;
          case 'harmful': return <AlertTriangle size={16} className="animate-pulse text-red-500" />;
          default: return <Ghost size={16} className="animate-bounce text-violet-400" />;
      }
  };

  const getSplashColor = (type: string) => {
      switch(type) {
          case 'helpful': return 'text-emerald-400';
          case 'harmful': return 'text-red-500';
          default: return 'text-violet-400';
      }
  };

  return (
    <div className="min-h-screen relative p-6 md:p-12 overflow-hidden flex flex-col justify-center">
      
      {/* Background Ambience Layer applied in Layout, here we add layout specific glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
            <div>
                <div className={`flex items-center gap-2 mb-2 animate-fadeIn ${getSplashColor(dailySplash.type)}`}>
                    {getSplashIcon(dailySplash.type)}
                    <span className="text-xs font-mono uppercase tracking-widest">{dailySplash.text}</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-fantasy font-bold text-white tracking-widest leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    <span className="text-violet-400">РАСПУТЬЕ</span>
                </h1>
                <p className="text-slate-400 mt-4 max-w-xl font-sans text-sm md:text-base leading-relaxed">
                    Центральный терминал управления миром. Доступ к реестру сущностей, симуляции конфликтов и архивам знаний.
                </p>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
                <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 backdrop-blur-md ${isAdmin ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900/20 border-slate-500/50 text-slate-300'}`}>
                    {isAdmin ? <ShieldCheck size={14} /> : <Users size={14} />}
                    <span className="text-xs font-bold uppercase tracking-wider">{isAdmin ? 'Администратор' : 'Гостевой Доступ'}</span>
                </div>
                {/* ID Only visible for Admin */}
                {isAdmin && (
                    <div className="text-[10px] text-slate-600 font-mono">
                        ID: {user?.id?.substring(0,8) || 'НЕИЗВЕСТНО'}
                    </div>
                )}
            </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModuleCard 
              title="ЛЕТОПИСЬ ДУШ"
              description="Реестр персонажей, бестиарий, управление характеристиками и инвентарем."
              path="/roster"
              icon={Users}
              color="emerald"
            />
            <ModuleCard 
              title="ПОСТРОЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТИ"
              description="Тактический интерфейс. Расчет последовательностей, управление временем и статусами."
              path="/battle"
              icon={Sword}
              color="red"
            />
            <ModuleCard 
              title="ИНФОРМАЦИЯ О МИРЕ"
              description="Библиотека лора. Карты, локации, квесты и история мира."
              path="/lore"
              icon={Library}
              color="violet"
            />
        </div>

        {/* Footer Decor */}
        <div className="flex justify-center items-center gap-4 opacity-30 pt-12">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white to-transparent"></div>
            <Sparkles size={16} className="text-white animate-pulse" />
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-white to-transparent"></div>
        </div>

      </div>
    </div>
  );
};
