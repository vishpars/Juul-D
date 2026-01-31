
import React, { useState, useMemo } from 'react';
import { CharacterData, TimeUnit, StatType, Bonus } from '../types';
import { Card, StyledInput, StyledTextarea, Button, BonusInput, TagInput, TimeInput, TabRadarCharts, CommonTagToggles } from './Shared';
import { Plus, Trash2, Clock, Hourglass, Check, X, ChevronRight, ChevronDown, Eye, EyeOff, Lock, Unlock, Zap, AlertCircle, Link } from 'lucide-react';
import { DisplayMode } from '../App';
import { AbilityLinkModal } from './AbilityLinkModal';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  displayMode: DisplayMode;
  onChange: (p: CharacterData['passives']) => void;
  triggersMap: Record<string, string>;
  timeUnits: TimeUnit[];
}

const TabPassives: React.FC<Props> = ({ character, isEditMode, displayMode, onChange, triggersMap, timeUnits }) => {
  const { passives } = character;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [deleteConfirmGroupIdx, setDeleteConfirmGroupIdx] = useState<number | null>(null);
  
  // State for linking modal
  const [linkingState, setLinkingState] = useState<{gIdx: number, iIdx: number} | null>(null);

  /* [DIALECT] */ const { t } = useDialect();
  
  const toggleGroup = (idx: number) => {
    setCollapsedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateGroup = (gIdx: number, field: string, val: any) => {
    const next = [...passives];
    next[gIdx] = { ...next[gIdx], [field]: val };
    onChange(next);
  };

  const addGroup = () => onChange([...passives, { group_name: "Классовые", tags: [], items: [], is_flaw_group: false }]);
  
  const removeGroup = (idx: number) => { 
     const next = passives.filter((_, i) => i !== idx);
     onChange(next);
     setDeleteConfirmGroupIdx(null);
     const newCollapsed = { ...collapsedGroups };
     delete newCollapsed[idx];
     setCollapsedGroups(newCollapsed);
  };

  const addItem = (gIdx: number) => {
    const next = [...passives];
    const group = { ...next[gIdx] };
    group.items = [...(group.items || [])];
    group.items.push({ 
      name: "Новая черта", 
      bonuses: [], 
      trigger: "Always", 
      tags: [], 
      desc_lore: "", 
      desc_mech: "", 
      is_flaw: false,
      cd: 0, cd_unit: "", dur: 0, dur_unit: "", is_blocked: false
    });
    next[gIdx] = group;
    onChange(next);
  };

  const updateItem = (gIdx: number, iIdx: number, field: string, val: any) => {
    const next = [...passives];
    const group = { ...next[gIdx] };
    group.items = [...group.items];
    group.items[iIdx] = { ...group.items[iIdx], [field]: val };
    next[gIdx] = group;
    onChange(next);
  };

  const removeItem = (gIdx: number, iIdx: number) => {
    const next = [...passives];
    const group = { ...next[gIdx] };
    group.items = [...group.items];
    group.items.splice(iIdx, 1);
    next[gIdx] = group;
    onChange(next);
  };

  const handleAbilitySelect = (abilityName: string) => {
      if (!linkingState) return;
      const { gIdx, iIdx } = linkingState;
      
      const next = [...passives];
      const group = { ...next[gIdx] };
      group.items = [...group.items];
      
      // Auto-set trigger to 'ability' and set the ID
      group.items[iIdx] = { 
          ...group.items[iIdx], 
          trigger: 'ability',
          trigger_ability_id: abilityName
      };
      
      next[gIdx] = group;
      onChange(next);
      setLinkingState(null);
  };

  const shouldShowLore = displayMode === 'lore';
  const shouldShowMech = displayMode === 'mech';

  const structureData = useMemo(() => {
    if (isEditMode) return [];
      const positiveGroups = passives.filter(g => !g.is_flaw_group);
      const data = positiveGroups.map((g, i) => {
        const name = g.group_name || "Unknown";
        let baseName = name.length > 10 ? name.substring(0, 8) + '..' : name;
        return { subject: baseName + '\u200B'.repeat(i), value: g.items ? g.items.length : 0 };
      });
      while (data.length < 3) data.push({ subject: '\u200B'.repeat(100 + data.length), value: 0 });
      return data;
  }, [passives, isEditMode]);

  const bonusData = useMemo(() => {
    if (isEditMode) return [];
      let phys = 0, magic = 0, unique = 0;
      passives.filter(g => !g.is_flaw_group).forEach(g => {
        if (Array.isArray(g.items)) {
          g.items.forEach(item => {
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
  }, [passives, t, isEditMode]);

  // --- TRIGGER OPTIONS LOGIC ---
  const triggerOptions = useMemo(() => {
    const baseline = [
        { key: 'Always', label: 'Пассивно / Всегда' },
        { key: 'ability', label: 'От способности' },
        { key: 'on_hit', label: 'При попадании' },
        { key: 'on_defense', label: 'При защите' }
    ];
    
    // Normalize keys from integrated map for comparison
    const integratedEntries = Object.entries(triggersMap);
    const integratedKeysLower = integratedEntries.map(([k]) => k.toLowerCase());

    const result = baseline.map(base => {
        const fromDb = integratedEntries.find(([k]) => k.toLowerCase() === base.key.toLowerCase());
        return fromDb ? { key: fromDb[0], label: fromDb[1] } : base;
    });

    const baselineKeysLower = baseline.map(b => b.key.toLowerCase());
    integratedEntries.forEach(([key, label]) => {
        if (!baselineKeysLower.includes(key.toLowerCase())) {
            result.push({ key, label });
        }
    });

    return result;
  }, [triggersMap]);

  return (
    <div className="space-y-8 animate-fade-in relative">
      {!isEditMode && <TabRadarCharts structureData={structureData} bonusData={bonusData} color="#10b981" t={t} />}

      <AbilityLinkModal 
        isOpen={!!linkingState}
        onClose={() => setLinkingState(null)}
        abilityGroups={character.ability_groups}
        onSelect={handleAbilitySelect}
      />

      {passives.map((group, gIdx) => {
         if (group.is_flaw_group) return null;
         const isHidden = (group as any).is_hidden;
         const visibleItems = group.items; 
         if (!isEditMode && (visibleItems.length === 0 || isHidden)) return null;
         const isCollapsed = collapsedGroups[gIdx];
         const itemsWithIndex = visibleItems.map((item, i) => ({ ...item, originalIndex: i }));
         const sortedItems = itemsWithIndex.sort((a, b) => {
             if (!!a.is_blocked === !!b.is_blocked) return 0;
             return a.is_blocked ? 1 : -1;
         });

         return (
           <div key={gIdx} className={`space-y-4 transition-all ${isHidden && isEditMode ? 'opacity-70 border-2 border-dashed border-gray-800 p-4 rounded-xl bg-gray-900/20' : ''}`}>
             <div className="border-b border-gray-800 pb-2 bg-slate-900/90 p-3 rounded-t-lg backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between mb-2 gap-4">
                   <button onClick={() => toggleGroup(gIdx)} className="text-gray-500 hover:text-emerald-400 transition-colors p-1">
                      {isCollapsed ? <ChevronRight size={24}/> : <ChevronDown size={24} />}
                   </button>
                   <div className="flex-1">
                       <StyledInput isEditMode={isEditMode} value={group.group_name} onChange={e => updateGroup(gIdx, 'group_name', e.target.value)} className="text-xl font-bold text-emerald-500 uppercase tracking-widest bg-transparent border-none p-0" />
                       {isHidden && isEditMode && <span className="text-[10px] uppercase font-bold text-gray-500 block -mt-1">{t('lbl_hidden_group', "Скрытая группа")}</span>}
                   </div>
                   {isEditMode && (
                     <div className="flex items-center gap-2">
                        <button onClick={() => updateGroup(gIdx, 'is_hidden', !isHidden)} className={`p-1.5 rounded transition-colors ${isHidden ? 'bg-gray-800 text-gray-400 hover:text-white' : 'text-emerald-600 hover:text-emerald-400'}`} title={isHidden ? "Показать в листе" : "Скрыть из листа"}>
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
                     </div>
                   )}
                </div>
                {!isCollapsed && <TagInput isEditMode={isEditMode} tags={group.tags || []} onChange={t => updateGroup(gIdx, 'tags', t)} />}
             </div>

             {!isCollapsed && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {sortedItems.map((itemWrapper) => {
                     const { originalIndex, ...item } = itemWrapper;
                     const isBlocked = !!item.is_blocked;
                     const rawTrigger = String(item.trigger || '').toLowerCase().trim();
                     const isAbilityTrigger = rawTrigger === 'ability' || rawTrigger.includes('способнос');

                     return (
                     <Card key={originalIndex} className={`relative bg-[#0b0d10] border-gray-800 border-l-4 border-l-emerald-500 ${isBlocked ? 'opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0' : ''}`}>
                        <div className="flex justify-between items-start mb-2 overflow-hidden">
                          <div className="flex-1 min-w-0 mr-2" title={item.name}>
                            <StyledInput isEditMode={isEditMode && !isBlocked} disabled={isBlocked} value={item.name} onChange={e => updateItem(gIdx, originalIndex, 'name', e.target.value)} className={`font-bold text-lg truncate block w-full ${isBlocked ? 'text-slate-500' : 'text-emerald-300'}`} />
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isEditMode && (
                                <>
                                    <button onClick={() => updateItem(gIdx, originalIndex, 'is_blocked', !isBlocked)} className={`p-1 rounded transition-colors ${isBlocked ? 'text-amber-500 bg-amber-900/20' : 'text-slate-600 hover:text-amber-400'}`} title={isBlocked ? "Разблокировать" : "Заблокировать (Архивировать)"}>
                                        {isBlocked ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                    {!isBlocked && <button onClick={() => removeItem(gIdx, originalIndex)} className="text-red-900 hover:text-red-500"><Trash2 size={14}/></button>}
                                </>
                            )}
                          </div>
                        </div>

                        <div className={isBlocked ? 'pointer-events-none' : ''}>
                            {(shouldShowMech || isEditMode) && (
                            <div className="space-y-2 mb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {isEditMode ? (
                                    <>
                                        <select 
                                            value={item.trigger} 
                                            onChange={e => updateItem(gIdx, originalIndex, 'trigger', e.target.value)} 
                                            className="bg-gray-800 text-xs border border-gray-700 rounded p-1 max-w-[200px] text-emerald-400 font-bold outline-none focus:border-emerald-500"
                                        >
                                            {triggerOptions.map(opt => (
                                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => setLinkingState({ gIdx, iIdx: originalIndex })}
                                            className="bg-violet-900/30 hover:bg-violet-800 text-violet-300 border border-violet-700/50 rounded px-2 py-1 text-[10px] flex items-center gap-1 uppercase font-bold tracking-wider transition-colors"
                                            title="Выбрать способность из списка"
                                        >
                                            <Link size={12} /> Привязать
                                        </button>
                                    </>
                                    ) : (
                                    <span className="text-[10px] font-bold uppercase bg-gray-800 px-2 py-0.5 rounded border border-gray-700 text-emerald-400">
                                        {isAbilityTrigger ? 'Активируется способностью' : (triggerOptions.find(o => o.key === item.trigger)?.label || item.trigger)}
                                    </span>
                                    )}
                                    <BonusInput isEditMode={isEditMode} bonuses={item.bonuses} onChange={b => updateItem(gIdx, originalIndex, 'bonuses', b)} />
                                </div>
                                {isAbilityTrigger && (
                                    <div className={`text-[10px] flex items-center gap-2 font-bold px-2 py-1 rounded bg-black/40 border border-emerald-900/30 ${!item.trigger_ability_id ? 'text-red-400' : 'text-emerald-400'}`}>
                                        <Zap size={12} />
                                        {item.trigger_ability_id ? `Связь: ${item.trigger_ability_id}` : "Связь не выбрана"}
                                    </div>
                                )}
                            </div>
                            )}

                            {(shouldShowMech || isEditMode) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                <TimeInput icon={Clock} label="КД" isEditMode={isEditMode} val={item.cd} unit={item.cd_unit} onChangeVal={v => updateItem(gIdx, originalIndex, 'cd', v)} onChangeUnit={u => updateItem(gIdx, originalIndex, 'cd_unit', u)} options={timeUnits} />
                                <TimeInput icon={Hourglass} label="Длит." isEditMode={isEditMode} val={item.dur} unit={item.dur_unit} onChangeVal={v => updateItem(gIdx, originalIndex, 'dur', v)} onChangeUnit={u => updateItem(gIdx, originalIndex, 'dur_unit', u)} options={timeUnits} />
                            </div>
                            )}

                            <div className="mb-2">
                                <TagInput isEditMode={isEditMode} tags={item.tags || []} onChange={t => updateItem(gIdx, originalIndex, 'tags', t)} />
                                {isEditMode && <CommonTagToggles tags={item.tags || []} onChange={t => updateItem(gIdx, originalIndex, 'tags', t)} />}
                            </div>

                            {(shouldShowLore || isEditMode) && <StyledTextarea isEditMode={isEditMode} value={item.desc_lore} onChange={e => updateItem(gIdx, originalIndex, 'desc_lore', e.target.value)} className="text-sm text-gray-400 italic mb-2" placeholder={t('ph_lore_generic', "Худ. описание")} />}
                            {(shouldShowMech || isEditMode) && (isEditMode || item.desc_mech) && <StyledTextarea isEditMode={isEditMode} value={item.desc_mech} onChange={e => updateItem(gIdx, originalIndex, 'desc_mech', e.target.value)} className={`text-xs font-mono ${isEditMode ? 'text-green-400' : 'text-green-500/80'}`} placeholder={t('ph_mech_generic', "Механика (Эффект)")} />}
                        </div>
                     </Card>
                   )})}
                   {isEditMode && <Button onClick={() => addItem(gIdx)} variant="secondary" className="border-dashed"><Plus size={14} /> {t('btn_add_passive', "Добавить черту")}</Button>}
                 </div>
             )}
           </div>
         );
      })}
       {isEditMode && <Button onClick={addGroup} className="w-full py-4 border-dashed border-2 bg-slate-900/50 backdrop-blur-sm border-gray-800 text-gray-600 hover:text-white hover:border-gray-600">{t('btn_add_passive_group', "Создать группу пассивок")}</Button>}
    </div>
  );
};

export default TabPassives;
