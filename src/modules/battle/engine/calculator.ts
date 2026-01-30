
import { BattleParticipant, SequenceNode, JsonAbility, JsonItem, JsonBonus, InjuryRule } from '../types';
import { TRAUMA_DEFINITIONS } from '../constants';

interface CalculationResult {
  formattedString: string;
}

// --- CONFIGURATION ---

const DEFAULT_INJURY_RULES: InjuryRule[] = Object.entries(TRAUMA_DEFINITIONS).map(([tag, def]) => ({
    tag,
    label: def.label,
    value: def.value,
    stack: def.stack
}));

const normalizeTags = (tags: string[] = []) => tags.map(t => t.toLowerCase().trim());

const hasTagOverlap = (sourceTags: string[], targetTags: string[]): boolean => {
    if (!sourceTags || sourceTags.length === 0) return true; 
    return sourceTags.some(t => targetTags.includes(t));
};

const sumBonuses = (bonuses: JsonBonus[] = []): number => {
    return bonuses.reduce((acc, b) => acc + (Number(b.val) || 0), 0);
};

const calculateLiveStatPenalty = (
    participant: BattleParticipant, 
    statType: 'phys' | 'magic' | 'unique',
    rules: InjuryRule[]
): number => {
    if (!participant.medcard || !participant.medcard.injuries) return 0;

    let totalPenalty = 0;
    const suffix = `_${statType === 'unique' ? 'uniq' : statType}`; 

    const injuryCounts: Record<string, number> = {};
    participant.medcard.injuries.forEach(inj => {
        const tag = inj.template_id;
        if (tag.endsWith(suffix)) {
            injuryCounts[tag] = (injuryCounts[tag] || 0) + (inj.count || 1);
        }
    });

    Object.entries(injuryCounts).forEach(([tag, count]) => {
        const rule = rules.find(r => r.tag === tag);
        if (rule) {
            const penaltyValue = Number(rule.value);
            const stackSize = Number(rule.stack);

            if (stackSize > 0) {
                const stacksApplied = Math.floor(count / stackSize);
                totalPenalty += (stacksApplied * penaltyValue);
            } else {
                totalPenalty += (count * penaltyValue);
            }
        }
    });

    return totalPenalty;
};

export const getMatchingFactors = (
    participant: BattleParticipant,
    abilityTags: string[]
) => {
    const factors: { name: string, bonus: number, type: 'passive' | 'effect' | 'item', tags?: string[], desc?: string, mech?: string }[] = [];
    const normalizedAbilityTags = normalizeTags(abilityTags);

    // Context Detection based on Action Tags
    const isDefensiveAction = normalizedAbilityTags.some(t => 
        ['defense', 'block', 'dodge', 'protection', 'parry', 'защита', 'блок', 'уклонение', 'парирование', 'def'].includes(t)
    );
    const isOffensiveAction = normalizedAbilityTags.some(t => 
        ['attack', 'hit', 'damage', 'melee', 'ranged', 'offense', 'атака', 'удар', 'урон', 'ближний', 'дальний'].includes(t)
    );

    // 1. Passives (Use FLAT list which already has inherited tags from Supabase load)
    if (participant.flat_passives) {
        participant.flat_passives.forEach(pas => {
            const trigger = (pas.trigger || 'ALWAYS').toUpperCase();
            
            // Logic: Include ALWAYS, plus conditional triggers if tags match
            // "ALWAYS" - Base stat mods
            // "ABILITY" - Mods specific to abilities (e.g. "+5 to Fire spells")
            // "ON_HIT" - Mods that apply when hitting (e.g. "+2 Damage")
            // "ON_DEFENSE" - Mods when defending (e.g. "+2 Block")
            
            const isRelevantTrigger = 
                trigger === 'ALWAYS' || 
                trigger === 'PASSIVE' || 
                trigger === 'ПАССИВНО / ВСЕГДА' ||
                trigger === 'ABILITY' ||
                trigger === 'ON_HIT' ||
                trigger === 'ON_DEFENSE';

            if (isRelevantTrigger && hasTagOverlap(normalizeTags(pas.tags), normalizedAbilityTags)) {
                
                // Context Check: Prevent defensive passives triggering on attacks and vice versa
                if (trigger === 'ON_DEFENSE' && !isDefensiveAction) return; 
                if (trigger === 'ON_HIT' && !isOffensiveAction) return;

                let typeLabel = 'passive';
                if (trigger === 'ABILITY') typeLabel = 'ability_mod';
                if (trigger === 'ON_HIT') typeLabel = 'on_hit';
                if (trigger === 'ON_DEFENSE') typeLabel = 'on_defense';

                factors.push({ 
                    name: pas.name, 
                    bonus: sumBonuses(pas.bonuses), 
                    type: 'passive', 
                    tags: [...(pas.tags || []), typeLabel],
                    mech: pas.desc_mech 
                });
            }
        });
    }

    // 2. Active Effects
    if (participant.active_effects) {
        participant.active_effects.forEach(eff => {
            if (hasTagOverlap(normalizeTags(eff.tags), normalizedAbilityTags)) {
                // Try to find source ability for better description
                let mechanics = '';
                if (eff.original_ability_id) {
                    const source = participant.flat_abilities.find(a => a._id === eff.original_ability_id);
                    if (source) mechanics = source.desc_mech || '';
                }

                factors.push({ 
                    name: eff.name, 
                    bonus: sumBonuses(eff.bonuses), 
                    type: 'effect', 
                    tags: eff.tags,
                    desc: `Active effect. Duration: ${eff.duration_left} ${eff.unit}`,
                    mech: mechanics
                });
            }
        });
    }

    // 3. Wearables
    if (participant.equipment && participant.equipment.wearable) {
        participant.equipment.wearable.forEach(item => {
            if (item.is_equipped && hasTagOverlap(normalizeTags(item.tags), normalizedAbilityTags)) {
                factors.push({ 
                    name: item.name, 
                    bonus: sumBonuses(item.bonuses), 
                    type: 'item', 
                    tags: item.tags,
                    mech: item.desc_mech,
                    desc: item.desc_lore
                });
            }
        });
    }

    return factors;
};

