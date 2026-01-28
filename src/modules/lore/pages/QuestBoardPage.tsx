
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useQuests } from '../hooks/useQuests';
import { useCharacters } from '../hooks/useCharacters';
import { Quest, QuestStatus, QuestType, QuestAlignment, Character } from '../types';
import { Shield, Plus, CheckCircle, ChevronLeft, ChevronRight, X, BookOpen, Sparkles, Edit2, ChevronDown, Gem } from 'lucide-react';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { CharacterSelector } from '../components/CharacterSelector';

// --- Constants & Helpers ---

// Muted / Dark Fantasy colors for pins (Seals/Gems)
const ORB_COLORS = [
  'bg-red-950 border-red-800 text-red-200 shadow-[0_0_8px_rgba(153,27,27,0.5)]',
  'bg-orange-950 border-orange-800 text-orange-200 shadow-[0_0_8px_rgba(154,52,18,0.5)]',
  'bg-amber-950 border-amber-800 text-amber-200 shadow-[0_0_8px_rgba(146,64,14,0.5)]',
  'bg-lime-950 border-lime-800 text-lime-200 shadow-[0_0_8px_rgba(63,98,18,0.5)]',
  'bg-emerald-950 border-emerald-800 text-emerald-200 shadow-[0_0_8px_rgba(6,78,59,0.5)]',
  'bg-cyan-950 border-cyan-800 text-cyan-200 shadow-[0_0_8px_rgba(22,78,99,0.5)]',
  'bg-blue-950 border-blue-800 text-blue-200 shadow-[0_0_8px_rgba(30,58,138,0.5)]',
  'bg-violet-950 border-violet-800 text-violet-200 shadow-[0_0_8px_rgba(76,29,149,0.5)]',
  'bg-fuchsia-950 border-fuchsia-800 text-fuchsia-200 shadow-[0_0_8px_rgba(112,26,117,0.5)]',
  'bg-rose-950 border-rose-800 text-rose-200 shadow-[0_0_8px_rgba(136,19,55,0.5)]'
];

const getPinColor = (name: string, index: number) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ORB_COLORS[(hash + index) % ORB_COLORS.length];
};

const MagicalInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm ${props.className}`} />
);

const MagicalTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 placeholder-violet-900/40 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 backdrop-blur-sm resize-none ${props.className}`} />
);

const MagicalSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={`w-full bg-[#020408] border border-violet-900/40 p-2.5 rounded-lg text-violet-100 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] outline-none transition-all duration-300 appearance-none cursor-pointer ${props.className}`}>
        {props.children}
    </select>
);

const RuneCheckbox = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <div onClick={() => onChange(!checked)} className="cursor-pointer flex items-center gap-3 select-none group">
        <div className={`relative w-8 h-8 flex items-center justify-center transition-all duration-500 ${checked ? 'scale-110' : 'scale-100 opacity-60'}`}>
            <div className={`absolute inset-0 bg-violet-500 blur-md rounded-full transition-opacity duration-500 ${checked ? 'opacity-40' : 'opacity-0'}`}></div>
            <Gem 
                size={24} 
                className={`transition-all duration-500 ${checked ? 'text-violet-300 fill-violet-900/80 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]' : 'text-slate-600'}`} 
            />
        </div>
        <span className={`text-sm font-bold tracking-wide transition-colors ${checked ? 'text-violet-200' : 'text-slate-500'}`}>{label}</span>
    </div>
);

