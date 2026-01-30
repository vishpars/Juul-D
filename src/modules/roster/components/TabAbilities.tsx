
import React, { useState, useMemo } from 'react';
import { CharacterData, TimeUnit, StatType, Bonus, Ability } from '../types';
import { Card, StyledInput, StyledTextarea, Button, BonusInput, TagInput, TimeInput, TabRadarCharts, CommonTagToggles } from './Shared';
import { Plus, Trash2, Clock, Hourglass, ChevronDown, ChevronRight, Eye, EyeOff, Hash, Check, X, Lock, Unlock } from 'lucide-react';
import { DisplayMode } from '../App';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  displayMode: DisplayMode;
  onChange: (groups: CharacterData['ability_groups']) => void;
  timeUnits: TimeUnit[];
}

const TabAbilities: React.FC<Props> = ({ character, isEditMode, displayMode, onChange, timeUnits }) => {
  const { ability_groups } = character;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [deleteConfirmGroupIdx, setDeleteConfirmGroupIdx] = useState<number | null>(null);
  /* [DIALECT] */ const { t } = useDialect();

  const toggleGroup = (idx: number) => {
    setCollapsedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateGroup = (idx: number, field: string, val: any) => {
    const next = [...ability_groups];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const addGroup = () => onChange([...ability_groups, { name: "Новая Школа", tags: [], abilities: [], is_hidden: false }]);
  
  const removeGroup = (idx: number) => {
     const next = ability_groups.filter((_, i) => i !== idx);
     onChange(next);
     
     // Clean up collapsed state & delete state
     const newCollapsed = { ...collapsedGroups };
     delete newCollapsed[idx];
     setCollapsedGroups(newCollapsed);
     setDeleteConfirmGroupIdx(null);
  };

  const addAbility = (gIdx: number) => {
    const next = [...ability_groups];
    // Deep clone the group to avoid mutation
    const group = { ...next[gIdx] };
    group.abilities = [...(group.abilities || [])];
    
    group.abilities.push({ 
      name: "Новый Навык", bonuses: [], tags: [], desc_lore: "", desc_mech: "",
      cd: 0, cd_unit: "", dur: 0, dur_unit: "", limit: 0, limit_unit: "", is_blocked: false
    });
    
    next[gIdx] = group;
    onChange(next);
  };

  const updateAbility = (gIdx: number, aIdx: number, field: string, val: any) => {
    const next = [...ability_groups];
    // Deep clone logic
    const group = { ...next[gIdx] };
    // Clone abilities array
    group.abilities = [...group.abilities];
    
    // NOTE: sorting blocked items to the bottom happens during render, 
    // but here we must find the correct ability in the original array based on index
    // However, the indices passed here (aIdx) come from the RENDERED list (which might be sorted differently).
    // This is tricky. To solve this, we should rely on mapping. But since we don't have unique IDs for abilities guaranteed, 
    // we should trust the array order passed from the parent if we don't sort inside the state.
    // 
    // Wait, if we sort for display, we mess up the index mapping for updates. 
    // Strategy: We will sort for display, but attach the original index to the mapped item to pass back here.
    
    // Actually, simpler: Let's assume the state itself should be sorted? No, that causes jumping UI.
    // Let's rely on the fact that `map` provides the index. 
    
    // REFACTOR: We need to find the ability by reference or ID.
    // Since we don't have stable IDs in the type def yet (it's optional in some contexts), 
    // let's pass the ability object itself if possible, OR, handle sorting carefully.
    
    // For this implementation: We will sort the display list.
    // To update correctly, we need the index in the ORIGINAL 'group.abilities' array.
    
    group.abilities[aIdx] = { ...group.abilities[aIdx], [field]: val };
    next[gIdx] = group;
    onChange(next);
  };

  const removeAbility = (gIdx: number, aIdx: number) => {
    const next = [...ability_groups];
    const group = { ...next[gIdx] };
    group.abilities = [...group.abilities];
    group.abilities.splice(aIdx, 1);
    next[gIdx] = group;
    onChange(next);
  };

  const shouldShowLore = displayMode === 'lore';
  const shouldShowMech = displayMode === 'mech';

  // --- Derived Data for Charts (Memoized to prevent flickering during text edits) ---
  const structureData = useMemo(() => {
      // Optimization: Skip calculation in Edit Mode
      if (isEditMode) return [];

      const data = ability_groups.map((g, i) => {
        const name = g.name || "Unknown";
        let baseName = name.length > 10 ? name.substring(0, 8) + '..' : name;
        return {
          subject: baseName + '\u200B'.repeat(i), 
          value: g.abilities ? g.abilities.length : 0
        };
      });
      // Pad to at least 3 points for radar chart
      while (data.length < 3) {
          data.push({ 
              subject: '\u200B'.repeat(100 + data.length), 
              value: 0 
          });
      }
      return data;
  }, [ability_groups, isEditMode]);

  const bonusData = useMemo(() => {
      // Optimization: Skip calculation in Edit Mode
      if (isEditMode) return [];

      let phys = 0, magic = 0, unique = 0;
      ability_groups.forEach(g => {
        if (Array.isArray(g.abilities)) {
          g.abilities.forEach(item => {
            if (Array.isArray(item.bonuses)) {
              item.bonuses.forEach(b => {
                 const val = Number(b.val);
                 if (!Number.isNaN(val)) {
                    if (b.stat === StatType.PHYS) phys += val;
                    if (b.stat === StatType.MAGIC) magic += val;
                    if (b.stat === StatType.UNIQUE) unique += val;
                 }
              });
            }
          });
        }
      });
      
      const getValue = (v: number) => Math.max(0, v); // Only positive for abilities

      return [
        { subject: t('stat_phys_short', 'ФИЗ'), value: getValue(phys) },
        { subject: t('stat_mag_short', 'МАГ'), value: getValue(magic) },
        { subject: t('stat_uni_short', 'УНИК'), value: getValue(unique) },
      ];
  }, [ability_groups, t, isEditMode]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {!isEditMode && (
          <TabRadarCharts 
              structureData={structureData} 
              bonusData={bonusData} 
              color="#06b6d4" 
              t={t}
          />
      )}

      {ability_groups.map((group, gIdx) => {
        // Hide if not in edit mode AND either empty or explicitly hidden
        if (!isEditMode && (group.abilities.length === 0 || group.is_hidden)) return null;
        
        const isCollapsed = collapsedGroups[gIdx];
        const isHidden = group.is_hidden;

        // Prepare sorted list for display, but keep original index
        const abilitiesWithIndex = group.abilities.map((ab, i) => ({ ...ab, originalIndex: i }));
        
        // Sort: Unblocked first, Blocked last
        const sortedAbilities = abilitiesWithIndex.sort((a, b) => {
            if (a.is_blocked === b.is_blocked) return 0;
            return a.is_blocked ? 1 : -1;
        });

        return (
          // Use Index as key to prevent re-mounting on name change
          <div key={gIdx} className={`space-y-4 transition-all ${isHidden && isEditMode ? 'opacity-70 border-2 border-dashed border-gray-800 p-4 rounded-xl bg-gray-900/20' : ''}`}>
             {/* Header */}
             <div className="flex items-center gap-4 border-b border-gray-800 pb-2 bg-slate-900/90 p-3 rounded-t-lg backdrop-blur-sm shadow-md">
               <button onClick={() => toggleGroup(gIdx)} className="text-gray-500 hover:text-cyan-400 transition-colors p-1">
                  {isCollapsed ? <ChevronRight size={24}/> : <ChevronDown size={24} />}
               </button>
               <div className="flex-1">
                 <StyledInput 
                   isEditMode={isEditMode} 
                   value={group.name} 
                   onChange={e => updateGroup(gIdx, 'name', e.target.value)} 
                   className="text-xl font-bold text-cyan-500 uppercase tracking-widest bg-transparent border-none p-0" 
                 />
                 {/* [DIALECT] */}
                 {isHidden && isEditMode && <span className="text-[10px] uppercase font-bold text-gray-500 block -mt-1">{t('lbl_hidden_group', "Скрытая группа")}</span>}
               </div>
               
               {!isCollapsed && <TagInput isEditMode={isEditMode} tags={group.tags || []} onChange={t => updateGroup(gIdx, 'tags', t)} />}
               
               {isEditMode && (
                 <>
                   <button 
                     onClick={() => updateGroup(gIdx, 'is_hidden', !isHidden)} 
                     className={`p-1.5 rounded transition-colors ${isHidden ? 'bg-gray-800 text-gray-400 hover:text-white' : 'text-cyan-600 hover:text-cyan-400'}`}
                     title={isHidden ? "Показать в листе" : "Скрыть из листа"}
                   >
                     {isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}
                   </button>
                   
                   {/* Delete Confirm Logic */}
                   {deleteConfirmGroupIdx === gIdx ? (
                     <div className="flex items-center gap-1">
                        <Button size="sm" variant="danger" onClick={() => removeGroup(gIdx)}><Check size={14} /></Button>
                        <Button size="sm" variant="secondary" onClick={() => setDeleteConfirmGroupIdx(null)}><X size={14} /></Button>
                     </div>
                   ) : (
                     <Button size="sm" variant="danger" onClick={() => setDeleteConfirmGroupIdx(gIdx)}><Trash2 size={14} /></Button>
                   )}
                 </>
               )}
             </div>

             {/* Content */}
             {!isCollapsed && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                 {sortedAbilities.map((abilityWrapper) => {
                   const { originalIndex, ...ability } = abilityWrapper;
                   const isBlocked = ability.is_blocked;

                   return (
                   <Card key={originalIndex} className={`hover:border-gray-700 transition-colors bg-[#0b0d10] border-gray-800 ${isBlocked ? 'opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0' : ''}`}>
                      <div className="flex justify-between items-start mb-2 overflow-hidden">
                         <div className="flex-1 min-w-0 mr-2" title={ability.name}>
                           <StyledInput 
                              isEditMode={isEditMode && !isBlocked} 
                              disabled={isBlocked}
                              value={ability.name} 
                              onChange={e => updateAbility(gIdx, originalIndex, 'name', e.target.value)} 
                              className={`font-bold text-lg truncate block w-full ${isBlocked ? 'text-slate-500' : ''}`} 
                              // [DIALECT]
                              placeholder={t('ph_ability_name', "Название навыка")}
                           />
                         </div>
                         {isEditMode && (
                             <div className="flex items-center gap-1 flex-shrink-0">
                                <button 
                                    onClick={() => updateAbility(gIdx, originalIndex, 'is_blocked', !isBlocked)}
                                    className={`p-1 rounded transition-colors ${isBlocked ? 'text-amber-500 bg-amber-900/20' : 'text-slate-600 hover:text-amber-400'}`}
                                    title={isBlocked ? "Разблокировать" : "Заблокировать (Архивировать)"}
                                >
                                    {isBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>
                                {!isBlocked && (
                                    <button onClick={() => removeAbility(gIdx, originalIndex)} className="text-red-900 hover:text-red-500 transition-colors">
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                             </div>
                         )}
                      </div>
                      
                      {/* Mech Details (Hidden in Lore Mode unless Editing) */}
                      {(shouldShowMech || isEditMode) && (
                        <div className={`flex flex-wrap gap-2 mb-2 ${isBlocked ? 'pointer-events-none' : ''}`}>
                          <BonusInput isEditMode={isEditMode && !isBlocked} bonuses={ability.bonuses} onChange={b => updateAbility(gIdx, originalIndex, 'bonuses', b)} />
                          <TimeInput 
                            icon={Clock} label="КД" isEditMode={isEditMode && !isBlocked} 
                            val={ability.cd} unit={ability.cd_unit} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'cd', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'cd_unit', u)} 
                            options={timeUnits}
                          />
                          <TimeInput 
                            icon={Hourglass} label="Длит." isEditMode={isEditMode && !isBlocked} 
                            val={ability.dur} unit={ability.dur_unit} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'dur', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'dur_unit', u)} 
                            options={timeUnits}
                          />
                          {/* Limit input */}
                          <TimeInput 
                            icon={Hash} label="Лимит" isEditMode={isEditMode && !isBlocked} 
                            val={ability.limit || 0} unit={ability.limit_unit || ""} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'limit', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'limit_unit', u)} 
                            options={timeUnits}
                          />
                        </div>
                      )}

                      <div className={`mb-3 ${isBlocked ? 'pointer-events-none' : ''}`}>
                         <TagInput isEditMode={isEditMode && !isBlocked} tags={ability.tags || []} onChange={t => updateAbility(gIdx, originalIndex, 'tags', t)} />
                         {isEditMode && !isBlocked && <CommonTagToggles tags={ability.tags || []} onChange={t => updateAbility(gIdx, originalIndex, 'tags', t)} />}
                      </div>

                      {/* Lore Text */}
                      {(shouldShowLore || isEditMode) && (
                        <StyledTextarea 
                          isEditMode={isEditMode && !isBlocked} 
                          disabled={isBlocked}
                          value={ability.desc_lore} 
                          onChange={e => updateAbility(gIdx, originalIndex, 'desc_lore', e.target.value)} 
                          className="text-sm text-gray-400 italic mb-2" 
                          // [DIALECT]
                          placeholder={t('ph_ability_lore', "Худ. описание")}
                        />
                      )}

                      {/* Mech Text - Green Highlight */}
                      {(shouldShowMech || isEditMode) && (isEditMode || ability.desc_mech) && (
                        <div className={`pt-2 ${!isEditMode && shouldShowLore ? 'border-t border-gray-800' : ''}`}>
                          <StyledTextarea 
                            isEditMode={isEditMode && !isBlocked} 
                            disabled={isBlocked}
                            value={ability.desc_mech} 
                            onChange={e => updateAbility(gIdx, originalIndex, 'desc_mech', e.target.value)} 
                            className={`text-xs font-mono leading-relaxed ${isEditMode ? 'text-green-400' : 'text-green-500/80'} ${isBlocked ? 'text-slate-500' : ''}`} 
                            // [DIALECT]
                            placeholder={t('ph_ability_mech', "Механика")} 
                          />
                        </div>
                      )}
                   </Card>
                 )})}
                 
                 {isEditMode && (
                   <button onClick={() => addAbility(gIdx)} className="border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-700 hover:text-cyan-500 hover:border-cyan-900 transition-all min-h-[150px] bg-slate-900/50 backdrop-blur-sm">
                     <Plus size={24} />
                   </button>
                 )}
               </div>
             )}
          </div>
        );
      })}

      {/* [DIALECT] */}
      {isEditMode && <Button onClick={addGroup} className="w-full py-4 border-dashed border-2 bg-slate-900/50 backdrop-blur-sm border-gray-800 text-gray-600 hover:text-white hover:border-gray-600">
         {t('btn_add_school', "Создать новую школу")}
      </Button>}
    </div>
  );
};

export default TabAbilities;
