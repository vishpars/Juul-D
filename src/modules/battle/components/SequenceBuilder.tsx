
import React, { useState, useEffect } from 'react';
import { BattleParticipant, SequenceStep, TargetConfig, ReactionType, SequenceNode, JsonAbility } from '../types';
import { calculateSequenceTree } from '../engine/calculator';
import { MOCK_ABILITIES } from '../constants';

interface Props {
  participants: BattleParticipant[];
  draft: SequenceStep;
  setDraft: React.Dispatch<React.SetStateAction<SequenceStep>>;
  onCommit: (formattedString: string, cost: number) => void;
}

const SequenceBuilder: React.FC<Props> = ({ participants, draft, setDraft, onCommit }) => {
  const actor = participants.find(p => p.instance_id === draft.actor_id);
  const [calculatedPreview, setCalculatedPreview] = useState<string>('');
  
  // Available abilities: Actor's own + Global Equipment (simplified here to just MOCK)
  const availableAbilities: JsonAbility[] = actor ? [...actor.flat_abilities, ...MOCK_ABILITIES] : MOCK_ABILITIES;
  const uniqueAbilities: JsonAbility[] = Array.from(new Map(availableAbilities.map(item => [item._id, item])).values());

  useEffect(() => {
    if (draft.actor_id && draft.ability_ids.length > 0) {
      // Create a temporary tree to calculate
      const nodes: SequenceNode[] = [{
          id: 'temp-combo',
          type: 'combo',
          children: draft.ability_ids.map(aid => ({
              id: `temp-${aid}`,
              type: 'action',
              data: { charId: draft.actor_id, abilityId: aid },
              children: []
          }))
      }];

      const result = calculateSequenceTree(nodes, participants);
      setCalculatedPreview(result.formattedString);
      
    } else {
      setCalculatedPreview('Ожидание действий...');
    }
  }, [draft, participants]);

  const toggleAbility = (id: string) => {
    setDraft(prev => {
      const exists = prev.ability_ids.includes(id);
      return {
        ...prev,
        ability_ids: exists 
          ? prev.ability_ids.filter(aid => aid !== id)
          : [...prev.ability_ids, id]
      };
    });
  };

  const updateTargetReaction = (participantId: string, reaction: ReactionType) => {
     setDraft(prev => {
        const targetIndex = prev.target_configs.findIndex(t => t.participant_id === participantId);
        if (targetIndex === -1) {
            // Add new
            return {
                ...prev,
                target_configs: [...prev.target_configs, { participant_id: participantId, reaction }]
            };
        }
        // Update existing
        const newTargets = [...prev.target_configs];
        newTargets[targetIndex] = { ...newTargets[targetIndex], reaction };
        return { ...prev, target_configs: newTargets };
     });
  };

  const removeTarget = (participantId: string) => {
      setDraft(prev => ({
          ...prev,
          target_configs: prev.target_configs.filter(t => t.participant_id !== participantId)
      }));
  };

  if (!actor) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-console-700 rounded-lg font-rune">
        Выберите Субъекта из списка слева.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-console-800 rounded-lg p-4 shadow-xl border border-console-700">
      
      {/* Header: Actor Info */}
      <div className="flex items-center gap-4 border-b border-console-700 pb-4 mb-4">
        <div className="w-12 h-12 rounded bg-yellow-600/20 text-yellow-500 flex items-center justify-center border border-yellow-600/50 font-bold">
            {actor.profile.name.substring(0, 2)}
        </div>
        <div>
            <h2 className="text-lg font-bold text-white font-rune uppercase tracking-wide">Конструктор</h2>
            <p className="text-sm text-slate-400">Субъект: <span className="text-yellow-400">{actor.profile.name}</span></p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        
        {/* Section 1: Abilities (Combo) */}
        <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wider">Навыки (Комбо)</h3>
            <div className="grid grid-cols-2 gap-2">
                {uniqueAbilities.map(ability => {
                    const isSelected = draft.ability_ids.includes(ability._id);
                    const order = draft.ability_ids.indexOf(ability._id) + 1;
                    
                    const totalBonus = ability.bonuses.reduce((acc, b) => acc + b.val, 0);

                    return (
                        <button
                            key={ability._id}
                            onClick={() => toggleAbility(ability._id)}
                            className={`
                                relative flex items-center justify-between px-3 py-2 rounded border text-sm text-left transition-all
                                ${isSelected 
                                    ? 'bg-blue-900/30 border-blue-500 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                                    : 'bg-console-900 border-console-700 text-slate-400 hover:border-slate-500'}
                            `}
                        >
                            <div className="flex flex-col">
                                <span className="font-semibold">{ability.name}</span>
                                <span className="text-[10px] opacity-70">Бонус: {totalBonus}</span>
                            </div>
                            {isSelected && (
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                                    {order}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Section 2: Targets & Reactions */}
        <div>
             <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wider">Цели и Реакции</h3>
             {draft.target_configs.length === 0 ? (
                 <div className="p-3 bg-console-900/50 border border-dashed border-console-700 rounded text-center text-sm text-slate-500">
                     Выберите цели в списке участников
                 </div>
             ) : (
                 <div className="space-y-2">
                     {draft.target_configs.map(tConfig => {
                         const targetParticipant = participants.find(p => p.instance_id === tConfig.participant_id);
                         if (!targetParticipant) return null;
                         
                         return (
                             <div key={tConfig.participant_id} className="flex items-center gap-3 bg-console-900 border border-console-600 p-2 rounded">
                                 <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px] text-white">
                                     {targetParticipant.profile.name.substring(0,2)}
                                 </div>
                                 <span className="text-sm font-medium text-slate-200 flex-1">{targetParticipant.profile.name}</span>
                                 
                                 <select 
                                    value={tConfig.reaction}
                                    onChange={(e) => updateTargetReaction(tConfig.participant_id, e.target.value as ReactionType)}
                                    className="bg-console-800 border border-console-600 text-xs text-white rounded px-2 py-1 outline-none focus:border-blue-500"
                                 >
                                     <option value="none">Нет реакции</option>
                                     <option value="dodge">Уклонение</option>
                                     <option value="block">Блок</option>
                                 </select>

                                 <button 
                                    onClick={() => removeTarget(tConfig.participant_id)}
                                    className="text-slate-500 hover:text-red-400 px-2"
                                 >
                                     &times;
                                 </button>
                             </div>
                         );
                     })}
                 </div>
             )}
        </div>

        {/* Section 3: Conditionals (Visual Mock) */}
        <div>
            <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Логика и Условия</h3>
                 <button className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline">+ Добавить Условие</button>
            </div>
            {/* Visual placeholder for IF block */}
            <div className="border-l-2 border-console-600 pl-3 ml-1 py-1">
                <div className="text-xs text-slate-500 italic mb-1">Если (Броня пробита)...</div>
                <div className="p-2 border border-dashed border-console-700 rounded bg-console-900/30 text-xs text-slate-600 text-center">
                    Перетащите действия сюда
                </div>
            </div>
        </div>

      </div>

      {/* Footer: Preview & Commit */}
      <div className="mt-4 pt-4 border-t border-console-700">
          <div className="mb-3">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Предпросмотр</span>
              <div className="mt-1 p-3 bg-black/40 border border-console-600 rounded font-mono text-sm text-green-400 break-words">
                  {calculatedPreview}
              </div>
          </div>
          
          <button 
            disabled={draft.ability_ids.length === 0}
            onClick={() => onCommit(calculatedPreview, 0)}
            className={`
                w-full py-3 rounded font-bold uppercase tracking-widest text-sm transition-all font-rune
                ${draft.ability_ids.length === 0
                    ? 'bg-console-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
                }
            `}
          >
              ВОПЛОТИТЬ
          </button>
      </div>
    </div>
  );
};

export default SequenceBuilder;