// Holographic / Magic Styles
const getQuestStyles = (quest: Quest) => {
    // Base styles for glassmorphism
    const base = "backdrop-blur-md border transition-all duration-300";

    if (quest.type === QuestType.PERSONAL) {
        return {
            container: `${base} bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]`,
            title: 'text-emerald-100 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]',
            text: 'text-emerald-200/80',
            accent: 'bg-emerald-500',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
            archiveBorder: 'border-emerald-900',
            archiveText: 'text-emerald-400'
        };
    }

    if (quest.type === QuestType.PUBLIC) {
        return {
             container: `${base} bg-slate-900/60 border-slate-500/30 hover:border-slate-300 hover:shadow-[0_0_20px_rgba(148,163,184,0.2)]`,
             title: 'text-slate-100 drop-shadow-[0_0_5px_rgba(148,163,184,0.5)]',
             text: 'text-slate-300/80',
             accent: 'bg-slate-400',
             glow: 'shadow-[0_0_15px_rgba(148,163,184,0.1)]',
             archiveBorder: 'border-slate-700',
             archiveText: 'text-slate-400'
        };
    }

    // Faction colors - Vivid Neon Styles
    switch(quest.alignment) {
        case 'Dark': return { 
            container: `${base} bg-indigo-950/50 border-indigo-500/40 hover:border-indigo-400 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]`,
            title: 'text-indigo-100 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]', text: 'text-indigo-200/80', accent: 'bg-indigo-500', glow: 'shadow-indigo-500/20',
            archiveBorder: 'border-indigo-900', archiveText: 'text-indigo-400'
        };
        case 'Light': return { 
            container: `${base} bg-amber-950/40 border-amber-400/40 hover:border-amber-200 hover:shadow-[0_0_25px_rgba(251,191,36,0.25)]`,
            title: 'text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]', text: 'text-amber-100/80', accent: 'bg-amber-400', glow: 'shadow-amber-500/20',
            archiveBorder: 'border-amber-900', archiveText: 'text-amber-400'
        };
        case 'NPC': return { 
            container: `${base} bg-red-950/40 border-red-500/40 hover:border-red-400 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]`,
            title: 'text-red-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]', text: 'text-red-200/80', accent: 'bg-red-500', glow: 'shadow-red-500/20',
            archiveBorder: 'border-red-900', archiveText: 'text-red-400'
        };
        case 'Player': return { 
            container: `${base} bg-cyan-950/40 border-cyan-400/40 hover:border-cyan-200 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)]`,
            title: 'text-cyan-50 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]', text: 'text-cyan-100/80', accent: 'bg-cyan-400', glow: 'shadow-cyan-500/20',
            archiveBorder: 'border-cyan-900', archiveText: 'text-cyan-400'
        };
        default: return { // Neutral
            container: `${base} bg-fuchsia-950/30 border-fuchsia-500/30 hover:border-fuchsia-300 hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]`,
            title: 'text-fuchsia-100 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]', text: 'text-fuchsia-200/80', accent: 'bg-fuchsia-400', glow: 'shadow-fuchsia-500/20',
            archiveBorder: 'border-fuchsia-900', archiveText: 'text-fuchsia-400'
        };
    }
};

const TYPE_LABELS = {
    [QuestType.PERSONAL]: 'Личный',
    [QuestType.FACTION]: 'Фракция',
    [QuestType.PUBLIC]: 'Публичный'
};

// --- Sub-Components ---

interface QuestCardProps {
    quest: Quest;
    onUpdateStatus: (id: string, status: QuestStatus) => void;
    onOpenAcceptModal: (id: string) => void;
    isAdmin: boolean;
    onEdit: (quest: Quest) => void;
    allCharacters: Character[];
}