const calculateTotalBonus = (
    participant: BattleParticipant, 
    ability: JsonAbility, 
    weapon: JsonItem | undefined,
    injuryRules: InjuryRule[],
    excludedModifiers: string[] = []
): number => {
    let total = 0;
    
    const usedStats = new Set<string>();
    if (ability.bonuses) {
        ability.bonuses.forEach(b => {
            const bonusVal = Number(b.val) || 0;
            if (b.stat) {
                const statKey = b.stat.toLowerCase();
                if (statKey.includes('phys') || statKey.includes('физ')) {
                    if (!usedStats.has('phys')) {
                        const base = Number(participant.stats.phys) || 0;
                        total += (base + calculateLiveStatPenalty(participant, 'phys', injuryRules));
                        usedStats.add('phys');
                    }
                } 
                if (statKey.includes('mag') || statKey.includes('маг')) {
                    if (!usedStats.has('magic')) {
                        const base = Number(participant.stats.magic) || 0;
                        total += (base + calculateLiveStatPenalty(participant, 'magic', injuryRules));
                        usedStats.add('magic');
                    }
                } 
                if (statKey.includes('uniq') || statKey.includes('уник')) {
                    if (!usedStats.has('unique')) {
                        const base = Number(participant.stats.unique) || 0;
                        total += (base + calculateLiveStatPenalty(participant, 'unique', injuryRules));
                        usedStats.add('unique');
                    }
                }
            }
            total += bonusVal;
        });
    }

    if (weapon) total += sumBonuses(weapon.bonuses);

    const externalFactors = getMatchingFactors(participant, ability.tags);
    externalFactors.forEach(f => {
        if (!excludedModifiers.includes(f.name)) {
            total += f.bonus;
        }
    });

    return total;
};


// --- TREE WALKER ---

const getDiceString = (level: number = 1): string => {
    if (level >= 5) return '3d100';
    if (level >= 3) return '2d100';
    return '1d100';
};

