
import React, { useState, useEffect } from 'react';
import { CharacterData, Faction } from '../types';
import { NPC_VOLUMES } from '../constants';
import { Button } from './Shared';
import { User as UserIcon, Skull, Sun, Moon, Ghost, Plus, ShieldCheck, Sword, Wand2, Crown, Link as LinkIcon, Terminal, Settings, ChevronLeft, ChevronRight, Activity, ChevronDown, Calendar } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';
import { useUI } from '../context/UIContext';

interface Props {
  characters: CharacterData[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onOpenSettings?: () => void;
  onOpenTraining?: () => void;
}

const Roster: React.FC<Props> = ({ characters, onSelect, onCreate, onOpenSettings, onOpenTraining }) => {
  const { isAdmin } = useAuth();
  /* [DIALECT] */ const { t, handleLetterClick, handleSlashClick, isInputMode, inputBuffer, isDialectUnlocked, isBloodMode, trackTabChange } = useDialect();
  const { showAlert } = useUI();
  
  // Lazy initialize state from LocalStorage
  const [activeTab, setActiveTab] = useState<Faction>(() => {
      return (localStorage.getItem('roster_active_tab') as Faction) || Faction.LIGHT;
  });
  
  const [npcVolume, setNpcVolume] = useState<string>(() => {
      return localStorage.getItem('roster_npc_volume') || NPC_VOLUMES[0];
  });
  
  // Track tabs for secrets & persistence
  const handleTabChange = (faction: Faction) => {
      setActiveTab(faction);
      trackTabChange(faction);
      localStorage.setItem('roster_active_tab', faction);
  };

  const handleNpcVolumeChange = (vol: string) => {
      setNpcVolume(vol);
      localStorage.setItem('roster_npc_volume', vol);
  };

  // Tab ordering for navigation
  const tabs = [Faction.LIGHT, Faction.DARK, Faction.GRAVEYARD, Faction.NPC];
  
  const handleNextTab = () => {
      const idx = tabs.indexOf(activeTab);
      handleTabChange(tabs[(idx + 1) % tabs.length]);
  };

  const handlePrevTab = () => {
      const idx = tabs.indexOf(activeTab);
      handleTabChange(tabs[(idx - 1 + tabs.length) % tabs.length]);
  };

  const filtered = characters.filter(c => {
    if (!c.profile) return false;
    
    const isCompanion = c.profile.faction === Faction.NPC && c.profile.npc_volume === "Спутники и Рабы";
    if (c.meta.master_id && !isCompanion) return false;
    
    if (c.profile.faction !== activeTab) return false;
    if (activeTab === Faction.NPC && c.profile.npc_volume !== npcVolume) return false;
    return true;
  });

  // --- Theme Logic ---
  const getTheme = (f: Faction) => {
    // Blood Mode Override
    if (isBloodMode) {
        return {
            tab: "text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse",
            border: "border-red-600/60",
            glow: "shadow-[0_0_30px_rgba(220,38,38,0.3)]",
            bg: "bg-red-950/40",
            text: "text-red-200",
            glowColor: "from-red-900/30"
        };
    }

    switch (f) {
      case Faction.LIGHT: 
        return {
          tab: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]",
          border: "border-amber-500/30",
          glow: "shadow-[0_0_20px_rgba(251,191,36,0.1)]",
          bg: "bg-amber-950/20",
          text: "text-amber-100",
          // BRIGHTER LIGHT AMBIENCE
          glowColor: "from-amber-200/15" 
        };
      case Faction.DARK: 
        return {
          tab: "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]",
          border: "border-violet-500/40",
          glow: "shadow-[0_0_20px_rgba(139,92,246,0.2)]",
          bg: "bg-violet-950/30",
          text: "text-violet-100",
          glowColor: "from-violet-900/20"
        };
      case Faction.NPC: 
        return {
          tab: "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]",
          border: "border-red-500/30",
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
          bg: "bg-red-950/20",
          text: "text-red-100",
          glowColor: "from-red-900/20"
        };
      case Faction.GRAVEYARD: 
        return {
          tab: "text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.5)]",
          border: "border-slate-500/30",
          glow: "shadow-[0_0_10px_rgba(148,163,184,0.1)]",
          bg: "bg-slate-900/20",
          text: "text-slate-300",
          glowColor: "from-slate-800/30"
        };
      default: 
        return { tab: "", border: "border-slate-700", glow: "", bg: "", text: "", glowColor: "from-slate-900/10" };
    }
  };