const QuestCard = React.memo(({ quest, onUpdateStatus, onOpenAcceptModal, isAdmin, onEdit, allCharacters }: QuestCardProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    const isTaken = quest.status === QuestStatus.IN_PROGRESS;
    const style = getQuestStyles(quest);

    const handleClaim = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmState({
            isOpen: true,
            title: "Получить Награду",
            message: "Деяние действительно совершено? Бездна ждет завершения.",
            onConfirm: () => onUpdateStatus(quest.id, QuestStatus.COMPLETED)
        });
    };

    return (
        <div className="relative group perspective-1000 mb-4 isolate">
            <ConfirmationModal 
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({...confirmState, isOpen: false})}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />

            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative z-10 w-full cursor-pointer rounded-xl overflow-hidden
                    ${style.container} ${style.glow}
                    transform hover:-translate-y-1
                `}
            >
                {/* Magical Scanline effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-500"></div>
                
                {/* Header Section */}
                <div className="p-4 relative">
                     <div className="flex justify-between items-start gap-3">
                         {/* Title Container - Added min-w-0 for flex wrapping */}
                         <div className="flex-1 min-w-0">
                             {/* Quest Type Indicator */}
                             <div className="flex items-center gap-2 mb-1">
                                 <div className={`w-1.5 h-1.5 rounded-full ${style.accent} shadow-[0_0_5px_currentColor]`}></div>
                                 <span className={`text-[9px] uppercase tracking-[0.2em] font-bold ${style.text} opacity-70`}>
                                     {TYPE_LABELS[quest.type]}
                                 </span>
                             </div>
                             {/* Added break-words to fix overflow on long words */}
                             <h4 className={`font-fantasy font-bold text-lg leading-tight ${style.title} break-words`}>{quest.title}</h4>
                         </div>
                         
                         {/* Status / Pins */}
                         <div className="flex -space-x-2 shrink-0">
                             {isTaken ? (
                                 quest.details.acceptedBy.map((name, idx) => {
                                     const char = allCharacters.find(c => c.name === name);
                                     const avatar = char?.data?.identity?.avatar_url || char?.data?.avatar_url;
                                     
                                     return (
                                        <div 
                                            key={`${quest.id}-pin-${idx}`}
                                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-[9px] font-bold ring-2 ring-black/50 ${getPinColor(name, idx)} overflow-hidden bg-black`}
                                            title={name}
                                        >
                                             {avatar ? (
                                                 <img src={avatar} alt={name} className="w-full h-full object-cover" />
                                             ) : (
                                                 name.charAt(0)
                                             )}
                                        </div>
                                     );
                                 })
                             ) : (
                                 <div className={`w-6 h-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center animate-pulse`}>
                                     <Sparkles size={10} className={style.text} />
                                 </div>
                             )}
                         </div>
                     </div>

                     {isAdmin && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(quest); }}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Edit2 size={12} />
                        </button>
                     )}
                </div>

                {/* Expandable Content */}
                <div className={`
                    bg-black/40
                    transition-all duration-500 ease-in-out overflow-hidden
                    ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                    <div className="p-4 pt-0">
                        <div className={`h-px w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20 my-3 ${style.text}`} />
                        
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap font-sans ${style.text} break-words`}>{quest.description}</p>
                        
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 shrink-0">Награда</span>
                                <span className={`text-xs font-bold ${style.title} break-words`}>{quest.reward}</span>
                            </div>

                            {/* Accepted By List with Colors */}
                            {isTaken && quest.details.acceptedBy.length > 0 && (
                                <div className="border-t border-white/5 pt-2 mt-2">
                                     <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Приняли</span>
                                     <div className="flex flex-wrap gap-2">
                                         {quest.details.acceptedBy.map((name, idx) => {
                                             const char = allCharacters.find(c => c.name === name);
                                             const avatar = char?.data?.identity?.avatar_url || char?.data?.avatar_url;

                                             return (
                                                 <div key={idx} className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded border border-white/5 max-w-full">
                                                     <div className={`w-3 h-3 rounded-full ${getPinColor(name, idx)} shadow-[0_0_5px_currentColor] overflow-hidden bg-black shrink-0`}>
                                                        {avatar && <img src={avatar} alt={name} className="w-full h-full object-cover" />}
                                                     </div>
                                                     <span className={`text-xs font-medium ${style.text} truncate`}>{name}</span>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-end pt-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500">Заказчик</span>
                                    <span className={`text-xs italic ${style.text} truncate`}>{quest.details.givenBy}</span>
                                </div>
                                
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    {quest.status === QuestStatus.AVAILABLE && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onOpenAcceptModal(quest.id); }}
                                            className="bg-violet-600/80 hover:bg-violet-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.4)] hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all border border-violet-400/30 backdrop-blur-sm whitespace-nowrap"
                                        >
                                            Принять Судьбу
                                        </button>
                                    )}
                                    {quest.status === QuestStatus.IN_PROGRESS && (
                                        <button 
                                            onClick={handleClaim}
                                            className="bg-emerald-600/80 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all border border-emerald-400/30 backdrop-blur-sm flex items-center gap-1 whitespace-nowrap"
                                        >
                                            <CheckCircle size={12} /> Завершить
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Main Page Component ---

interface QuestBoardPageProps {
    isAdmin: boolean;
}

const QuestBoardPage: React.FC<QuestBoardPageProps> = ({ isAdmin }) => {
  const { quests, updateStatus, addQuest, acceptQuest, editQuest } = useQuests();
  const { characters } = useCharacters();
  
  // Mobile & Layout State
  const [activeColIndex, setActiveColIndex] = useState(1);
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  // Archive State
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  // Modal States
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null); 
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [acceptNames, setAcceptNames] = useState<string[]>(['']);
  const [isCharSelectorOpen, setIsCharSelectorOpen] = useState(false);

  // Form State
  const [formQuest, setFormQuest] = useState<Partial<Quest>>({
      type: QuestType.PUBLIC,
      status: QuestStatus.AVAILABLE,
      alignment: 'Neutral',
      details: { givenBy: '', acceptedBy: [] }
  });
  const [isPlayerGiver, setIsPlayerGiver] = useState(false); 

  // Filter out Graveyard/Dead characters
  const activeCharacters = useMemo(() => {
      return characters.filter(c => {
          const faction = c.data?.identity?.faction || c.faction || '';
          const name = c.name || '';
          // Filter Graveyard/Могильник
          if (['graveyard', 'могильник'].includes(faction.toLowerCase())) return false;
          // Extra safety check if name implies dead
          if (name.includes('Dead') || name.includes('(Dead)')) return false;
          return true;
      });
  }, [characters]);

  const groupedCharacters = useMemo<Record<string, Character[]>>(() => {
      const groups: Record<string, Character[]> = {};
      activeCharacters.forEach(c => {
          const f = c.data?.identity?.faction || c.faction || 'Uncommon';
          if (!groups[f]) groups[f] = [];
          groups[f].push(c);
      });
      return groups;
  }, [activeCharacters]);

  // --- Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const diffX = touchStartRef.current.x - e.changedTouches[0].clientX;
      const diffY = touchStartRef.current.y - e.changedTouches[0].clientY;
      if (Math.abs(diffX) > Math.abs(diffY)) {
          if (Math.abs(diffX) > 50) {
              if (diffX > 0) setActiveColIndex(prev => Math.min(prev + 1, columns.length - 1));
              else setActiveColIndex(prev => Math.max(prev - 1, 0));
          }
      }
      touchStartRef.current = null;
  };

  const handleUpdateStatus = useCallback((id: string, status: QuestStatus) => {
      updateStatus(id, status);
  }, [updateStatus]);

  const handleOpenAccept = useCallback((id: string) => {
      setSelectedQuestId(id);
      setAcceptNames(['']);
      setAcceptModalOpen(true);
  }, []);

  const handleEditClick = useCallback((quest: Quest) => {
      setEditingQuestId(quest.id);
      setFormQuest({ ...quest });
      const isChar = characters.some(c => c.name === quest.details.givenBy);
      setIsPlayerGiver(isChar);
      setIsPostModalOpen(true);
  }, [characters]);

  const handlePostSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(formQuest.title && formQuest.description && formQuest.details) {
          let finalQuest = { ...formQuest };
          
          if (formQuest.type === QuestType.PERSONAL) {
              finalQuest.status = QuestStatus.IN_PROGRESS;
              finalQuest.details = {
                  ...finalQuest.details,
                  acceptedBy: [finalQuest.details!.givenBy]
              };
          }

          if (editingQuestId) {
              editQuest(editingQuestId, finalQuest);
          } else {
              addQuest(finalQuest as Omit<Quest, 'id'>);
          }
          
          setIsPostModalOpen(false);
          setEditingQuestId(null);
          setFormQuest({
             type: QuestType.PUBLIC, 
             status: QuestStatus.AVAILABLE, 
             alignment: 'Neutral',
             details: { givenBy: '', acceptedBy: [] } 
          });
          setIsPlayerGiver(false);
      }
  };

  const handleAcceptSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const validNames = acceptNames.filter(n => n.trim() !== '');
      if(selectedQuestId && validNames.length > 0) {
          acceptQuest(selectedQuestId, validNames);
          setAcceptModalOpen(false);
      }
  };

  const handleRosterConfirm = (names: string[]) => {
      const current = new Set(acceptNames.filter(n => n.trim() !== ''));
      names.forEach(n => current.add(n));
      const combined = Array.from(current);
      if(combined.length === 0) combined.push('');
      setAcceptNames(combined);
  };

  const columns = useMemo(() => [
      { title: 'Личные', type: QuestType.PERSONAL, color: 'text-emerald-300', bg: 'bg-emerald-900/10' },
      { title: 'Фракционные', type: QuestType.FACTION, color: 'text-indigo-300', bg: 'bg-indigo-900/10' },
      { title: 'Публичные', type: QuestType.PUBLIC, color: 'text-slate-300', bg: 'bg-slate-900/10' }
  ], []);

  const completedQuests = useMemo(() => quests.filter(q => q.status === QuestStatus.COMPLETED), [quests]);

  return (
    <div 
        className="h-full flex flex-col overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
       <CharacterSelector 
          isOpen={isCharSelectorOpen} 
          onClose={() => setIsCharSelectorOpen(false)} 
          onConfirm={handleRosterConfirm}
          alreadySelected={acceptNames}
       />

       {/* Unified Header */}
       <div className="bg-slate-900/90 backdrop-blur-md border-b border-violet-500/20 p-3 sticky top-0 z-20 flex flex-wrap gap-3 justify-between items-center shadow-lg shrink-0 min-h-[3.5rem]">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-fantasy text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 flex items-center gap-2 drop-shadow-sm shrink-0">
                    <Shield className="text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" size={20} /> Доска Заданий
                </h2>
                
                {/* Divider & Context */}
                <div className="hidden min-[1150px]:block h-5 w-px bg-white/10"></div>
                <div className="hidden min-[1150px]:flex items-center text-xs text-slate-400 font-fantasy tracking-wide">
                    <span>Активные Контракты</span>
                </div>
            </div>

            {/* Mobile Dots (Using arbitrary value 1150px to switch to desktop view) */}
            <div className="flex min-[1150px]:hidden gap-1.5 mx-auto">
               {columns.map((_, idx) => (
                   <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activeColIndex ? 'bg-violet-400 scale-125 shadow-[0_0_8px_rgba(167,139,250,0.8)]' : 'bg-slate-700'}`} />
               ))}
            </div>

            {isAdmin && (
                <button onClick={() => { 
                    setEditingQuestId(null); 
                    setFormQuest({type: QuestType.PUBLIC, status: QuestStatus.AVAILABLE, alignment: 'Neutral', details: {givenBy: '', acceptedBy: []}}); 
                    setIsPostModalOpen(true); 
                }} className="ml-auto group relative bg-violet-900/40 hover:bg-violet-800/60 text-violet-100 border border-violet-500/50 px-3 py-1.5 rounded-lg font-fantasy flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] overflow-hidden text-xs md:text-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-400/20 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <Plus size={16} className="relative z-10" /> <span className="hidden sm:inline relative z-10">Создать Квест</span>
                </button>
            )}
       </div>

       {/* Board Container */}
       <div className="flex-1 overflow-hidden relative flex flex-col z-10 bg-black/40 backdrop-blur-sm m-4 rounded-xl border border-slate-700/50 shadow-2xl">
            {/* Background Grid FX */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                 style={{ 
                    backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                 }}>
            </div>
            
            <div className="flex-1 flex w-full relative z-10 h-full">
                {columns.map((col, index) => (
                    <div key={col.type} className={`flex-1 h-full flex-col border-r border-slate-700/30 ${col.bg} transition-opacity duration-300 ${index === activeColIndex ? 'flex' : 'hidden min-[1150px]:flex'}`}>
                        {/* Column Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-center relative">
                            <button onClick={() => setActiveColIndex(Math.max(0, index - 1))} className={`min-[1150px]:hidden absolute left-2 text-slate-500 ${index === 0 ? 'opacity-0 pointer-events-none' : ''}`}><ChevronLeft /></button>
                            <h3 className={`text-center font-fantasy ${col.color} text-lg uppercase tracking-[0.2em] drop-shadow-[0_0_8px_currentColor]`}>{col.title}</h3>
                            <button onClick={() => setActiveColIndex(Math.min(2, index + 1))} className={`min-[1150px]:hidden absolute right-2 text-slate-500 ${index === 2 ? 'opacity-0 pointer-events-none' : ''}`}><ChevronRight /></button>
                            
                            {/* Magic Glow Line */}
                            <div className={`absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${col.color}`}></div>
                        </div>

                        {/* Quest List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                             {quests.filter(q => q.type === col.type && q.status !== QuestStatus.COMPLETED).map(q => (
                                 <QuestCard 
                                    key={q.id} 
                                    quest={q} 
                                    onUpdateStatus={handleUpdateStatus}
                                    onOpenAcceptModal={handleOpenAccept}
                                    isAdmin={isAdmin}
                                    onEdit={handleEditClick}
                                    allCharacters={characters}
                                 />
                             ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Archive Floating Button */}
            <button 
                onClick={() => setIsArchiveOpen(true)}
                className="absolute bottom-6 right-6 z-30 group"
                title="Открыть Архив Бездны"
            >
                <div className="relative w-14 h-14 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute inset-0 bg-violet-900/20 group-hover:bg-violet-600/30 transition-colors"></div>
                    <CheckCircle className="text-emerald-500 group-hover:text-emerald-300 transition-colors relative z-10" size={24} />
                    {/* Glow Pulse */}
                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10"></div>
                </div>
            </button>
       </div>

       {/* --- Modals --- */}
       
       {/* Archive Modal (Void) - UPDATED SIZE and ANIMATION */}
       <Modal 
            isOpen={isArchiveOpen} 
            onClose={() => setIsArchiveOpen(false)} 
            title="Бездна" 
            zIndex="z-50"
            size="xl" 
            customBg="bg-[#050b14]/98 border-violet-900/50 shadow-[0_0_60px_rgba(109,40,217,0.3)] backdrop-blur-xl animate-void origin-center"
       >
            <div className="text-center mb-6 pb-2 relative overflow-hidden rounded-lg p-2">
                 {/* Stars/Noise BG for header */}
                 <div className="absolute inset-0 opacity-40" style={{backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
                 <div className="relative z-10 font-fantasy text-slate-500 text-sm">Завершенные контракты, вернувшиеся из бездны...</div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {completedQuests.length === 0 ? (
                    <div className="text-center py-12 text-violet-900/50 font-fantasy text-sm">Бездна смотрит в ответ... здесь пусто.</div>
                ) : (
                    completedQuests.map(q => {
                        const style = getQuestStyles(q);
                        const isExpanded = expandedArchiveId === q.id;
                        
                        return (
                        <div 
                            key={q.id} 
                            onClick={() => setExpandedArchiveId(isExpanded ? null : q.id)}
                            className={`group relative bg-black/40 border p-4 rounded-lg flex flex-col gap-2 transition-all cursor-pointer hover:bg-white/5 ${style.archiveBorder || 'border-slate-800'}`}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <span className={`font-fantasy font-bold text-lg decoration-violet-800 decoration-1 transition-colors ${style.archiveText || 'text-slate-400'} group-hover:brightness-125`}>{q.title}</span>
                                <div className="flex items-center gap-2">
                                     <span className={`text-[9px] bg-black border border-white/10 px-2 py-0.5 rounded tracking-widest uppercase ${style.archiveText}`}>{TYPE_LABELS[q.type]}</span>
                                     <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-white/10 animate-fadeIn space-y-2">
                                    <p className="text-sm text-slate-400 font-serif leading-relaxed italic">{q.description}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>Награда: <span className="text-slate-300">{q.reward}</span></span>
                                        <span>От: {q.details.givenBy}</span>
                                    </div>
                                </div>
                            )}
                            
                            {!isExpanded && (
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                                    <div className="flex -space-x-2">
                                        {q.details.acceptedBy.map((n, i) => (
                                            <div key={i} className={`w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-300 ring-1 ring-slate-800 bg-slate-800`} title={n}>
                                                {n.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-600 uppercase tracking-widest group-hover:text-slate-500 transition-colors">Исполнено</span>
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
       </Modal>

       <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title={editingQuestId ? "Перековать Квест" : "Сотворить Квест"}>
            <form onSubmit={handlePostSubmit} className="space-y-4">
                <MagicalInput required placeholder="Название Квеста" 
                    value={formQuest.title || ''} onChange={e => setFormQuest({...formQuest, title: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                         <label className="text-xs text-slate-400">Сфера (Тип)</label>
                         <MagicalSelect
                            value={formQuest.type} onChange={e => setFormQuest({...formQuest, type: e.target.value as QuestType})}>
                            <option value={QuestType.PERSONAL}>Личный</option>
                            <option value={QuestType.FACTION}>Фракционный</option>
                            <option value={QuestType.PUBLIC}>Публичный</option>
                        </MagicalSelect>
                    </div>
                    {formQuest.type === QuestType.FACTION && (
                        <div className="space-y-1 animate-fadeIn">
                            <label className="text-xs text-slate-400">Аура (Мировоззрение)</label>
                            <MagicalSelect
                                value={formQuest.alignment} onChange={e => setFormQuest({...formQuest, alignment: e.target.value as QuestAlignment})}>
                                <option value="Neutral">Нейтральный (Фиолетовый)</option>
                                <option value="Dark">Тьма (Индиго)</option>
                                <option value="Light">Свет (Золотой)</option>
                                <option value="NPC">Кровь (Красный)</option>
                                <option value="Player">Дух (Голубой)</option>
                            </MagicalSelect>
                        </div>
                    )}
                </div>
                
                <MagicalInput required placeholder="Награда" 
                    value={formQuest.reward || ''} onChange={e => setFormQuest({...formQuest, reward: e.target.value})} />

                <div className="space-y-1 bg-slate-900/30 p-2 rounded border border-slate-800/50">
                     <label className="text-xs text-slate-400 block mb-1">
                         {formQuest.type === QuestType.PERSONAL ? "Привязано к Душе" : "Происхождение / Покровитель"}
                     </label>
                     
                     {formQuest.type !== QuestType.PERSONAL && (
                         <div className="mb-4">
                             <RuneCheckbox 
                                label="Известный Искатель?" 
                                checked={isPlayerGiver} 
                                onChange={v => setIsPlayerGiver(v)} 
                             />
                         </div>
                     )}

                     {(formQuest.type === QuestType.PERSONAL || isPlayerGiver) ? (
                         <MagicalSelect 
                            required 
                            value={formQuest.details?.givenBy || ''}
                            onChange={e => setFormQuest({...formQuest, details: {...formQuest.details!, givenBy: e.target.value}})}
                         >
                             <option value="" disabled>Выберите Душу...</option>
                             {Object.entries(groupedCharacters).map(([faction, chars]) => (
                                 <optgroup key={faction} label={faction}>
                                     {(chars as Character[]).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                 </optgroup>
                             ))}
                         </MagicalSelect>
                     ) : (
                         <MagicalInput required 
                            placeholder="Имя Сущности" 
                            value={formQuest.details?.givenBy || ''} onChange={e => setFormQuest({...formQuest, details: {...formQuest.details!, givenBy: e.target.value}})} />
                     )}
                </div>

                <MagicalTextArea required placeholder="Детали пакта..." rows={3} 
                    value={formQuest.description || ''} onChange={e => setFormQuest({...formQuest, description: e.target.value})} />

                <button type="submit" className="w-full mt-4 group relative px-6 py-3 bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] text-violet-100 font-fantasy tracking-[0.2em] uppercase hover:bg-violet-900/40 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all duration-300 overflow-hidden">
                    <span className="relative z-10">{editingQuestId ? "Изменить Реальность" : "Воплотить"}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
            </form>
       </Modal>

       <Modal isOpen={acceptModalOpen} onClose={() => setAcceptModalOpen(false)} title="Связать Судьбы">
           <form onSubmit={handleAcceptSubmit} className="space-y-4">
               <div className="bg-slate-800/50 p-3 rounded text-sm text-slate-300 italic mb-4 border border-slate-700">"Плетение связывает тех, кто принимает зов..."</div>
               
               <div className="flex justify-between items-center mb-2">
                   <label className="text-xs text-slate-400 uppercase tracking-widest font-bold">Участники</label>
                   <button 
                      type="button" 
                      onClick={() => setIsCharSelectorOpen(true)}
                      className="text-xs flex items-center gap-1 bg-violet-900/20 text-violet-300 px-2 py-1 rounded hover:bg-violet-900/40 transition-colors border border-violet-500/30"
                   >
                       <BookOpen size={12} /> Список
                   </button>
               </div>

               <div className="space-y-2 max-h-60 overflow-y-auto">
                   {acceptNames.map((name, index) => (
                       <div key={index} className="relative group">
                           <MagicalInput 
                               autoFocus={index === acceptNames.length - 1} 
                               placeholder={`Душа ${index + 1}`} 
                               className="pr-8"
                               value={name} 
                               onChange={(e) => { const newNames = [...acceptNames]; newNames[index] = e.target.value; setAcceptNames(newNames); }} 
                           />
                           
                           {acceptNames.length > 1 && (
                               <button 
                                  type="button" 
                                  onClick={() => setAcceptNames(acceptNames.filter((_, i) => i !== index))} 
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-500 p-1"
                               >
                                   <X size={14} />
                               </button>
                           )}
                       </div>
                   ))}
               </div>
               
               <button type="button" onClick={() => setAcceptNames([...acceptNames, ''])} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                   <Plus size={14} /> Добавить участника
               </button>

               <button type="submit" className="w-full mt-4 group relative px-6 py-3 bg-slate-900 border-2 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)] text-violet-100 font-fantasy tracking-[0.2em] uppercase hover:bg-violet-900/40 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all duration-300 overflow-hidden">
                  <span className="relative z-10">Скрепить Пакт</span>
               </button>
           </form>
       </Modal>
    </div>
  );
};

export default QuestBoardPage;
