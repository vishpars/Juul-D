
import React, { useState, useMemo } from 'react';
import { CharacterData, TimeUnit, StatType, Bonus, Ability } from '../types';
import { Card, StyledInput, StyledTextarea, Button, BonusInput, TagInput, TimeInput, TabRadarCharts, CommonTagToggles } from './Shared';
import { Plus, Trash2, Clock, Hourglass, ChevronDown, ChevronRight, Eye, EyeOff, Hash, Check, X, Lock, Unlock, Sparkles, FolderInput } from 'lucide-react';
import { DisplayMode } from '../App';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  displayMode: DisplayMode;
  onChange: (groups: CharacterData['ability_groups']) => void;
  timeUnits: TimeUnit[];
  onCharacterUpdate?: (u: Partial<CharacterData>) => void;
}

const TabAbilities: React.FC<Props> = ({ character, isEditMode, displayMode, onChange, timeUnits, onCharacterUpdate }) => {
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
     
     const newCollapsed = { ...collapsedGroups };
     delete newCollapsed[idx];
     setCollapsedGroups(newCollapsed);
     setDeleteConfirmGroupIdx(null);
  };

  const addAbility = (gIdx: number) => {
    const next = [...ability_groups];
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
    const group = { ...next[gIdx] };
    group.abilities = [...group.abilities];
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

  const moveAbility = (fromGIdx: number, targetValue: string, aIdx: number) => {
      // Internal move
      if (targetValue.startsWith('group_')) {
          const toGIdx = parseInt(targetValue.split('_')[1]);
          const next = [...ability_groups];
          const sourceGroup = { ...next[fromGIdx] };
          const targetGroup = { ...next[toGIdx] };
          const ability = sourceGroup.abilities[aIdx];

          sourceGroup.abilities = sourceGroup.abilities.filter((_, i) => i !== aIdx);
          targetGroup.abilities = [...targetGroup.abilities, ability];

          next[fromGIdx] = sourceGroup;
          next[toGIdx] = targetGroup;
          onChange(next);
      } 
      // Cross-move to Passive
      else if (targetValue.startsWith('passive_') && onCharacterUpdate) {
          const toPIdx = parseInt(targetValue.split('_')[1]);
          const ability = ability_groups[fromGIdx].abilities[aIdx];
          
          // Convert Ability to Passive
          const newPassive = {
              name: ability.name,
              bonuses: ability.bonuses,
              tags: ability.tags,
              desc_lore: ability.desc_lore,
              desc_mech: ability.desc_mech,
              cd: ability.cd,
              cd_unit: ability.cd_unit,
              dur: ability.dur,
              dur_unit: ability.dur_unit,
              is_blocked: ability.is_blocked,
              trigger: "Always",
              is_flaw: false // Defaults to not flaw, will be adjusted by target group type usually
          };

          // 1. Remove from abilities
          const nextAbilities = [...ability_groups];
          nextAbilities[fromGIdx] = {
              ...nextAbilities[fromGIdx],
              abilities: nextAbilities[fromGIdx].abilities.filter((_, i) => i !== aIdx)
          };

          // 2. Add to passives
          const nextPassives = [...character.passives];
          // Ensure target group exists
          if (nextPassives[toPIdx]) {
              const targetGroup = { ...nextPassives[toPIdx] };
              // inherit is_flaw from group if possible, or keep default
              newPassive.is_flaw = !!targetGroup.is_flaw_group;
              targetGroup.items = [...targetGroup.items, newPassive];
              nextPassives[toPIdx] = targetGroup;
          }

          onCharacterUpdate({
              ability_groups: nextAbilities,
              passives: nextPassives
          });
      }
  };

  const shouldShowLore = displayMode === 'lore';
  const shouldShowMech = displayMode === 'mech';

  const structureData = useMemo(() => {
      if (isEditMode) return [];
      const data = ability_groups.map((g, i) => {
        const name = g.name || "Unknown";
        let baseName = name.length > 10 ? name.substring(0, 8) + '..' : name;
        return { subject: baseName + '\u200B'.repeat(i), value: g.abilities ? g.abilities.length : 0 };
      });
      while (data.length < 3) data.push({ subject: '\u200B'.repeat(100 + data.length), value: 0 });
      return data;
  }, [ability_groups, isEditMode]);

  const bonusData = useMemo(() => {
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
      const getValue = (v: number) => Math.max(0, v); 
      return [
        { subject: t('stat_phys_short', 'ФИЗ'), value: getValue(phys) },
        { subject: t('stat_mag_short', 'МАГ'), value: getValue(magic) },
        { subject: t('stat_uni_short', 'УНИК'), value: getValue(unique) },
      ];
  }, [ability_groups, t, isEditMode]);

  return (
    <div className="space-y-8 animate-fade-in">
      {!isEditMode && <TabRadarCharts structureData={structureData} bonusData={bonusData} color="#06b6d4" t={t} />}

      {ability_groups.map((group, gIdx) => {
        const isBasic = group.name === "Базовые Действия";
        if (!isEditMode && (group.abilities.length === 0 || group.is_hidden)) return null;
        
        const isCollapsed = collapsedGroups[gIdx];
        const isHidden = group.is_hidden;
        const abilitiesWithIndex = group.abilities.map((ab, i) => ({ ...ab, originalIndex: i }));
        const sortedAbilities = abilitiesWithIndex.sort((a, b) => {
            if (a.is_blocked === b.is_blocked) return 0;
            return a.is_blocked ? 1 : -1;
        });

        return (
          <div key={gIdx} className={`space-y-4 transition-all ${isBasic ? 'border-l-4 border-emerald-500' : ''} ${isHidden && isEditMode ? 'opacity-70 border-2 border-dashed border-gray-800 p-4 rounded-xl bg-gray-900/20' : ''}`}>
             <div className={`flex items-center gap-4 border-b border-gray-800 pb-2 ${isBasic ? 'bg-emerald-950/20' : 'bg-slate-900/90'} p-3 rounded-t-lg backdrop-blur-sm shadow-md`}>
               <button onClick={() => toggleGroup(gIdx)} className={`p-1 transition-colors ${isBasic ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-500 hover:text-cyan-400'}`}>
                  {isCollapsed ? <ChevronRight size={24}/> : <ChevronDown size={24} />}
               </button>
               <div className="flex-1 flex items-center gap-2">
                 {isBasic && <Sparkles size={18} className="text-emerald-500 shrink-0" />}
                 <StyledInput 
                   isEditMode={isEditMode && !isBasic} 
                   value={group.name} 
                   onChange={e => updateGroup(gIdx, 'name', e.target.value)} 
                   className={`text-xl font-bold uppercase tracking-widest bg-transparent border-none p-0 ${isBasic ? 'text-emerald-500' : 'text-cyan-500'}`} 
                 />
                 {isBasic && isEditMode && <span className="text-[9px] uppercase font-bold text-emerald-900 bg-emerald-500/20 px-2 py-0.5 rounded">Система</span>}
                 {isHidden && isEditMode && <span className="text-[10px] uppercase font-bold text-gray-500 block -mt-1">{t('lbl_hidden_group', "Скрытая группа")}</span>}
               </div>
               
               {!isCollapsed && <TagInput isEditMode={isEditMode && !isBasic} tags={group.tags || []} onChange={t => updateGroup(gIdx, 'tags', t)} />}
               
               {isEditMode && !isBasic && (
                 <>
                   <button 
                     onClick={() => updateGroup(gIdx, 'is_hidden', !isHidden)} 
                     className={`p-1.5 rounded transition-colors ${isHidden ? 'bg-gray-800 text-gray-400 hover:text-white' : 'text-cyan-600 hover:text-cyan-400'}`}
                     title={isHidden ? "Показать в листе" : "Скрыть из листа"}
                   >
                     {isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}
                   </button>
                   
                   {deleteConfirmGroupIdx === gIdx ? (
                     <div className="flex items-center gap-1">
                        <Button size="sm" variant="danger" onClick={() => removeGroup(gIdx)}><Check size={14} /></Button>
                        <Button size="sm" variant="secondary" onClick={() => setDeleteConfirmGroupIdx(null)}><X size={14} /></Button>
                     </div>
                   ) : (
                     <Button size="sm" variant="danger" onClick={() => setDeleteConfirmGroupIdx(gIdx)}><Trash2 size={14}/></Button>
                   )}
                 </>
               )}
             </div>

             {!isCollapsed && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                 {sortedAbilities.map((abilityWrapper) => {
                   const { originalIndex, ...ability } = abilityWrapper;
                   const isBlocked = ability.is_blocked;

                   return (
                   <Card key={originalIndex} className={`hover:border-gray-700 transition-colors bg-[#0b0d10] border-gray-800 ${isBlocked ? 'opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0' : ''} ${isBasic ? 'border-l-2 border-emerald-900/50' : ''}`}>
                      <div className="flex justify-between items-start mb-2 overflow-hidden">
                         <div className="flex-1 min-w-0 mr-2" title={ability.name}>
                           <StyledInput 
                              isEditMode={isEditMode && !isBlocked && !isBasic} 
                              disabled={isBlocked || isBasic}
                              value={ability.name} 
                              onChange={e => updateAbility(gIdx, originalIndex, 'name', e.target.value)} 
                              className={`font-bold text-lg truncate block w-full ${isBlocked ? 'text-slate-500' : (isBasic ? 'text-emerald-300' : '')}`} 
                              placeholder={t('ph_ability_name', "Название навыка")}
                           />
                         </div>
                         {isEditMode && !isBasic && (
                             <div className="flex items-center gap-1 flex-shrink-0">
                                <div className="relative group">
                                    <button className="p-1 rounded text-slate-600 hover:text-cyan-400 transition-colors" title="Перенести...">
                                        <FolderInput size={14} />
                                    </button>
                                    <select 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={"default"}
                                        onChange={(e) => moveAbility(gIdx, e.target.value, originalIndex)}
                                    >
                                        <option value="default" disabled className="bg-[#0b0d10]">Перенести в...</option>
                                        <optgroup label="Школы" className="bg-[#0b0d10]">
                                            {ability_groups.map((grp, i) => (
                                                <option key={"g"+i} value={"group_"+i} disabled={i === gIdx} className="bg-[#0b0d10]">{grp.name}</option>
                                            ))}
                                        </optgroup>
                                        {character.passives && character.passives.length > 0 && (
                                            <optgroup label="Пассивки/Дебаффы" className="bg-[#0b0d10]">
                                                {character.passives.map((grp, i) => (
                                                    <option key={"p"+i} value={"passive_"+i} className="bg-[#0b0d10]">{grp.group_name || 'Группа ' + (i+1)}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
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
                      
                      {(shouldShowMech || isEditMode) && (
                        <div className={`flex flex-wrap gap-2 mb-2 ${isBlocked ? 'pointer-events-none' : ''}`}>
                          <BonusInput isEditMode={isEditMode && !isBlocked && !isBasic} bonuses={ability.bonuses} onChange={b => updateAbility(gIdx, originalIndex, 'bonuses', b)} />
                          <TimeInput 
                            icon={Clock} label="КД" isEditMode={isEditMode && !isBlocked && !isBasic} 
                            val={ability.cd} unit={ability.cd_unit} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'cd', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'cd_unit', u)} 
                            options={timeUnits}
                          />
                          <TimeInput 
                            icon={Hourglass} label="Длит." isEditMode={isEditMode && !isBlocked && !isBasic} 
                            val={ability.dur} unit={ability.dur_unit} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'dur', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'dur_unit', u)} 
                            options={timeUnits}
                          />
                          <TimeInput 
                            icon={Hash} label="Лимит" isEditMode={isEditMode && !isBlocked && !isBasic} 
                            val={ability.limit || 0} unit={ability.limit_unit || ""} 
                            onChangeVal={v => updateAbility(gIdx, originalIndex, 'limit', v)} 
                            onChangeUnit={u => updateAbility(gIdx, originalIndex, 'limit_unit', u)} 
                            options={timeUnits}
                          />
                        </div>
                      )}

                      <div className={`mb-3 ${isBlocked ? 'pointer-events-none' : ''}`}>
                         <TagInput isEditMode={isEditMode && !isBlocked && !isBasic} tags={ability.tags || []} onChange={t => updateAbility(gIdx, originalIndex, 'tags', t)} />
                         {isEditMode && !isBlocked && !isBasic && <CommonTagToggles tags={ability.tags || []} onChange={t => updateAbility(gIdx, originalIndex, 'tags', t)} />}
                      </div>

                      {(shouldShowLore || isEditMode) && (
                        <StyledTextarea 
                          isEditMode={isEditMode && !isBlocked && !isBasic} 
                          disabled={isBlocked || isBasic}
                          value={ability.desc_lore} 
                          onChange={e => updateAbility(gIdx, originalIndex, 'desc_lore', e.target.value)} 
                          className="text-sm text-gray-400 italic mb-2" 
                          placeholder={t('ph_ability_lore', "Худ. описание")}
                        />
                      )}

                      {(shouldShowMech || isEditMode) && (isEditMode || ability.desc_mech) && (
                        <div className={`pt-2 ${!isEditMode && shouldShowLore ? 'border-t border-gray-800' : ''}`}>
                          <StyledTextarea 
                            isEditMode={isEditMode && !isBlocked && !isBasic} 
                            disabled={isBlocked || isBasic}
                            value={ability.desc_mech} 
                            onChange={e => updateAbility(gIdx, originalIndex, 'desc_mech', e.target.value)} 
                            className={`text-xs font-mono leading-relaxed ${isEditMode ? 'text-green-400' : (isBasic ? 'text-emerald-500/70' : 'text-green-500/80')} ${isBlocked ? 'text-slate-500' : ''}`} 
                            placeholder={t('ph_ability_mech', "Механика")} 
                          />
                        </div>
                      )}
                   </Card>
                 )})}
                 
                 {isEditMode && !isBasic && (
                   <button onClick={() => addAbility(gIdx)} className="border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-700 hover:text-cyan-500 hover:border-cyan-900 transition-all min-h-[150px] bg-slate-900/50 backdrop-blur-sm">
                     <Plus size={24} />
                   </button>
                 )}
               </div>
             )}
          </div>
        );
      })}

      {isEditMode && <Button onClick={addGroup} className="w-full py-4 border-dashed border-2 bg-slate-900/50 backdrop-blur-sm border-gray-800 text-gray-600 hover:text-white hover:border-gray-600">
         {t('btn_add_school', "Создать новую школу")}
      </Button>}
    </div>
  );
};

export default TabAbilities;