  const theme = getTheme(activeTab);

  const getVolumeLabel = (vol: string) => {
    if (vol.startsWith("Том 1")) return t('vol_1', vol);
    if (vol.startsWith("Том 2")) return t('vol_2', vol);
    if (vol.startsWith("Том 3")) return t('vol_3', vol);
    if (vol.startsWith("Том 4")) return t('vol_4', vol);
    if (vol.startsWith("Том 5")) return t('vol_5', vol);
    if (vol.startsWith("Том 6")) return t('vol_6', vol);
    if (vol === "Спутники и Рабы") return t('vol_servants', vol);
    if (vol === "Отрицательные NPC") return t('vol_neg', vol);
    if (vol === "Положительные NPC") return t('vol_pos', vol);
    return vol;
  };

  const getLabelKey = (faction: Faction) => 
      faction === Faction.LIGHT ? 'fac_light' : 
      faction === Faction.DARK ? 'fac_dark' :
      faction === Faction.NPC ? 'fac_npc' : 'fac_graveyard';

  const TabButton = ({ faction, icon: Icon }: { faction: Faction, icon: any }) => {
    const isActive = activeTab === faction;
    const labelKey = getLabelKey(faction);
    const localTheme = getTheme(faction);
    
    return (
      <button
        onClick={() => handleTabChange(faction)}
        className={`relative flex items-center gap-2 px-6 py-3 font-serif font-bold uppercase tracking-widest text-[10px] md:text-xs transition-all whitespace-nowrap flex-shrink-0 ${
          isActive ? `${localTheme.tab} bg-white/5` : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
        }`}
      >
        <Icon size={16} className={isBloodMode ? "text-red-500" : ""} />
        {t(labelKey, faction)}
        {isActive && (
           <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-current shadow-[0_0_10px_currentColor]`}></div>
        )}
      </button>
    );
  };

  const renderInteractiveTitle = (text: string) => {
    return text.split('').map((char, i) => (
      <span 
        key={i} 
        onClick={(e) => {
           e.stopPropagation();
           handleLetterClick(char);
        }}
        className={`transition-colors cursor-pointer select-none active:scale-90 inline-block ${isBloodMode ? 'hover:text-red-500' : 'hover:text-violet-400'}`}
      >
        {char}
      </span>
    ));
  };

  // Main Background Image
  const rosterBg = "https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/character-roster-bg.jpg"; 

  return (
    <div className={`relative flex flex-col w-full h-[calc(100dvh-3rem)] md:h-[100dvh] overflow-hidden bg-transparent transition-all duration-1000 ${isBloodMode ? 'grayscale-[0.2] sepia-[0.3] hue-rotate-[-30deg]' : ''}`}>
      
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 z-0 pointer-events-none mix-blend-screen"
        style={{ 
            backgroundImage: `url(${rosterBg})`,
            filter: 'contrast(1.2) brightness(0.6)' 
        }} 
      ></div>
      
      {/* Dark Overlay Gradient to ensure text legibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-950 pointer-events-none z-0"></div>

      {/* DYNAMIC ATMOSPHERIC LIGHTING LAYERS */}
      {/* Top ambient glow based on faction */}
      <div className={`fixed top-0 left-0 right-0 h-32 bg-gradient-to-b ${theme.glowColor} to-transparent pointer-events-none z-0 transition-all duration-700`}></div>
      {/* Bottom ambient glow based on faction */}
      <div className={`fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t ${theme.glowColor} to-transparent pointer-events-none z-0 transition-all duration-700`}></div>

      {/* Scrollable Content Layer */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-12 pt-4 md:pt-8 pb-32 w-full relative z-10">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className={`text-4xl md:text-6xl font-gothic font-normal text-transparent bg-clip-text bg-gradient-to-r tracking-[0.05em] uppercase flex items-center gap-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${isBloodMode ? 'from-red-300 via-red-100 to-red-500' : 'from-slate-200 via-white to-slate-400'}`}>
                        <div className="flex items-center gap-2">
                            <span className="flex">{renderInteractiveTitle(t('app_title_1', 'Летопись'))}</span> 
                            <span 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSlashClick();
                            }}
                            className={`px-1 rounded-sm ${isBloodMode ? 'text-red-600' : 'text-violet-500'} cursor-pointer hover:brightness-150 transition-colors select-none active:scale-90 inline-block`}
                            >
                            //
                            </span> 
                            <span className="flex">{renderInteractiveTitle(t('app_title_2', 'Душ'))}</span>
                        </div>
                    </h1>
                    <p className={`font-sans text-sm mt-2 max-w-xl ${isBloodMode ? 'text-red-400/70' : 'text-slate-500'}`}>
                       Реестр сущностей, героев и монстров. Управление характеристиками и судьбами.
                    </p>
                </div>
                
                {/* Actions Panel */}
                <div className="flex items-center gap-3">
                    {/* Public Training Log Button */}
                    {onOpenTraining && (
                        <Button onClick={onOpenTraining} size="sm" variant="ghost" className="text-slate-400 hover:text-white border border-slate-700/50">
                            <Calendar size={16} /> Журнал Тренировок
                        </Button>
                    )}

                    {/* Admin Only Buttons */}
                    {isAdmin && (
                        <>
                            {onOpenSettings && (
                            <Button onClick={onOpenSettings} size="sm" variant="ghost" className="text-slate-400 hover:text-white border border-slate-700/50">
                                <Settings size={16} />
                            </Button>
                            )}

                            <Button onClick={onCreate} size="sm" className="bg-violet-600/80 border-violet-500 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                            {/* [DIALECT] */}
                            <Plus size={14} /> {t('btn_new', 'Новый')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs - Desktop */}
            <div className="hidden md:flex border-b border-white/5 mb-8">
                <TabButton faction={Faction.LIGHT} icon={Sun} />
                <TabButton faction={Faction.DARK} icon={Moon} />
                <TabButton faction={Faction.GRAVEYARD} icon={Skull} />
                <TabButton faction={Faction.NPC} icon={Ghost} />
            </div>

            {/* Tabs - Mobile */}
            <div className="md:hidden flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <button onClick={handlePrevTab} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className={`font-serif font-bold uppercase tracking-widest text-lg ${theme.tab}`}>
                    {t(getLabelKey(activeTab), activeTab)}
                </div>
                <button onClick={handleNextTab} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[500px]">
                
                {activeTab === Faction.NPC && (
                <div className="mb-6">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block tracking-widest font-serif">{t('lbl_npc_vol', "Архив Бестиария")}</label>
                    <div className="relative max-w-md">
                        <select 
                        value={npcVolume} 
                        onChange={(e) => handleNpcVolumeChange(e.target.value)}
                        className={`bg-slate-900/50 border text-slate-200 text-sm rounded-lg w-full p-3 outline-none appearance-none font-sans ${isBloodMode ? 'border-red-900/50 focus:border-red-500' : 'border-slate-700 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]'}`}
                        >
                        {NPC_VOLUMES.map(v => <option key={v} value={v}>{getVolumeLabel(v)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filtered.map(char => (
                    <div 
                        key={char.id} 
                        onClick={() => onSelect(char.id)}
                        className={`
                            group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300
                            bg-slate-900/40 backdrop-blur-md border border-white/5 hover:-translate-y-1
                            ${theme.border} ${theme.glow}
                        `}
                    >
                        {/* Card Background Glow */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${theme.bg} to-transparent pointer-events-none`}></div>

                        <div className="p-4 relative z-10 flex flex-col h-full gap-3">
                            
                            {/* Header: Avatar & Name */}
                            <div className="flex items-start gap-3">
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/10 overflow-hidden flex items-center justify-center group-hover:border-white/30 transition-colors">
                                        {char.meta.avatar_url ? (
                                            <img src={char.meta.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-slate-600" />
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 bg-black text-white text-[9px] font-bold px-1.5 rounded border ${isBloodMode ? 'border-red-900' : 'border-white/20'}`}>
                                        {char.profile.level}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-fantasy font-bold text-lg leading-tight truncate ${theme.text} group-hover:text-white transition-colors`}>
                                        {char.profile.name}
                                    </h3>
                                    
                                    {/* Subtext: Save Status */}
                                    <div className="flex items-center gap-2 mt-1">
                                        {char.profile.faction === Faction.GRAVEYARD ? (
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                                <Skull size={10} /> {char.meta.save_status_reason || t('meta_death_unknown', "Почил")}
                                            </span>
                                        ) : char.meta.save_status ? (
                                            <span className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${isBloodMode ? 'text-red-400' : 'text-emerald-500/80'}`}>
                                                <ShieldCheck size={10} /> {t('meta_save_ok', 'Сейв есть')}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-red-500/80 uppercase tracking-wide flex items-center gap-1">
                                                <Skull size={10} /> {t('meta_save_lost', 'Без сейва')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Master Link */}
                            {char.meta.master_id && char.profile.faction === Faction.NPC && (
                                <div className="text-[10px] bg-white/5 rounded px-2 py-1 text-violet-300 border border-violet-500/20 flex items-center gap-2">
                                    <LinkIcon size={10} /> 
                                    <span>{t('lbl_linked', 'Связан узами')}</span>
                                </div>
                            )}

                            {/* Stats Grid - Minimalist */}
                            <div className="grid grid-cols-3 gap-1 mt-auto pt-2 border-t border-white/5">
                                <div className="flex flex-col items-center p-1 bg-black/20 rounded">
                                    <Sword size={10} className="text-red-400 mb-0.5" />
                                    <span className="text-xs font-mono font-bold text-slate-300">{char.stats.phys}</span>
                                </div>
                                <div className="flex flex-col items-center p-1 bg-black/20 rounded">
                                    <Wand2 size={10} className="text-blue-400 mb-0.5" />
                                    <span className="text-xs font-mono font-bold text-slate-300">{char.stats.magic}</span>
                                </div>
                                <div className="flex flex-col items-center p-1 bg-black/20 rounded">
                                    <Crown size={10} className="text-purple-400 mb-0.5" />
                                    <span className="text-xs font-mono font-bold text-slate-300">{char.stats.unique}</span>
                                </div>
                            </div>
                            
                            {/* Equipment Line */}
                            <div className="text-[9px] text-slate-500 truncate h-4">
                                {char.equipment.wearable.filter(w => w.is_equipped).map(w => w.name).join(", ") || ""}
                            </div>
                        </div>
                    </div>
                ))}
                
                {filtered.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                        <Ghost size={48} className="mb-4 opacity-20"/>
                        <span className="text-sm font-bold uppercase tracking-widest font-serif">{t('msg_empty', 'Лишь ветер гуляет')}</span>
                    </div>
                )}
                </div>
            </div>
      </div>

      {/* [DIALECT] Easter Egg Input Window */}
      {isInputMode && (
          <div className="fixed inset-0 md:absolute md:inset-auto md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:bottom-8 z-[100] animate-fadeIn flex items-center justify-center pointer-events-none p-4">
              <div className="bg-black/95 border border-violet-900 rounded-lg p-4 shadow-[0_0_40px_rgba(139,92,246,0.4)] backdrop-blur-md pointer-events-auto w-full max-w-sm relative">
                <div className="flex items-center gap-2 mb-2 justify-between">
                  <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-violet-500 animate-pulse"/>
                      <span className="text-[10px] font-mono text-violet-300 uppercase tracking-widest">Input Sequence</span>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded p-3 min-h-[3rem] flex items-center justify-center overflow-hidden">
                    <span className="font-serif text-sm md:text-base text-violet-400 tracking-[0.1em] md:tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(167,139,250,0.8)] break-all text-center">
                      {inputBuffer || <span className="opacity-20">_ _ _ _ _ _</span>}
                    </span>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Tap title letters & slashes</span>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Roster;
