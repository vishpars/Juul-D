
import React, { useState, useMemo } from 'react';
import { CharacterData, InjuryDefinition } from '../types';
import { Card, SectionHeader, Button, StyledInput } from './Shared';
import { Plus, Trash2, Skull, Activity, X, Sword, Wand2, Crown } from 'lucide-react';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  character: CharacterData;
  isEditMode: boolean;
  onChange: (m: CharacterData['medcard']) => void;
  injuryDefinitions: InjuryDefinition[];
}

const TabMedCard: React.FC<Props> = ({ character, isEditMode, onChange, injuryDefinitions }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  /* [DIALECT] */ const { t } = useDialect();
  
  const { medcard } = character;

  const addInjury = (def: InjuryDefinition) => {
    const next = { ...medcard, injuries: [...medcard.injuries, { template_id: def.tag, custom_name: def.label, count: 1 }] };
    onChange(next);
    setShowAddModal(false);
  };

  const removeInjury = (idx: number) => onChange({ ...medcard, injuries: medcard.injuries.filter((_, i) => i !== idx) });
  
  const updateInjury = (idx: number, field: string, val: any) => {
     const nextInjuries = [...medcard.injuries];
     nextInjuries[idx] = { ...nextInjuries[idx], [field]: val };
     onChange({ ...medcard, injuries: nextInjuries });
  };

  // 1. Calculate aggregated counts per definition tag
  const countsByTag = useMemo(() => {
    const map: Record<string, number> = {};
    medcard.injuries.forEach(inj => {
      const count = typeof inj.count === 'number' ? inj.count : 1;
      map[inj.template_id] = (map[inj.template_id] || 0) + count;
    });
    return map;
  }, [medcard.injuries]);

  // 2. Logic for debuff summary using aggregated counts
  const getDebuffs = () => {
    let phys = 0;
    let mag = 0;
    let unique = 0;

    Object.entries(countsByTag).forEach(([tag, rawCount]) => {
       const totalCount = Number(rawCount);
       const def = injuryDefinitions.find(d => d.tag === tag);
       if (def) {
          let stacksToApply = totalCount;
          
          if (def.stack && def.stack > 1) {
             stacksToApply = Math.floor(totalCount / Number(def.stack));
          }

          if (def.type === 1) phys += Number(def.value) * stacksToApply;
          if (def.type === 2) mag += Number(def.value) * stacksToApply;
          if (def.type === 3) unique += Number(def.value) * stacksToApply;
       }
    });

    return { phys, mag, unique };
  };

  const totals = getDebuffs();

  // --- Style Helpers ---
  const getTypeStyles = (type: number) => {
    switch (type) {
      case 2: // Mag
        return {
          wrapper: "bg-blue-900/10 border-blue-900/30",
          iconColor: "text-blue-500",
          textColor: "text-blue-200",
          subTextColor: "text-blue-400/70",
          inputClass: "text-blue-200",
          Icon: Wand2
        };
      case 3: // Unique
        return {
          wrapper: "bg-purple-900/10 border-purple-900/30",
          iconColor: "text-purple-500",
          textColor: "text-purple-200",
          subTextColor: "text-purple-400/70",
          inputClass: "text-purple-200",
          Icon: Crown
        };
      case 1: // Phys
      default:
        return {
          wrapper: "bg-red-900/10 border-red-900/30",
          iconColor: "text-red-500",
          textColor: "text-red-200",
          subTextColor: "text-red-400/70",
          inputClass: "text-red-200",
          Icon: Sword
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Debuff Summary */}
      <div className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
         <div className="flex items-center gap-2">
           <Activity size={20} className="text-gray-500" />
           {/* [DIALECT] */}
           <span className="font-bold text-gray-400">{t('mech_debuffs', 'Штрафы')}:</span>
         </div>
         <div className={`font-mono font-bold ${totals.phys < 0 ? 'text-red-400' : 'text-gray-500'}`}>
            {/* [DIALECT] */}
            {t('stat_phys_short', 'ФИЗ')}: {totals.phys}
         </div>
         <div className={`font-mono font-bold ${totals.mag < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
            {/* [DIALECT] */}
            {t('stat_mag_short', 'МАГ')}: {totals.mag}
         </div>
         <div className={`font-mono font-bold ${totals.unique < 0 ? 'text-purple-400' : 'text-gray-500'}`}>
            {/* [DIALECT] */}
            {t('stat_uni_short', 'УНИК')}: {totals.unique}
         </div>
      </div>

      {/* Injuries */}
      <Card className="border-t-4 border-t-gray-800 bg-gray-900/20">
        {/* [DIALECT] */}
        <SectionHeader title={t('mech_injuries', "Травмы (Injuries)")}>
          {isEditMode && <Button size="sm" variant="danger" onClick={() => setShowAddModal(true)}><Plus size={14}/></Button>}
        </SectionHeader>
        <div className="space-y-2">
          {medcard.injuries.map((inj, i) => {
             const def = injuryDefinitions.find(d => d.tag === inj.template_id);
             const type = def?.type || 1;
             const styles = getTypeStyles(type);
             const TypeIcon = styles.Icon;

             // Stacking logic for Display
             const isStacking = def?.stack && (def.stack > 1);
             const totalPool = countsByTag[inj.template_id] || 0;
             const appliedGlobalStacks = isStacking ? Math.floor(totalPool / (def?.stack || 1)) : totalPool;

             return (
               <div key={i} className={`flex items-center gap-3 border p-3 rounded transition-colors ${styles.wrapper}`}>
                  <div className="relative">
                    <Skull size={24} className={styles.iconColor} />
                    <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-0.5 border border-gray-700">
                      <TypeIcon size={10} className={styles.iconColor} />
                    </div>
                  </div>

                  <div className="flex-1">
                     <div className="flex items-center gap-2">
                       <StyledInput 
                         isEditMode={isEditMode} 
                         value={inj.custom_name} 
                         onChange={e => updateInjury(i, 'custom_name', e.target.value)} 
                         className={`font-bold ${styles.inputClass}`} 
                       />
                       
                       {isEditMode && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">x</span>
                            <input type="number" value={inj.count} onChange={e => updateInjury(i, 'count', parseInt(e.target.value))} className="w-10 bg-gray-800 text-center text-xs rounded border border-gray-700 text-white" />
                          </div>
                       )}
                       {!isEditMode && inj.count > 1 && <span className={`text-xs px-1 rounded font-bold border ${styles.wrapper} ${styles.textColor}`}>x{inj.count}</span>}
                     </div>
                     {/* Show global context */}
                     <div className={`text-xs ${styles.subTextColor}`}>
                       {def ? (
                         <>
                           {/* [DIALECT] */}
                           {def.type === 1 && `[${t('stat_phys_short', 'ФИЗ')}] `}
                           {def.type === 2 && `[${t('stat_mag_short', 'МАГ')}] `}
                           {def.type === 3 && `[${t('stat_uni_short', 'УНИК')}] `}
                           
                           {/* Global pool display for stacking items */}
                           {isStacking ? (
                             <>
                               <span className="text-orange-400 font-mono ml-1">
                                  {/* [DIALECT] */}
                                  ({t('lbl_total_stacks', 'Всего стаков')}: {totalPool}/{def.stack} → {appliedGlobalStacks} {t('lbl_proc', 'прокнуло')})
                               </span>
                             </>
                           ) : (
                             <span>{def.value} {t('lbl_stack', 'за стак')}</span>
                           )}
                           
                           <span className="block italic opacity-60">{def.desc}</span>
                         </>
                       ) : (
                         "Шаблон удален"
                       )}
                     </div>
                  </div>
                  {isEditMode && <button onClick={() => removeInjury(i)} className="text-red-500 hover:text-red-300"><Trash2 size={16}/></button>}
               </div>
             );
          })}
          {medcard.injuries.length === 0 && <div className="text-gray-500 italic text-sm">Персонаж полностью здоров.</div>}
        </div>
      </Card>

      {/* Select Injury Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
           <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
              <h3 className="text-xl font-bold text-gray-200 mb-4">Выберите травму</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                 {injuryDefinitions.map((def) => {
                    const styles = getTypeStyles(def.type);
                    return (
                      <button key={def.tag} onClick={() => addInjury(def)} className={`w-full text-left p-3 hover:bg-opacity-30 border rounded group transition-all ${styles.wrapper}`}>
                         <div className="flex justify-between items-center">
                            <div className={`font-bold ${styles.textColor}`}>{def.label}</div>
                            <div className={`text-xs font-mono font-bold ${styles.textColor}`}>{def.value}</div>
                         </div>
                         <div className={`text-xs ${styles.subTextColor}`}>
                            {def.desc} {def.stack && def.stack > 1 && <span className="text-orange-400 ml-1">Stack: {def.stack}</span>}
                         </div>
                      </button>
                    );
                 })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TabMedCard;
