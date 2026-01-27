
import React from 'react';
import { ShieldCheck, Activity, ChevronRight } from 'lucide-react';

interface Props {
  col1: React.ReactNode;
  col2: React.ReactNode;
  col3: React.ReactNode;
  onNextRound: () => void;
  currentRound: number;
}

const BattleLayout: React.FC<Props> = ({ col1, col2, col3, onNextRound, currentRound }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 flex flex-col h-screen overflow-hidden relative">
      
      {/* Background Ambience Overlay with Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 opacity-60"
           // здесь задний фон
           style={{ backgroundImage: `url('https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/character-roster-bg.jpg')` }}>
      </div>
      {/* Reduced darkness of overlay to let image show through more */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/70 to-slate-950 pointer-events-none z-0"></div>

      {/* Top Bar */}
      <header className="mb-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-violet-500/20 shadow-lg relative z-10 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-900/40 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <ShieldCheck size={20} />
             </div>
             <div>
                 <h1 className="text-xl font-fantasy font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-violet-200">
                     КОНСОЛЬ ДЕМИУРГА
                 </h1>
                 <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     SYSTEM ACTIVE
                 </div>
             </div>
        </div>
        
        <div className="flex items-center gap-6">
             <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Текущий Раунд</div>
                <div className="font-fantasy text-2xl text-white leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{currentRound}</div>
             </div>
             
             <div className="h-8 w-px bg-white/10"></div>
             
             <button 
                onClick={onNextRound}
                className="group relative px-6 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg font-fantasy uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all overflow-hidden border border-indigo-400/30"
             >
                <span className="relative z-10 flex items-center gap-2">
                    Следующий Ход <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
             </button>
        </div>
      </header>

      {/* 3-Column Grid */}
      <main className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 relative z-10">
        {/* Participants */}
        <div className="col-span-12 md:col-span-3 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden shadow-xl">
             <div className="p-3 border-b border-white/5 bg-white/5 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Activity size={12} className="text-violet-400" />
                 Субъекты
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                 {col1}
             </div>
        </div>

        {/* Builder */}
        <div className="col-span-12 md:col-span-6 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden shadow-xl">
             {col2}
        </div>

        {/* Log */}
        <div className="col-span-12 md:col-span-3 flex flex-col min-h-0 bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden shadow-xl">
             {col3}
        </div>
      </main>
    </div>
  );
};

export default BattleLayout;
