
import React, { useState, useMemo } from 'react';
import { CharacterData, TimeUnit, StatType, Bonus } from '../types';
import { Card, StyledInput, StyledTextarea, Button, BonusInput, TagInput, TimeInput, TabRadarCharts, CommonTagToggles } from './Shared';
import { Plus, Trash2, Clock, Hourglass, Check, X, ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { DisplayMode } from '../App';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  displayMode: DisplayMode;
  onChange: (p: CharacterData['passives']) => void;
  triggersMap: Record<string, string>;
  timeUnits: TimeUnit[];
}

const TabDebuffs: React.FC<Props> = ({ character, isEditMode, displayMode, onChange, triggersMap, timeUnits }) => {
  const { passives } = character;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
  const [deleteConfirmGroupIdx, setDeleteConfirmGroupIdx] = useState<number | null>(null);
  /* [DIALECT] */ const { t } = useDialect();
  
  const toggleGroup = (idx: number) => {
    setCollapsedGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateGroup = (gIdx: number, field: string, val: any) => {
    const next = [...passives];
    next[gIdx] = { ...next[gIdx], [field]: val };
    onChange(next);
  };

  const addGroup = () => onChange([...passives, { group_name: "Группа Дебаффов", tags: [], items: [], is_flaw_group: true }]);
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
    // FORCE is_flaw: true
    const group = { ...next[gIdx] };
    group.items = [...group.items];
    group.items.push({ 
      name: "Новый Дебафф", 
      bonuses: [], 
      trigger: Object.keys(triggersMap)[0] || "Always", 
      tags: [], 
      desc_lore: "", 
      desc_mech: "", 
      is_flaw: true,
      cd: 0, cd_unit: "", dur: 0, dur_unit: ""
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

  const shouldShowLore = displayMode === 'lore';
  const shouldShowMech = displayMode === 'mech';

  // --- Derived Data for Charts (Memoized) ---
  // Only recalculate if array length or structure changes, or if bonus values change
  const structureData = useMemo(() => {
      const flaws = passives.filter(g => g.is_flaw_group);
      
      const data = flaws.map((g, i) => {
        const name = g.group_name || "Unknown";
        let baseName = name.length > 10 ? name.substring(0, 8) + '..' : name;
        return {
          subject: baseName + '\u200B'.repeat(i), 
          value: g.items ? g.items.length : 0
        };
      });
      while (data.length < 3) {
          data.push({ subject: '\u200B'.repeat(100 + data.length), value: 0 });
      }
      return data;
  }, [passives]);

  const bonusData = useMemo(() => {
      let phys = 0, magic = 0, unique = 0;
      // Iterate only flaw groups
      passives.filter(g => g.is_flaw_group).forEach(g => {
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

      const getValue = (v: number) => Math.abs(v); // Debuffs are negative, chart needs positive magnitude

      return [
        { subject: t('stat_phys_short', 'ФИЗ'), value: getValue(phys) },
        { subject: t('stat_mag_short', 'МАГ'), value: getValue(magic) },
        { subject: t('stat_uni_short', 'УНИК'), value: getValue(unique) },
      ];
  }, [passives, t]);

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Charts Visualization - Enable isDebuff mode */}
      {/* PERFORMANCE FIX: Only render charts in View Mode */}
      {!isEditMode && (
          <TabRadarCharts 
              structureData={structureData} 
              bonusData={bonusData} 
              isDebuff={true} 
              t={t}
          />
      )}

      {passives.map((group, gIdx) => {
         // IMPORTANT: Skip if this is NOT a DEBUFF group
         if (!group.is_flaw_group) return null;

         const isHidden = (group as any).is_hidden;
         const visibleItems = group.items;
         
         if (!isEditMode && (visibleItems.length === 0 || isHidden)) return null;
         
         const isCollapsed = collapsedGroups[gIdx];

         return (
           // Use Index as Key to prevent re-mounting input on typing
           <div key={gIdx} className={`space-y-4 transition-all ${isHidden && isEditMode ? 'opacity-70 border-2 border-dashed border-gray-800 p-4 rounded-xl bg-gray-900/20' : ''}`}>
             <div className="border-b border-gray-800 pb-2 bg-slate-900/90 p-3 rounded-t-lg backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between mb-2 gap-4">
                   <button onClick={() => toggleGroup(gIdx)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                      {isCollapsed ? <ChevronRight size={24}/> : <ChevronDown size={24} />}
                   </button>

                   <div className="flex-1">
                       <StyledInput isEditMode={isEditMode} value={group.group_name} onChange={e => updateGroup(gIdx, 'group_name', e.target.value)} className="text-xl font-bold text-red-500 uppercase tracking-widest bg-transparent border-none p-0" />
                       {isHidden && isEditMode && <span className="text-[10px] uppercase font-bold text-gray-500 block -mt-1">{t('lbl_hidden_group', "Скрытая группа")}</span>}
                   </div>
                   
                   {/* Edit Actions */}
                   {isEditMode && (
                     <div className="flex items-center gap-2">
                       <button 
                            onClick={() => updateGroup(gIdx, 'is_hidden', !isHidden)} 
                            className={`p-1.5 rounded transition-colors ${isHidden ? 'bg-gray-800 text-gray-400 hover:text-white' : 'text-red-600 hover:text-red-400'}`}
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
                     </div>
                   )}
                </div>
                
                {!isCollapsed && <TagInput isEditMode={isEditMode} tags={group.tags || []} onChange={t => updateGroup(gIdx, 'tags', t)} />}
             </div>

             {!isCollapsed && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {visibleItems.map((item, iIdx) => (
                     <Card key={iIdx} className="relative bg-[#0b0d10] border-gray-800 border-l-4 border-l-red-500 bg-red-900/5">
                        <div className="flex justify-between items-start mb-2 overflow-hidden">
                          <div className="flex-1 min-w-0 mr-2" title={item.name}>
                            <StyledInput 
                              isEditMode={isEditMode} 
                              value={item.name} 
                              onChange={e => updateItem(gIdx, iIdx, 'name', e.target.value)} 
                              className="font-bold text-lg truncate block w-full text-red-300" 
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isEditMode && <button onClick={() => removeItem(gIdx, iIdx)} className="text-red-900 hover:text-red-500"><Trash2 size={14}/></button>}
                          </div>
                        </div>

                        {(shouldShowMech || isEditMode) && (
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                             {isEditMode ? (
                               <select value={item.trigger} onChange={e => updateItem(gIdx, iIdx, 'trigger', e.target.value)} className="bg-gray-800 text-xs border border-gray-700 rounded p-1 max-w-[200px]">
                                 {Object.entries(triggersMap).map(([key, label]) => (
                                   <option key={key} value={key}>{label}</option>
                                 ))}
                               </select>
                             ) : (
                               <span className="text-[10px] font-bold uppercase bg-gray-800 px-2 py-0.5 rounded border border-gray-700 text-gray-500">
                                 {triggersMap[item.trigger] || item.trigger}
                               </span>
                             )}
                             <BonusInput isEditMode={isEditMode} bonuses={item.bonuses} onChange={b => updateItem(gIdx, iIdx, 'bonuses', b)} />
                          </div>
                        )}

                        {(shouldShowMech || isEditMode) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                             <TimeInput 
                              icon={Clock} label="КД" isEditMode={isEditMode} 
                              val={item.cd} unit={item.cd_unit} 
                              onChangeVal={v => updateItem(gIdx, iIdx, 'cd', v)} 
                              onChangeUnit={u => updateItem(gIdx, iIdx, 'cd_unit', u)} 
                              options={timeUnits}
                            />
                            <TimeInput 
                              icon={Hourglass} label="Длит." isEditMode={isEditMode} 
                              val={item.dur} unit={item.dur_unit} 
                              onChangeVal={v => updateItem(gIdx, iIdx, 'dur', v)} 
                              onChangeUnit={u => updateItem(gIdx, iIdx, 'dur_unit', u)} 
                              options={timeUnits}
                            />
                          </div>
                        )}

                        <div className="mb-2">
                           <TagInput isEditMode={isEditMode} tags={item.tags || []} onChange={t => updateItem(gIdx, iIdx, 'tags', t)} />
                           {isEditMode && <CommonTagToggles tags={item.tags || []} onChange={t => updateItem(gIdx, iIdx, 'tags', t)} />}
                        </div>

                        {(shouldShowLore || isEditMode) && (
                          <StyledTextarea 
                            isEditMode={isEditMode} 
                            value={item.desc_lore} 
                            onChange={e => updateItem(gIdx, iIdx, 'desc_lore', e.target.value)} 
                            className="text-sm text-gray-400 italic mb-2" 
                            placeholder="Худ. описание" 
                          />
                        )}
                        {(shouldShowMech || isEditMode) && (isEditMode || item.desc_mech) && (
                          <StyledTextarea 
                            isEditMode={isEditMode} 
                            value={item.desc_mech} 
                            onChange={e => updateItem(gIdx, iIdx, 'desc_mech', e.target.value)} 
                            className={`text-xs font-mono ${isEditMode ? 'text-green-400' : 'text-green-500/80'}`} 
                            placeholder="Механика (Эффект)" 
                          />
                        )}
                     </Card>
                   ))}
                   {isEditMode && <Button onClick={() => addItem(gIdx)} variant="secondary" className="border-dashed"><Plus size={14} /> 
                      {/* [DIALECT] */}
                      {t('mech_debuffs', "Добавить Дебафф")}
                   </Button>}
                 </div>
             )}
           </div>
         );
      })}
       {isEditMode && <Button onClick={addGroup} className="w-full py-4 border-dashed border-2 bg-slate-900/50 backdrop-blur-sm border-gray-800 text-gray-500 hover:text-white hover:border-gray-600">
          {/* [DIALECT] */}
          {t('mech_debuffs', "Создать группу дебаффов")}
       </Button>}
    </div>
  );
};

export default TabDebuffs;
