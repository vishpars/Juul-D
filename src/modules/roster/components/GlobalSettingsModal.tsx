
import React, { useState, useEffect } from 'react';
import { InjuryDefinition, TimeUnit, Ability } from '../types';
import { Button, Card, StyledInput, StyledTextarea, BonusInput, TagInput, TimeInput, CommonTagToggles } from './Shared';
import { Settings, X, Save, Trash2, Plus, Clock, Zap, Skull, Swords, Sparkles, Hourglass, Hash } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { getBasicActions, saveBasicActions } from '../utils/supabaseService';

interface Props {
  onClose: () => void;
  // Triggers
  triggersMap: Record<string, string>;
  onSaveTriggers: (t: Record<string, string>) => Promise<void>;
  // Injuries
  injuryDefinitions: InjuryDefinition[];
  onSaveInjuries: (injuries: InjuryDefinition[]) => Promise<void>;
  // Time Units
  timeUnits: TimeUnit[];
  onSaveTimeUnits: (units: TimeUnit[]) => Promise<void>;
}

const GlobalSettingsModal: React.FC<Props> = ({ 
  onClose, 
  triggersMap, onSaveTriggers,
  injuryDefinitions, onSaveInjuries,
  timeUnits, onSaveTimeUnits
}) => {
  const { showAlert, showConfirm } = useUI();
  const [activeTab, setActiveTab] = useState<'triggers' | 'injuries' | 'time' | 'basic'>('triggers');

  // --- Triggers State ---
  const [editingTriggers, setEditingTriggers] = useState<Record<string, string>>({ ...triggersMap });
  const [newTriggerKey, setNewTriggerKey] = useState("");
  const [newTriggerLabel, setNewTriggerLabel] = useState("");

  // --- Injuries State ---
  const [editingInjuries, setEditingInjuries] = useState<InjuryDefinition[]>([...injuryDefinitions]);
  const [newInjury, setNewInjury] = useState<Partial<InjuryDefinition>>({
    tag: "", label: "", value: -5, type: 1, desc: "", stack: undefined
  });

  // --- Time Units State ---
  const [editingTimeUnits, setEditingTimeUnits] = useState<TimeUnit[]>([...timeUnits]);
  const [newTimeTag, setNewTimeTag] = useState("");
  const [newTimeLabel, setNewTimeLabel] = useState("");
  const [newTimeBattle, setNewTimeBattle] = useState(false);

  // --- Basic Actions State ---
  const [basicActions, setBasicActions] = useState<Ability[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  useEffect(() => {
      if (activeTab === 'basic') {
          setLoadingActions(true);
          getBasicActions().then(actions => {
              setBasicActions(actions);
              setLoadingActions(false);
          });
      }
  }, [activeTab]);

  // --- Handlers: Triggers ---
  const saveTriggers = async () => {
    await onSaveTriggers(editingTriggers);
    showAlert("Триггеры успешно записаны в архив.", "Сохранено");
  };
  const addTrigger = () => {
    if (newTriggerKey && newTriggerLabel) {
      setEditingTriggers(prev => ({ ...prev, [newTriggerKey]: newTriggerLabel }));
      setNewTriggerKey("");
      setNewTriggerLabel("");
    }
  };
  const removeTrigger = (key: string) => {
     showConfirm("Удалить этот триггер из списка?", () => {
        const next = { ...editingTriggers };
        delete next[key];
        setEditingTriggers(next);
     }, "Удаление");
  };

  // --- Handlers: Injuries ---
  const saveInjuriesHandler = async () => {
    await onSaveInjuries(editingInjuries);
    showAlert("Шаблоны травм обновлены.", "Сохранено");
  };
  const addInjury = () => {
    if (newInjury.tag && newInjury.label) {
      setEditingInjuries(prev => [...prev, {
        tag: newInjury.tag!,
        label: newInjury.label!,
        value: newInjury.value || 0,
        type: newInjury.type || 1,
        desc: newInjury.desc || "",
        stack: newInjury.stack || undefined
      } as InjuryDefinition]);
      setNewInjury({ tag: "", label: "", value: -5, type: 1, desc: "", stack: undefined });
    }
  };
  const removeInjury = (idx: number) => {
    showConfirm("Удалить этот шаблон травмы?", () => {
      setEditingInjuries(prev => prev.filter((_, i) => i !== idx));
    }, "Удаление");
  };
  const updateInjury = (idx: number, field: keyof InjuryDefinition, val: any) => {
     const next = [...editingInjuries];
     next[idx] = { ...next[idx], [field]: val };
     setEditingInjuries(next);
  };

  // --- Handlers: Time Units ---
  const saveTimeUnitsHandler = async () => {
    await onSaveTimeUnits(editingTimeUnits);
    showAlert("Единицы времени зафиксированы.", "Сохранено");
  };
  const addTimeUnit = () => {
    if (newTimeTag && newTimeLabel) {
      // Prevent duplicate tags
      if (editingTimeUnits.some(u => u.tag === newTimeTag)) {
         showAlert("Такой тег уже существует!", "Ошибка");
         return;
      }
      setEditingTimeUnits(prev => [...prev, { tag: newTimeTag, label: newTimeLabel, battle: newTimeBattle }]);
      setNewTimeTag("");
      setNewTimeLabel("");
      setNewTimeBattle(false);
    }
  };
  const removeTimeUnit = (idx: number) => {
     setEditingTimeUnits(prev => prev.filter((_, i) => i !== idx));
  };
  const updateTimeUnit = (idx: number, field: keyof TimeUnit, val: any) => {
     const next = [...editingTimeUnits];
     next[idx] = { ...next[idx], [field]: val };
     setEditingTimeUnits(next);
  };

  // --- Handlers: Basic Actions ---
  const addBasicAction = () => {
      setBasicActions(prev => [...prev, {
          name: "Новое Действие",
          bonuses: [],
          tags: [],
          desc_lore: "",
          desc_mech: "",
          cd: 0, cd_unit: "",
          dur: 0, dur_unit: "",
          limit: 0, limit_unit: ""
      }]);
  };
  const updateBasicAction = (idx: number, field: string, val: any) => {
      setBasicActions(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], [field]: val };
          return next;
      });
  };
  const removeBasicAction = (idx: number) => {
      showConfirm("Удалить базовое действие?", () => {
          setBasicActions(prev => prev.filter((_, i) => i !== idx));
      });
  };
  const saveBasicActionsHandler = async () => {
      await saveBasicActions(basicActions);
      showAlert("Базовые действия сохранены.", "Сохранено");
  };

  // Styles helpers for Injuries
  const getInjuryStyles = (type: number) => {
    switch (type) {
      case 2: return "border-blue-500/20 text-blue-200 bg-[#0f172a]";
      case 3: return "border-purple-500/20 text-purple-200 bg-[#180d2b]";
      default: return "border-red-500/20 text-red-200 bg-[#1f1212]";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in">
       {/* Modal Container */}
       <div className="relative w-full max-w-6xl h-[90vh] bg-[#0b0d12] border border-violet-500/30 rounded-lg shadow-[0_0_50px_-10px_rgba(139,92,246,0.15)] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="relative z-10 flex justify-between items-center p-5 border-b border-violet-500/20 bg-[#0b0d12]/80 backdrop-blur-md">
             <div className="flex items-center gap-3 text-violet-100">
               <Sparkles className="text-violet-400" size={20}/>
               <h2 className="text-xl font-serif font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
                  Глобальные Настройки
               </h2>
             </div>
             <button onClick={onClose} className="text-violet-500 hover:text-white transition-colors p-1"><X size={24}/></button>
          </div>

          {/* Navigation Tabs */}
          <div className="relative z-10 flex border-b border-violet-500/20 bg-[#0b0d12]/50 overflow-x-auto">
            {[
              { id: 'triggers', label: 'Триггеры', icon: Zap, color: 'text-cyan-400' },
              { id: 'injuries', label: 'Травмы', icon: Skull, color: 'text-red-400' },
              { id: 'time', label: 'Ед. Времени', icon: Clock, color: 'text-amber-400' },
              { id: 'basic', label: 'Баз. Действия', icon: Swords, color: 'text-emerald-400' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[120px] py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative overflow-hidden group ${
                  activeTab === tab.id 
                  ? `${tab.color} bg-violet-900/10` 
                  : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-current shadow-[0_0_10px_currentColor]"></div>
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-violet-900 scrollbar-track-transparent">
             
             {/* --- TRIGGERS TAB --- */}
             {activeTab === 'triggers' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                   <div className="bg-[#13151c] border border-violet-500/20 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-400 font-serif uppercase tracking-wider">Активные Триггеры</div>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(editingTriggers).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-4 bg-[#0b0d10] p-3 rounded border border-gray-800 hover:border-violet-500/30 transition-colors">
                              <div className="w-1/3 font-mono text-xs text-gray-500 uppercase tracking-widest">{key}</div>
                              <input 
                                className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-gray-700 font-medium"
                                value={label}
                                onChange={(e) => setEditingTriggers(prev => ({...prev, [key]: e.target.value}))}
                              />
                              <button onClick={() => removeTrigger(key)} className="text-gray-600 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                   </div>
                   
                   <div className="bg-[#13151c] border border-violet-500/20 rounded-lg p-6">
                     <div className="text-sm text-cyan-500 font-serif uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Plus size={16} /> Добавить Триггер
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Системный Тег</label>
                           <input 
                              placeholder="ON_EVENT" 
                              className="w-full bg-[#0b0d10] border border-gray-800 rounded p-3 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                              value={newTriggerKey}
                              onChange={e => setNewTriggerKey(e.target.value)}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Название</label>
                           <input 
                              placeholder="Название события" 
                              className="w-full bg-[#0b0d10] border border-gray-800 rounded p-3 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                              value={newTriggerLabel}
                              onChange={e => setNewTriggerLabel(e.target.value)}
                           />
                        </div>
                     </div>
                     <button 
                        onClick={addTrigger}
                        className="mt-4 w-full py-2 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 uppercase text-xs font-bold tracking-widest hover:bg-cyan-900/40 transition-all"
                     >
                        Добавить
                     </button>
                   </div>
                </div>
             )}

             {/* --- INJURIES TAB --- */}
             {activeTab === 'injuries' && (
                <div className="space-y-4 max-w-5xl mx-auto">
                   <div className="space-y-2">
                     {editingInjuries.map((item, idx) => (
                        <div key={idx} className={`flex flex-wrap items-center gap-2 p-3 rounded border transition-colors ${getInjuryStyles(item.type)}`}>
                           <div className="w-24">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Тег</label>
                              <div className="text-xs font-mono opacity-80 truncate" title={item.tag}>{item.tag}</div>
                           </div>
                           <div className="flex-1 min-w-[150px]">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Название</label>
                              <input className="w-full bg-black/20 border-b border-white/10 text-sm py-1 focus:outline-none focus:border-white/30" value={item.label} onChange={e => updateInjury(idx, 'label', e.target.value)} />
                           </div>
                           <div className="w-16">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Штраф</label>
                              <input type="number" className="w-full bg-black/20 border-b border-white/10 text-sm font-bold py-1 focus:outline-none" value={item.value} onChange={e => updateInjury(idx, 'value', parseInt(e.target.value))} />
                           </div>
                           <div className="w-20">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Тип</label>
                              <select className="w-full bg-black/20 border-b border-white/10 text-xs py-1 focus:outline-none" value={item.type} onChange={e => updateInjury(idx, 'type', parseInt(e.target.value))}>
                                 <option value={1}>Физ</option>
                                 <option value={2}>Маг</option>
                                 <option value={3}>Уник</option>
                              </select>
                           </div>
                           <div className="w-16">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Стак</label>
                              <input type="number" className="w-full bg-black/20 border-b border-white/10 text-xs py-1 focus:outline-none" value={item.stack || ""} placeholder="-" onChange={e => updateInjury(idx, 'stack', e.target.value ? parseInt(e.target.value) : undefined)} />
                           </div>
                           <div className="flex-[2] min-w-[200px]">
                              <label className="block text-[9px] uppercase opacity-50 font-bold">Описание</label>
                              <input className="w-full bg-black/20 border-b border-white/10 text-xs italic py-1 focus:outline-none" value={item.desc || ""} onChange={e => updateInjury(idx, 'desc', e.target.value)} />
                           </div>
                           <div className="w-8 flex justify-end items-end">
                              <button onClick={() => removeInjury(idx)} className="opacity-50 hover:opacity-100 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                           </div>
                        </div>
                     ))}
                   </div>

                   <div className="bg-[#13151c] border border-violet-500/20 rounded-lg p-6 mt-6">
                     <div className="text-sm text-red-400 font-serif uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Plus size={16} /> Создать шаблон травмы
                     </div>
                     <div className="grid grid-cols-12 gap-4">
                        <input className="col-span-2 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" placeholder="Тег" value={newInjury.tag} onChange={e => setNewInjury({...newInjury, tag: e.target.value})} />
                        <input className="col-span-3 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" placeholder="Название" value={newInjury.label} onChange={e => setNewInjury({...newInjury, label: e.target.value})} />
                        <input type="number" className="col-span-1 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" placeholder="Знач" value={newInjury.value} onChange={e => setNewInjury({...newInjury, value: parseInt(e.target.value)})} />
                        <select className="col-span-1 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" value={newInjury.type} onChange={e => setNewInjury({...newInjury, type: parseInt(e.target.value) as any})}>
                           <option value={1}>Физ</option>
                           <option value={2}>Маг</option>
                           <option value={3}>Уник</option>
                        </select>
                        <input type="number" className="col-span-1 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" placeholder="Стак" value={newInjury.stack || ""} onChange={e => setNewInjury({...newInjury, stack: e.target.value ? parseInt(e.target.value) : undefined})} />
                        <input className="col-span-3 bg-[#0b0d10] border border-gray-800 rounded p-2 text-xs text-white" placeholder="Описание" value={newInjury.desc} onChange={e => setNewInjury({...newInjury, desc: e.target.value})} />
                        <div className="col-span-1">
                          <button onClick={addInjury} className="w-full h-full bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-900/40 rounded flex items-center justify-center"><Plus size={16}/></button>
                        </div>
                     </div>
                   </div>
                </div>
             )}

             {/* --- TIME UNITS TAB --- */}
             {activeTab === 'time' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="text-xs text-gray-400 mb-6 bg-amber-900/10 p-4 rounded border border-amber-900/30 font-mono">
                    Настройка единиц времени. <br/>
                    Флаг <span className="text-amber-500 font-bold">БОЙ</span> активирует единицу для боевых расчетов.
                  </div>
                  
                  <div className="space-y-2">
                    {editingTimeUnits.map((unit, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-[#0b0d10] p-3 rounded border border-gray-800 hover:border-violet-500/30">
                         <div className="w-1/4">
                           <input 
                             className="w-full bg-transparent border-none text-gray-500 font-mono text-xs focus:ring-0 cursor-default"
                             value={unit.tag}
                             readOnly
                           />
                         </div>
                         <div className="flex-1">
                            <input 
                              className="w-full bg-transparent border-b border-gray-800 focus:border-amber-500 text-gray-200 text-sm py-1 focus:outline-none transition-colors"
                              value={unit.label}
                              onChange={(e) => updateTimeUnit(idx, 'label', e.target.value)}
                            />
                         </div>
                         <div className="w-24 flex justify-center">
                            <button 
                              onClick={() => updateTimeUnit(idx, 'battle', !unit.battle)}
                              className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${unit.battle ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-600'}`}
                            >
                              {unit.battle ? 'Боевое' : 'Пассив'}
                            </button>
                         </div>
                         <button onClick={() => removeTimeUnit(idx)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#13151c] border border-violet-500/20 rounded-lg p-6 mt-6">
                    <div className="text-sm text-amber-500 font-serif uppercase tracking-wider mb-4 flex items-center gap-2">
                       <Plus size={16} /> Новая Единица
                    </div>
                    <div className="grid grid-cols-12 gap-4 items-center">
                       <input 
                         className="col-span-3 bg-[#0b0d10] border border-gray-800 rounded p-3 text-sm text-white focus:border-amber-500/50 outline-none"
                         placeholder="Тег (напр. turn)"
                         value={newTimeTag}
                         onChange={(e) => setNewTimeTag(e.target.value)}
                       />
                       <input 
                         className="col-span-5 bg-[#0b0d10] border border-gray-800 rounded p-3 text-sm text-white focus:border-amber-500/50 outline-none"
                         placeholder="Метка (напр. Ход)"
                         value={newTimeLabel}
                         onChange={(e) => setNewTimeLabel(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && addTimeUnit()}
                       />
                       <div className="col-span-2 flex justify-center">
                          <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase font-bold text-gray-400 select-none hover:text-white">
                             <input 
                               type="checkbox" 
                               checked={newTimeBattle} 
                               onChange={e => setNewTimeBattle(e.target.checked)}
                               className="accent-amber-500 w-4 h-4"
                             />
                             Бой?
                          </label>
                       </div>
                       <button 
                          onClick={addTimeUnit} 
                          className="col-span-2 py-3 bg-amber-900/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest hover:bg-amber-900/40 transition-all rounded"
                       >
                          Добавить
                       </button>
                    </div>
                  </div>
                </div>
             )}

             {/* --- BASIC ACTIONS TAB --- */}
             {activeTab === 'basic' && (
                 <div className="max-w-6xl mx-auto space-y-4">
                     {loadingActions ? (
                         <div className="text-center text-slate-500 py-10">Загрузка архива...</div>
                     ) : (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                             {basicActions.map((action, idx) => (
                                 <Card key={idx} className="bg-[#0b0d10] border-gray-800">
                                     <div className="flex justify-between items-start mb-2">
                                         <StyledInput 
                                            isEditMode={true} 
                                            value={action.name} 
                                            onChange={(e) => updateBasicAction(idx, 'name', e.target.value)}
                                            className="font-bold text-lg w-full text-emerald-400"
                                         />
                                         <button onClick={() => removeBasicAction(idx)} className="text-gray-600 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                     </div>
                                     
                                     <div className="flex flex-wrap gap-2 mb-2">
                                         <BonusInput isEditMode={true} bonuses={action.bonuses} onChange={b => updateBasicAction(idx, 'bonuses', b)} />
                                         <TimeInput icon={Clock} label="КД" isEditMode={true} val={action.cd} unit={action.cd_unit} onChangeVal={v => updateBasicAction(idx, 'cd', v)} onChangeUnit={u => updateBasicAction(idx, 'cd_unit', u)} options={editingTimeUnits} />
                                         <TimeInput icon={Hourglass} label="Длит." isEditMode={true} val={action.dur} unit={action.dur_unit} onChangeVal={v => updateBasicAction(idx, 'dur', v)} onChangeUnit={u => updateBasicAction(idx, 'dur_unit', u)} options={editingTimeUnits} />
                                         <TimeInput icon={Hash} label="Лимит" isEditMode={true} val={action.limit || 0} unit={action.limit_unit || ""} onChangeVal={v => updateBasicAction(idx, 'limit', v)} onChangeUnit={u => updateBasicAction(idx, 'limit_unit', u)} options={editingTimeUnits} />
                                     </div>

                                     <div className="mb-2">
                                         <TagInput isEditMode={true} tags={action.tags} onChange={t => updateBasicAction(idx, 'tags', t)} />
                                         <CommonTagToggles tags={action.tags} onChange={t => updateBasicAction(idx, 'tags', t)} />
                                     </div>

                                     <StyledTextarea isEditMode={true} value={action.desc_lore} onChange={e => updateBasicAction(idx, 'desc_lore', e.target.value)} className="text-sm italic text-gray-400 mb-2" placeholder="Худ. описание" />
                                     <StyledTextarea isEditMode={true} value={action.desc_mech} onChange={e => updateBasicAction(idx, 'desc_mech', e.target.value)} className="text-xs font-mono text-green-400" placeholder="Механика" />
                                 </Card>
                             ))}
                             
                             <button onClick={addBasicAction} className="border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-700 hover:text-emerald-500 hover:border-emerald-900 transition-all min-h-[200px]">
                                 <Plus size={32} />
                             </button>
                         </div>
                     )}
                 </div>
             )}
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 p-5 border-t border-violet-500/20 bg-[#0b0d12]/90 backdrop-blur">
             <div className="flex gap-4">
               {activeTab === 'triggers' && (
                 <button onClick={saveTriggers} className="flex-1 py-3 bg-cyan-900/20 border border-cyan-500/50 text-cyan-300 font-serif uppercase tracking-widest text-sm hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all">
                    Сохранить Триггеры
                 </button>
               )}
               {activeTab === 'injuries' && (
                 <button onClick={saveInjuriesHandler} className="flex-1 py-3 bg-red-900/20 border border-red-500/50 text-red-300 font-serif uppercase tracking-widest text-sm hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] transition-all">
                    Обновить Протоколы Травм
                 </button>
               )}
               {activeTab === 'time' && (
                 <button onClick={saveTimeUnitsHandler} className="flex-1 py-3 bg-amber-900/20 border border-amber-500/50 text-amber-300 font-serif uppercase tracking-widest text-sm hover:bg-amber-900/40 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all">
                    Синхронизировать Время
                 </button>
               )}
               {activeTab === 'basic' && (
                 <button onClick={saveBasicActionsHandler} className="flex-1 py-3 bg-emerald-900/20 border border-emerald-500/50 text-emerald-300 font-serif uppercase tracking-widest text-sm hover:bg-emerald-900/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
                    Кодифицировать Действия
                 </button>
               )}
             </div>
          </div>

       </div>
    </div>
  );
};

export default GlobalSettingsModal;
