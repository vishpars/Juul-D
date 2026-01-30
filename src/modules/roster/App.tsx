
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_CHARACTER, DEFAULT_INJURIES, DEFAULT_TIME_UNITS } from './constants';
import { CharacterData, InjuryDefinition, TimeUnit, Faction } from './types';
import * as SupabaseService from './utils/supabaseService';
import Roster from './components/Roster';
import SheetHeader from './components/SheetHeader';
import TabEquipment from './components/TabEquipment';
import TabAbilities from './components/TabAbilities';
import TabPassives from './components/TabPassives';
import TabDebuffs from './components/TabDebuffs';
import TabUnits from './components/TabUnits';
import TabMedCard from './components/TabMedCard';
import GlobalSettingsModal from './components/GlobalSettingsModal';
import { TagHintsModal } from './components/TagHintsModal';
import { Button } from './components/Shared';
import { Save, ChevronLeft, ChevronRight, Edit3, Trash2, RotateCcw, Settings, BookOpen, Calculator, ScrollText, Loader2, Tag } from 'lucide-react';
import { DialectProvider, useDialect } from './dialect_module/DialectContext';
import { UIProvider, useUI } from './context/UIContext';
import { TrainingPage } from './pages/TrainingPage';
import { useAuth } from '../../context/AuthContext';

export type DisplayMode = 'lore' | 'mech';

interface RosterModuleProps {
  isAdmin?: boolean;
}

