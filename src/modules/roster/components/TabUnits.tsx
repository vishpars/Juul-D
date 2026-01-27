
import React from 'react';
import { CharacterData } from '../types';
import { Card, Button } from './Shared';
import { Plus, Skull, User, Sword, Wand2, Crown } from 'lucide-react';
/* [DIALECT] */ import { useDialect } from '../dialect_module/DialectContext';

interface Props {
  master: CharacterData;
  units: CharacterData[]; // All characters
  onCreateUnit: () => void;
  onNavigateToUnit: (unitId: string) => void;
  isEditMode: boolean;
}

const TabUnits: React.FC<Props> = ({ master, units, onCreateUnit, onNavigateToUnit, isEditMode }) => {
  // Filter for characters that have master_id === master.id
  const myUnits = units.filter(c => c.meta.master_id === master.id);
  /* [DIALECT] */ const { t } = useDialect();

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Actions */}
       {isEditMode && (
         <Button onClick={onCreateUnit} className="w-full py-4 border-dashed border-2 bg-transparent border-gray-800 text-gray-500 hover:text-white hover:border-cyan-600 transition-all">
           {/* [DIALECT] */}
           <Plus size={24} /> {t('btn_create_unit', "Призвать Юнита (Создать Карточку)")}
         </Button>
       )}

       {/* Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {myUnits.map(unit => (
           <Card 
             key={unit.id} 
             className="cursor-pointer hover:border-cyan-500/50 hover:bg-[#111316] transition-all group"
           >
             <div onClick={() => onNavigateToUnit(unit.id)} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center border border-gray-700 overflow-hidden">
                   {unit.meta.avatar_url ? <img src={unit.meta.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-600"/>}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="font-bold text-gray-200 truncate">{unit.profile.name}</div>
                   <div className="text-xs text-gray-500 truncate">{unit.profile.faction} • Lvl {unit.profile.level}</div>
                </div>
                {/* Mini Stats */}
                <div className="flex flex-col gap-1 text-[10px] opacity-60">
                   <div className="flex items-center gap-1"><Sword size={10} className="text-red-400"/> {unit.stats.phys}</div>
                   <div className="flex items-center gap-1"><Wand2 size={10} className="text-blue-400"/> {unit.stats.magic}</div>
                </div>
             </div>
           </Card>
         ))}
         {myUnits.length === 0 && !isEditMode && (
           <div className="col-span-full text-center text-gray-600 italic py-8 border border-dashed border-gray-800 rounded">
              {/* [DIALECT] */}
              {t('msg_no_units', "У этого персонажа нет призывных юнитов.")}
           </div>
         )}
       </div>
    </div>
  );
};

export default TabUnits;
