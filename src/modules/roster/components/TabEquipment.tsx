
import React from 'react';
import { CharacterData } from '../types';
import { Card, SectionHeader, StyledInput, StyledTextarea, Button, BonusInput, TagInput } from './Shared';
import { Plus, Trash2, Shield, Sword, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { DisplayMode } from '../App';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  displayMode: DisplayMode;
  onChange: (eq: CharacterData['equipment']) => void;
  onInstantUpdate: (eq: CharacterData['equipment']) => void;
}

const TabEquipment: React.FC<Props> = ({ character, isEditMode, displayMode, onChange, onInstantUpdate }) => {
  const { equipment } = character;
  const { isAdmin } = useAuth();
  /* [DIALECT] */ const { t } = useDialect();

  // Safety fallback
  const wearable = equipment?.wearable || [];
  const usable = equipment?.usable || [];
  const inventory = equipment?.inventory || [];

  const updateList = (key: keyof typeof equipment, idx: number, val: any) => {
    // Ensure array exists when trying to update
    const list = [...(equipment[key] || [])] as any[];
    list[idx] = val;
    onChange({ ...equipment, [key]: list });
  };

  const addItem = (key: keyof typeof equipment) => {
    // Ensure array exists when trying to add
    const list = [...(equipment[key] || [])] as any[];
    const templates: any = {
      wearable: { name: 'Новая Броня', bonuses: [], tags: [], is_equipped: false, desc_lore: '', desc_mech: '' },
      usable: { name: 'Новое Оружие', bonuses: [], tags: [], desc_lore: '', desc_mech: '' },
      inventory: { name: 'Предмет', desc_lore: '', desc_mech: '', qty: 1 }
    };
    list.push(templates[key]);
    onChange({ ...equipment, [key]: list });
  };

  const remove = (key: keyof typeof equipment, idx: number) => {
    const list = [...(equipment[key] || [])] as any[];
    list.splice(idx, 1);
    onChange({ ...equipment, [key]: list });
  };

  const handleEquipToggle = (idx: number, currentItem: any) => {
    const newVal = !currentItem.is_equipped;
    
    if (isEditMode) {
      updateList('wearable', idx, { ...currentItem, is_equipped: newVal });
    } else {
      const list = [...wearable];
      list[idx] = { ...currentItem, is_equipped: newVal };
      onInstantUpdate({ ...equipment, wearable: list });
    }
  };

  const shouldShowLore = displayMode === 'lore';
  const shouldShowMech = displayMode === 'mech';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Wearable */}
      <div className="space-y-4">
        {/* [DIALECT] */}
        <div className="bg-slate-900/90 p-3 rounded-lg backdrop-blur-sm shadow-md border border-violet-900/20">
            <SectionHeader title={t('eq_wearable', "Экипировка")}>
              {isEditMode && <Button size="sm" onClick={() => addItem('wearable')}><Plus size={14}/></Button>}
            </SectionHeader>
        </div>
        {wearable.map((item, i) => (
          <Card key={i} className={`relative bg-[#0b0d10] border-gray-800 ${item.is_equipped ? 'border-cyan-500/30 bg-cyan-900/5' : ''}`}>
             <div className="flex justify-between items-start mb-2 overflow-hidden">
               <div className="flex-1 min-w-0 mr-2" title={item.name}>
                 <StyledInput 
                   isEditMode={isEditMode} 
                   value={item.name} 
                   onChange={e => updateList('wearable', i, {...item, name: e.target.value})} 
                   className="font-bold text-gray-300 truncate block w-full" 
                   // [DIALECT]
                   placeholder={t('ph_name_generic', "Название")}
                 />
               </div>
               <div className="flex gap-1 flex-shrink-0">
                 <button 
                   onClick={() => handleEquipToggle(i, item)} 
                   disabled={!isEditMode && !isAdmin}
                   className={`p-1 rounded transition-colors ${
                     item.is_equipped 
                       ? 'text-cyan-400 bg-cyan-900/20' 
                       : (isEditMode || isAdmin) ? 'text-gray-600 hover:text-gray-400 cursor-pointer' : 'text-gray-800 cursor-not-allowed'
                   }`}
                 >
                   <Shield size={16} />
                 </button>
                 {isEditMode && <button onClick={() => remove('wearable', i)} className="text-red-900 hover:text-red-500 p-1"><Trash2 size={16} /></button>}
               </div>
             </div>
             
             {(shouldShowMech || isEditMode) && (
               <div className="flex flex-col gap-2 mb-2">
                 <BonusInput isEditMode={isEditMode} bonuses={item.bonuses} onChange={b => updateList('wearable', i, {...item, bonuses: b})} />
                 <TagInput isEditMode={isEditMode} tags={item.tags || []} onChange={t => updateList('wearable', i, {...item, tags: t})} />
               </div>
             )}

             <div className="space-y-2 mt-2">
                {(shouldShowLore || isEditMode) && (
                  <StyledTextarea 
                    isEditMode={isEditMode} 
                    value={item.desc_lore} 
                    onChange={e => updateList('wearable', i, {...item, desc_lore: e.target.value})} 
                    className="text-sm text-gray-500 italic" 
                    // [DIALECT]
                    placeholder={t('ph_lore_generic', "Худ. описание...")}
                  />
                )}
                {(shouldShowMech || isEditMode) && (isEditMode || item.desc_mech) && (
                  <StyledTextarea 
                    isEditMode={isEditMode} 
                    value={item.desc_mech} 
                    onChange={e => updateList('wearable', i, {...item, desc_mech: e.target.value})} 
                    className={`text-xs font-mono ${isEditMode ? 'text-green-400' : 'text-green-500/80'}`}
                    // [DIALECT]
                    placeholder={t('ph_mech_generic', "Механика...")}
                  />
                )}
             </div>
          </Card>
        ))}
      </div>

      {/* Usable */}
      <div className="space-y-4">
        {/* [DIALECT] */}
        <div className="bg-slate-900/90 p-3 rounded-lg backdrop-blur-sm shadow-md border border-violet-900/20">
            <SectionHeader title={t('eq_usable', "Оружие")}>
              {isEditMode && <Button size="sm" onClick={() => addItem('usable')}><Plus size={14}/></Button>}
            </SectionHeader>
        </div>
        {usable.map((item, i) => (
          <Card key={i} className="bg-[#0b0d10] border-gray-800">
             <div className="flex justify-between items-start mb-2 overflow-hidden">
               <div className="flex items-center gap-2 w-full min-w-0">
                 <Sword size={16} className="text-red-900 flex-shrink-0" />
                 <div className="flex-1 min-w-0" title={item.name}>
                   <StyledInput 
                     isEditMode={isEditMode} 
                     value={item.name} 
                     onChange={e => updateList('usable', i, {...item, name: e.target.value})} 
                     className="font-bold text-gray-300 truncate block w-full" 
                     // [DIALECT]
                     placeholder={t('ph_name_generic', "Название")}
                   />
                 </div>
               </div>
               {isEditMode && <button onClick={() => remove('usable', i)} className="text-red-900 hover:text-red-500 p-1 flex-shrink-0"><Trash2 size={16} /></button>}
             </div>
             
             {(shouldShowMech || isEditMode) && (
               <div className="flex flex-col gap-2 mb-2">
                 <BonusInput isEditMode={isEditMode} bonuses={item.bonuses} onChange={b => updateList('usable', i, {...item, bonuses: b})} />
                 <TagInput isEditMode={isEditMode} tags={item.tags || []} onChange={t => updateList('usable', i, {...item, tags: t})} />
               </div>
             )}

             <div className="space-y-2 mt-2">
                {(shouldShowLore || isEditMode) && (
                  <StyledTextarea 
                    isEditMode={isEditMode} 
                    value={item.desc_lore} 
                    onChange={e => updateList('usable', i, {...item, desc_lore: e.target.value})} 
                    className="text-sm text-gray-500 italic" 
                    // [DIALECT]
                    placeholder={t('ph_lore_generic', "Худ. описание...")}
                  />
                )}
                {(shouldShowMech || isEditMode) && (isEditMode || item.desc_mech) && (
                  <StyledTextarea 
                    isEditMode={isEditMode} 
                    value={item.desc_mech} 
                    onChange={e => updateList('usable', i, {...item, desc_mech: e.target.value})} 
                    className={`text-xs font-mono ${isEditMode ? 'text-green-400' : 'text-green-500/80'}`}
                    // [DIALECT]
                    placeholder={t('ph_mech_generic', "Механика...")}
                  />
                )}
             </div>
          </Card>
        ))}
      </div>

      {/* Inventory */}
      <div className="space-y-4">
        {/* [DIALECT] */}
        <div className="bg-slate-900/90 p-3 rounded-lg backdrop-blur-sm shadow-md border border-violet-900/20">
            <SectionHeader title={t('eq_inventory', "Рюкзак")}>
              {isEditMode && <Button size="sm" onClick={() => addItem('inventory')}><Plus size={14}/></Button>}
            </SectionHeader>
        </div>
        {inventory.map((item, i) => (
          <div key={i} className="bg-[#0b0d10] border border-gray-800 p-3 rounded flex flex-col gap-2">
            <div className="flex gap-2 items-center w-full overflow-hidden">
              <span className="text-gray-600 text-[10px] select-none">x</span>
              <div className="w-10 flex-shrink-0">
                 <StyledInput isEditMode={isEditMode} type="number" value={item.qty} onChange={e => updateList('inventory', i, {...item, qty: parseInt(e.target.value)})} className="text-center font-mono text-gray-400" />
              </div>
              <div className="flex-grow min-w-0" title={item.name}>
                <StyledInput 
                  isEditMode={isEditMode} 
                  value={item.name} 
                  onChange={e => updateList('inventory', i, {...item, name: e.target.value})} 
                  className="font-medium w-full text-gray-300 truncate block" 
                  // [DIALECT]
                  placeholder={t('ph_item_name', "Предмет")}
                />
              </div>
              {isEditMode && <button onClick={() => remove('inventory', i)} className="text-red-900 hover:text-red-500 flex-shrink-0"><Trash2 size={16} /></button>}
            </div>
            
            <div className="space-y-1">
              {(shouldShowLore || isEditMode) && (
                <StyledTextarea 
                  isEditMode={isEditMode} 
                  value={item.desc_lore} 
                  onChange={e => updateList('inventory', i, {...item, desc_lore: e.target.value})} 
                  className="text-xs text-gray-600 italic" 
                  // [DIALECT]
                  placeholder={t('ph_lore_generic', "Описание...")}
                />
              )}
              {(shouldShowMech || isEditMode) && (isEditMode || item.desc_mech) && (
                <StyledTextarea 
                  isEditMode={isEditMode} 
                  value={item.desc_mech} 
                  onChange={e => updateList('inventory', i, {...item, desc_mech: e.target.value})} 
                  className={`text-[10px] font-mono ${isEditMode ? 'text-green-400' : 'text-green-500/60'}`} 
                  // [DIALECT]
                  placeholder={t('ph_mech_generic', "Эффект...")}
                />
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default TabEquipment;