const RosterContent: React.FC<RosterModuleProps> = ({ isAdmin = false }) => {
  const { toggleDialect, isOldSlavonic, isDialectUnlocked, t } = useDialect();
  const { showAlert, showConfirm } = useUI();
  const { user } = useAuth(); // Get current logged-in user
  
  // App State
  // View can now be 'training' as well
  const [view, setView] = useState<'roster' | 'sheet' | 'training'>('roster');
  
  // --- SPLIT STATE FOR PERFORMANCE ---
  // `characters` holds the master state, updated on every keystroke in Sheet.
  // `rosterList` holds the snapshot for the sidebar list, updated only on Save/Init/Create/Delete.
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [rosterList, setRosterList] = useState<CharacterData[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [charStack, setCharStack] = useState<string[]>([]);
  
  // Sheet State
  const [displayMode, setDisplayMode] = useState<DisplayMode>('lore');
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipment' | 'abilities' | 'passives' | 'debuffs' | 'units' | 'medcard'>('equipment');
  
  // Global Configs
  const [triggersMap, setTriggersMap] = useState<Record<string, string>>({});
  const [injuryDefinitions, setInjuryDefinitions] = useState<InjuryDefinition[]>(DEFAULT_INJURIES);
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>(DEFAULT_TIME_UNITS);
  
  // Admin UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTagHintsOpen, setIsTagHintsOpen] = useState(false);

  const SHEET_TABS = useMemo(() => [
    { id: 'equipment', label: t('tab_eq', 'Снаряжение') },
    { id: 'abilities', label: t('tab_ab', 'Способности') },
    { id: 'passives', label: t('tab_ps', 'Пассивки') },
    { id: 'debuffs', label: t('tab_db', 'Дебаффы') },
    { id: 'units', label: t('tab_un', 'Юниты') },
    { id: 'medcard', label: t('tab_mc', 'Мед.Карта') },
  ], [t]);

  const initRef = useRef(false);

  // Fetch Data
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      setIsLoadingData(true);
      try {
        const [chars, trigs, inj, units] = await Promise.all([
          SupabaseService.getAllCharacters(),
          SupabaseService.getGlobalTriggers(),
          SupabaseService.getInjuries(),
          SupabaseService.getTimeUnits()
        ]);
        setCharacters(chars);
        setRosterList(chars); // Init roster list
        setTriggersMap(trigs);
        setInjuryDefinitions(inj);
        setTimeUnits(units);
      } catch (e) {
        console.error("Failed to init app", e);
      } finally {
        setIsLoadingData(false);
      }
    };
    init();
  }, []);

  const handleCreate = async () => {
    const newChar: CharacterData = JSON.parse(JSON.stringify(INITIAL_CHARACTER));
    newChar.id = crypto.randomUUID();
    newChar.profile.name = "Новая Душа";
    // Set current user as owner if not admin creating system char (optional, usually admin creates)
    if (user && !isAdmin) {
        newChar.meta.uid = user.id;
    }
    
    // Optimistic UI
    const updated = [...characters, newChar];
    setCharacters(updated);
    setRosterList(updated); // Update list immediately on creation
    
    try {
      await SupabaseService.saveCharacter(newChar, isAdmin);
      setActiveCharId(newChar.id);
      setCharStack([newChar.id]);
      setView('sheet');
      setIsEditMode(true);
    } catch (e) {
      showAlert("Ошибка создания: " + e, "Сбой базы данных");
      const reverted = characters.filter(c => c.id !== newChar.id);
      setCharacters(reverted);
      setRosterList(reverted);
    }
  };
  
  const handleSelect = (id: string) => {
    // When selecting a new char, we ensure we have the latest data from our master list
    setActiveCharId(id);
    setCharStack([id]);
    setView('sheet');
    setIsEditMode(false);
    window.scrollTo(0,0);
  };
  
  const handleNavigateToUnit = (unitId: string) => {
    setCharStack(prev => [...prev, unitId]);
    setActiveCharId(unitId);
    window.scrollTo(0,0);
  };

  const handleBack = () => {
    if (charStack.length > 1) {
      const newStack = [...charStack];
      newStack.pop();
      setCharStack(newStack);
      setActiveCharId(newStack[newStack.length - 1]);
    } else {
      setView('roster');
      setActiveCharId(null);
      setCharStack([]);
      // On return to roster, sync list to ensure any saved changes are reflected
      // But actually, we only update rosterList on Save, so it should be fine.
      // If user cancels edits, characters state might need revert? 
      // For now, we assume simple state model: edits are kept in memory until discarded or saved.
    }
  };

  const handleNextTab = () => {
      const idx = SHEET_TABS.findIndex(t => t.id === activeTab);
      const nextId = SHEET_TABS[(idx + 1) % SHEET_TABS.length].id;
      setActiveTab(nextId as any);
  };

  const handlePrevTab = () => {
      const idx = SHEET_TABS.findIndex(t => t.id === activeTab);
      const prevId = SHEET_TABS[(idx - 1 + SHEET_TABS.length) % SHEET_TABS.length].id;
      setActiveTab(prevId as any);
  };

  const activeChar = characters.find(c => c.id === activeCharId);

  // Permission Logic
  const isOwner = user && activeChar && activeChar.meta.uid === user.id;
  const canEdit = isAdmin || isOwner;

  const updateActiveChar = (updates: Partial<CharacterData>) => {
    if (!activeChar) return;
    const updated = { ...activeChar, ...updates };
    setCharacters(prev => prev.map(c => c.id === activeChar.id ? updated : c));
    // NOTE: We do NOT update `rosterList` here to avoid sidebar re-renders/jitters
  };

  const handleSave = async () => {
    if (!activeChar) return;
    try {
      // Pass isAdmin flag to handle "Prime" backup logic
      await SupabaseService.saveCharacter(activeChar, isAdmin);
      setIsEditMode(false);
      // Sync Roster List on Save
      setRosterList(characters);
    } catch (e) {
      showAlert("Ошибка сохранения: " + e, "Ошибка");
    }
  };

  const handleInstantUpdate = async (eq: CharacterData['equipment']) => {
      if (!activeChar) return;
      const updated = { ...activeChar, equipment: eq };
      const newChars = characters.map(c => c.id === activeChar.id ? updated : c);
      setCharacters(newChars);
      await SupabaseService.saveCharacter(updated, isAdmin);
      setRosterList(newChars); // Update roster immediately for instant actions
  };

  const handleDelete = async (idToDelete?: string) => {
    const targetId = idToDelete || activeChar?.id;
    if (!targetId) return;

    showConfirm("Вы уверены? Это действие необратимо уничтожит сущность.", async () => {
        try {
          await SupabaseService.deleteCharacter(targetId);
          const updated = characters.filter(c => c.id !== targetId);
          setCharacters(updated);
          setRosterList(updated); // Sync list
          if (targetId === activeCharId) {
             handleBack();
          }
        } catch (e) {
          showAlert("Ошибка удаления: " + e, "Ошибка");
        }
    }, "Уничтожение");
  };

  const createUnit = async () => {
      if (!activeChar) return;
      const unit: CharacterData = JSON.parse(JSON.stringify(INITIAL_CHARACTER));
      unit.id = crypto.randomUUID();
      unit.profile.name = "Новый Юнит";
      unit.meta.master_id = activeChar.id;
      // Units inherit Owner UID
      unit.meta.uid = activeChar.meta.uid; 
      
      try {
        await SupabaseService.saveCharacter(unit, isAdmin);
        const updated = [...characters, unit];
        setCharacters(updated);
        setRosterList(updated); // Sync
        handleNavigateToUnit(unit.id);
        setIsEditMode(true);
      } catch (e) {
         showAlert("Cannot create unit: " + e, "Ошибка");
      }
  };

  // Helper for background image in Sheet View
  const getSheetBackground = (faction: Faction) => {
      if (faction === Faction.LIGHT) return 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/Light_bg.jpg';
      if (faction === Faction.DARK) return 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/Dark_bg.jpg';
      if (faction === Faction.NPC) return 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/Bestiary_bg.jpg';
      if (faction === Faction.GRAVEYARD) return 'https://vadwslmqajbbmklrhnzu.supabase.co/storage/v1/object/public/Juul-D-Page/graveyard_bg.jpg';
      return null;
  };

  if (isLoadingData) {
    return (
      <div className="min-h-full flex items-center justify-center text-violet-500">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  if (view === 'training') {
      return <TrainingPage characters={characters} onBack={() => setView('roster')} />;
  }

  return (
    // Removed min-h-screen and pb-20 to allow Roster component to control exact viewport height
    <div className="font-sans text-slate-300 selection:bg-violet-900/40 selection:text-white h-full relative">
      
      {/* Dynamic Background for Sheet View */}
      {view === 'sheet' && activeChar && (
          <>
            {getSheetBackground(activeChar.profile.faction) ? (
                <div className="fixed inset-0 z-0 overflow-hidden">
                    <div 
                        // здесь задний фон
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed blur-[5px] scale-105"
                        style={{ backgroundImage: `url(${getSheetBackground(activeChar.profile.faction)})` }}
                    ></div>
                    {/* Darken by 50% */}
                    <div className="absolute inset-0 bg-black/50"></div>
                </div>
            ) : (
                // Default dark gradient if no specific faction bg
               <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-black z-0 pointer-events-none"></div>
            )}
          </>
      )}

      {view === 'roster' && (
        <>
          <Roster 
            characters={rosterList} // Use the buffered list for performance
            onSelect={handleSelect} 
            onCreate={handleCreate} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenTraining={() => setView('training')}
          />
          {isSettingsOpen && isAdmin && (
             <GlobalSettingsModal 
                onClose={() => setIsSettingsOpen(false)}
                triggersMap={triggersMap}
                onSaveTriggers={async (t) => { await SupabaseService.saveGlobalTriggers(t); setTriggersMap(t); }}
                injuryDefinitions={injuryDefinitions}
                onSaveInjuries={async (inj) => { await SupabaseService.saveInjuries(inj); setInjuryDefinitions(inj); }}
                timeUnits={timeUnits}
                onSaveTimeUnits={async (units) => { await SupabaseService.saveTimeUnits(units); setTimeUnits(units); }}
             />
          )}
        </>
      )}

      {view === 'sheet' && activeChar && (
        <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-6 animate-fade-in pb-32">
          
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between mb-6 bg-[#020617]/80 backdrop-blur-md p-3 border-b border-violet-900/30 sticky top-12 min-[1150px]:top-0 z-50 shadow-lg rune-clip-r">
            <div className="flex items-center gap-2">
               <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleBack} 
                  className="bg-[#0f172a] border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white shadow-md z-10 font-serif tracking-wide"
               >
                 <ChevronLeft size={18} /> 
                 {t('act_back', "Назад")}
               </Button>
               {charStack.length > 1 && (
                 <span className="text-xs text-slate-500 font-serif uppercase tracking-wider hidden md:inline ml-2 border-l border-slate-700 pl-3">
                   {t('lbl_depth', 'Глубина')}: {charStack.length}
                 </span>
               )}
            </div>

            <div className="flex items-center gap-2">
               {isDialectUnlocked && (
                  <button 
                    onClick={toggleDialect} 
                    className={`p-2 rounded border transition-all ${isOldSlavonic ? 'bg-amber-900/20 text-amber-500 border-amber-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                    title="Old Slavonic Dialect"
                  >
                     <ScrollText size={18} />
                  </button>
               )}

               <div className="h-6 w-px bg-slate-800 mx-1"></div>

               <div className="flex bg-[#0f172a] p-1 rounded-sm border border-slate-800">
                  <button 
                    onClick={() => setDisplayMode('lore')}
                    className={`p-1.5 rounded-sm transition-all ${displayMode === 'lore' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Lore Mode"
                  >
                    <BookOpen size={16} />
                  </button>
                  <button 
                    onClick={() => setDisplayMode('mech')}
                    className={`p-1.5 rounded-sm transition-all ${displayMode === 'mech' ? 'bg-violet-900/50 text-violet-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Mechanic Mode"
                  >
                    <Calculator size={16} />
                  </button>
               </div>

               {canEdit && (
                 <>
                   <div className="h-6 w-px bg-slate-800 mx-1"></div>
                   
                   {/* Tag Hints Toggle - Only visible in Edit Mode or if Admin wants to check */}
                   {isEditMode && (
                        <button 
                            onClick={() => setIsTagHintsOpen(true)}
                            className="p-2 bg-violet-900/20 hover:bg-violet-900/40 text-violet-300 border border-violet-500/30 rounded transition-colors"
                            title="Справочник Тегов"
                        >
                            <Tag size={16} />
                        </button>
                   )}

                   {isEditMode ? (
                     <>
                        {/* Delete only for Admin */}
                        {isAdmin && (
                            <Button variant="danger" size="sm" onClick={() => handleDelete(activeChar.id)} title="Delete">
                                <Trash2 size={16} />
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => {
                           showConfirm("Отменить несохраненные изменения?", () => {
                               // Revert to roster list version if needed, or just exit edit
                               const original = rosterList.find(c => c.id === activeChar.id);
                               if (original) updateActiveChar(original); // Simple revert
                               setIsEditMode(false);
                           });
                        }}>
                           <RotateCcw size={16} />
                        </Button>
                        <Button className="bg-emerald-900/80 hover:bg-emerald-800 border-emerald-500/50" size="sm" onClick={handleSave}>
                          <Save size={16} /> {t('act_save', "Сохранить")}
                        </Button>
                     </>
                   ) : (
                     <Button variant="secondary" size="sm" onClick={() => setIsEditMode(true)}>
                       <Edit3 size={16} /> {t('act_edit', "Ред.")}
                     </Button>
                   )}
                 </>
               )}
            </div>
          </div>

          <SheetHeader 
            character={activeChar} 
            isEditMode={isEditMode} 
            onChange={updateActiveChar} 
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            characters={characters}
            onNavigate={handleNavigateToUnit}
            onDelete={isAdmin ? handleDelete : undefined}
            injuryDefinitions={injuryDefinitions}
          />

          {/* Navigation Tabs - Desktop - UPDATED BG */}
          <div className="hidden md:flex sticky top-28 min-[1150px]:top-14 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-violet-900/30 mb-6 px-0 md:px-0">
             <div className="flex overflow-x-auto no-scrollbar gap-1 pb-1">
                {SHEET_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-3 text-sm font-serif font-bold uppercase tracking-widest transition-all whitespace-nowrap relative group flex-shrink-0 ${
                        activeTab === tab.id 
                        ? 'text-violet-300' 
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_#8b5cf6]"></div>
                    )}
                  </button>
                ))}
             </div>
          </div>

          {/* Navigation Tabs - Mobile (Arrow Swapper) */}
          <div className="md:hidden sticky top-28 min-[1150px]:top-14 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-violet-900/30 mb-6 -mx-4 px-4 py-2 flex items-center justify-between">
              <button onClick={handlePrevTab} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <ChevronLeft size={24} />
              </button>
              <div className="font-serif font-bold uppercase tracking-widest text-violet-300 text-sm">
                  {SHEET_TABS.find(t => t.id === activeTab)?.label}
              </div>
              <button onClick={handleNextTab} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <ChevronRight size={24} />
              </button>
          </div>

          {/* Full Width Content Area */}
          <div>
            {activeTab === 'equipment' && (
              <TabEquipment 
                character={activeChar} 
                isEditMode={isEditMode} 
                onChange={(eq) => updateActiveChar({ equipment: eq })} 
                displayMode={displayMode}
                onInstantUpdate={(eq) => handleInstantUpdate(eq)}
              />
            )}
            {activeTab === 'abilities' && (
              <TabAbilities 
                character={activeChar} 
                isEditMode={isEditMode} 
                onChange={(groups) => updateActiveChar({ ability_groups: groups })}
                displayMode={displayMode}
                timeUnits={timeUnits}
              />
            )}
            {activeTab === 'passives' && (
              <TabPassives 
                character={activeChar} 
                isEditMode={isEditMode} 
                onChange={(p) => updateActiveChar({ passives: p })}
                displayMode={displayMode}
                triggersMap={triggersMap}
                timeUnits={timeUnits}
              />
            )}
            {activeTab === 'debuffs' && (
              <TabDebuffs 
                character={activeChar} 
                isEditMode={isEditMode} 
                onChange={(p) => updateActiveChar({ passives: p })}
                displayMode={displayMode}
                triggersMap={triggersMap}
                timeUnits={timeUnits}
              />
            )}
            {activeTab === 'units' && (
              <TabUnits 
                master={activeChar} 
                units={characters} 
                onCreateUnit={createUnit}
                onNavigateToUnit={handleNavigateToUnit}
                isEditMode={isEditMode}
              />
            )}
            {activeTab === 'medcard' && (
              <TabMedCard 
                character={activeChar} 
                isEditMode={isEditMode} 
                onChange={(mc) => updateActiveChar({ medcard: mc })}
                injuryDefinitions={injuryDefinitions}
              />
            )}
          </div>

        </div>
      )}

      {/* Tag Hints Modal */}
      {isTagHintsOpen && (
          <TagHintsModal 
              isOpen={isTagHintsOpen}
              onClose={() => setIsTagHintsOpen(false)}
              isAdmin={isAdmin}
          />
      )}
    </div>
  );
};

export const RosterAdminContainer: React.FC = () => {
  return null; 
};

const RosterModule: React.FC<RosterModuleProps> = (props) => (
  <DialectProvider>
    <UIProvider>
      <RosterContent {...props} />
    </UIProvider>
  </DialectProvider>
);

export default RosterModule;