export const calculateSequenceTree = (
  nodes: SequenceNode[],
  participants: BattleParticipant[],
  injuryRules: InjuryRule[] = DEFAULT_INJURY_RULES 
): CalculationResult => {
  
  const getActionData = (charId: string, abilityId: string, weaponId?: string, excludedModifiers: string[] = []) => {
        const actor = participants.find(p => p.instance_id === charId || p.id === charId);
        if (!actor) return null;

        // Use flat_abilities which has inherited tags
        let ability = actor.flat_abilities?.find(a => a._id === abilityId);
        
        // Fallback search if id mismatch (rare now)
        if (!ability && actor.ability_groups) {
            for (const group of actor.ability_groups) {
                const found = group.abilities.find(a => a._id === abilityId || (a.id && a.id === abilityId) || a.name === abilityId);
                if (found) { ability = found; break; }
            }
        }

        if (!ability) return null;

        const weapon = actor.equipment.usable.find(w => w._id === weaponId || (w.id && w.id === weaponId) || w.name === weaponId);

        const bonusVal = calculateTotalBonus(actor, ability, weapon, injuryRules, excludedModifiers);
        
        // --- NEW: EXTRACT PASSIVE NAMES FOR LOGGING ---
        const externalFactors = getMatchingFactors(actor, ability.tags);
        const activeModifiers = externalFactors
            .filter(f => !excludedModifiers.includes(f.name))
            .filter(f => {
                // Filter for triggers that should be displayed in the chain
                // We specifically want 'ability_mod', 'on_hit', 'on_defense' or anything with explicit mechanics
                return f.tags?.some(t => ['ability_mod', 'on_hit', 'on_defense'].includes(t)) || f.mech;
            })
            .map(f => {
                const mechStr = f.mech ? `(${f.mech})` : '';
                return `${actor.profile.name}: ${f.name}${mechStr}`;
            });
        // ----------------------------------------------

        const sign = bonusVal >= 0 ? '+' : '';
        const weaponStr = weapon && weapon.name ? ` [${weapon.name}]` : ''; 
        const nameStr = `${ability.name}${weaponStr}`;
        const diceStr = getDiceString(actor.profile.level);

        const isForm = ability.tags.some(t => ['form', 'форма'].includes(t.toLowerCase()));
        const isBuff = ability.tags.some(t => ['buff', 'бафф'].includes(t.toLowerCase()));

        return { 
            name: nameStr, 
            actorName: actor.profile.name,
            bonus: `${sign}${bonusVal}`, 
            dice: diceStr, 
            isForm,
            isBuff,
            mechanics: ability.desc_mech,
            modifiers: activeModifiers // Array of strings like "Name: Passive(Effect)"
        };
  };

  const processNode = (node: SequenceNode): string => {
    // Divider acts as a unique token
    if (node.type === 'divider') return '__DIVIDER__';

    // Handle Logic Chain Container
    if (node.type === 'logic_chain') {
        const childrenStr = node.children.map(c => processNode(c)).join(' | ');
        return `\n{ ${childrenStr} }`;
    }

    if (node.type === 'condition') {
      const conditionText = node.data?.conditionText || '...';
      const childStrings = node.children.map(c => processNode(c)).filter(s => s && s.trim() !== '');
      let innerContent = childStrings.join(' - ');
      return `${conditionText}: ${innerContent}`;
    }

    if (node.type === 'combo') {
      const validChildren = node.children.filter(c => c.type === 'action');
      if (validChildren.length === 0) return '';
      
      const dataList = validChildren.map(c => 
          getActionData(c.data?.charId || '', c.data?.abilityId || '', c.data?.weaponId, c.data?.excludedModifiers)
      ).filter(Boolean) as any[];

      if (dataList.length === 0) return '';

      // Standard format: [Name: Ability + Name2: Ability2(Dice1/Dice2)]
      const namesPart = dataList.map(d => `${d.actorName}: ${d.name}`).join(' + ');
      const bonusesPart = dataList.map(d => (d.isForm || d.isBuff) ? '-' : `${d.dice}${d.bonus}`).join('/');
      
      let comboString = `[${namesPart}(${bonusesPart})]`;

      // Collect all triggered modifiers from all actions in sequence
      const allModifiers: string[] = [];
      dataList.forEach(d => {
          if (d.modifiers && d.modifiers.length > 0) {
              allModifiers.push(...d.modifiers);
          }
      });

      // Append modifiers at the very end of the combo string
      if (allModifiers.length > 0) {
          comboString += ` - ${allModifiers.join(' - ')}`;
      }
      
      return comboString;
    }

    if (node.type === 'action') {
        const data = getActionData(node.data?.charId || '', node.data?.abilityId || '', node.data?.weaponId, node.data?.excludedModifiers);
        if (!data) return '[Unknown Action]';
        
        let mainString = '';

        if (data.isForm) {
            // Form format: <Character: Name (Mechanics)>
            mainString = `<${data.actorName}: ${data.name} (${data.mechanics || ''})>`;
        } else if (data.isBuff) {
            // Buff format: (Character: Name (Mechanics))
            mainString = `(${data.actorName}: ${data.name} (${data.mechanics || ''}))`;
        } else {
            // Attack format: Character: Name(Dice+Bonus)
            mainString = `${data.actorName}: ${data.name}(${data.dice}${data.bonus})`;
        }

        // Append triggered passives
        if (data.modifiers && data.modifiers.length > 0) {
            mainString += ' - ' + data.modifiers.join(' - ');
        }

        return mainString;
    }

    return '';
  };

  const parts = nodes.map(n => processNode(n)).filter(Boolean);
  
  let finalString = '';
  let isStartOfLine = true; // Use this flag to determine if we need a marker prefix
  
  parts.forEach((part, index) => {
      // If we hit a divider, force a new block
      if (part === '__DIVIDER__') {
          // Double newline creates a gap in the log viewer (empty line + new line)
          finalString += '\n\n'; 
          isStartOfLine = true;
      } else {
          const cleanPart = part.trim();
          if (cleanPart) {
              if (isStartOfLine) {
                  finalString += '> ' + cleanPart;
                  isStartOfLine = false;
              } else {
                  // Connect to previous part
                  finalString += ' - ' + cleanPart;
              }
          }
      }
  });
  
  return { formattedString: finalString.trim() };
};
