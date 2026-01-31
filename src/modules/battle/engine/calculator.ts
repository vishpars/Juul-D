
import { BattleParticipant, SequenceNode, JsonAbility, JsonItem, JsonBonus, InjuryRule } from '../types';
import { TRAUMA_DEFINITIONS } from '../constants';

interface CalculationResult {
  formattedString: string;
}

interface NodeProcessResult {
    text: string;
    tags: string[]; // Export tags of the action processed in this node
}

// --- CONFIGURATION ---

const DEFAULT_INJURY_RULES: InjuryRule[] = Object.entries(TRAUMA_DEFINITIONS).map(([tag, def]) => ({
    tag,
    label: def.label,
    value: def.value,
    stack: def.stack
}));

// Tags that do NOT update the "Last Offensive Action" context
// If an action has one of these, we keep the previous context (e.g. for AOE scenarios)
const NON_OFFENSIVE_TAGS = [
    'dodge', 'evade', 'movement', 'move', 'defense', 'block', 'parry', 'def',
    'уклонение', 'перемещение', 'защита', 'блок', 'парирование', 'бег'
];

const normalizeTags = (tags: string[] = []) => tags.map(t => t.toLowerCase().trim());

const hasTagOverlap = (sourceTags: string[], targetTags: string[]): boolean => {
    if (!sourceTags || sourceTags.length === 0) return false; 
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
    abilityTags: string[], // These should be MERGED tags (Ability + Weapon)
    abilityName: string,
    opponentTags: string[] = [] 
) => {
    const factors: { name: string, bonus: number, type: 'passive' | 'effect' | 'item', tags?: string[], desc?: string, mech?: string }[] = [];
    const normalizedAbilityTags = normalizeTags(abilityTags);
    const normalizedOpponentTags = normalizeTags(opponentTags);

    // Context Detection based on Action Tags
    const isDefensiveAction = normalizedAbilityTags.some(t => 
        ['defense', 'block', 'dodge', 'protection', 'parry', 'защита', 'блок', 'уклонение', 'парирование', 'def'].includes(t)
    );
    const isOffensiveAction = normalizedAbilityTags.some(t => 
        ['attack', 'hit', 'damage', 'melee', 'ranged', 'offense', 'атака', 'удар', 'урон', 'ближний', 'дальний'].includes(t)
    );

    // 1. Passives
    if (participant.flat_passives) {
        participant.flat_passives.forEach(pas => {
            const trigger = (pas.trigger || 'ALWAYS').toUpperCase();
            
            // Case A: Linked Ability (Specific Trigger)
            if (trigger === 'ABILITY' || trigger.includes('ABILITY')) {
                if (pas.trigger_ability_id === abilityName) {
                    factors.push({ 
                        name: pas.name, 
                        bonus: sumBonuses(pas.bonuses), 
                        type: 'passive', 
                        tags: [...(pas.tags || []), 'ability_mod'],
                        mech: pas.desc_mech 
                    });
                }
                return; 
            }

            // Case B: Weakness / Resistance
            if ((trigger === 'WEAKNESS/RESISTANCE' || trigger === 'WEAKRES') && opponentTags.length > 0) {
                if (hasTagOverlap(normalizeTags(pas.tags), normalizedOpponentTags)) {
                    factors.push({
                        name: pas.name,
                        bonus: sumBonuses(pas.bonuses),
                        type: 'passive',
                        tags: [...(pas.tags || []), 'weak_res'],
                        mech: pas.desc_mech
                    });
                }
                return;
            }

            // Case C: Context Triggers
            if (trigger === 'ON_HIT' && !isOffensiveAction) return;
            if (trigger === 'ON_DEFENSE' && !isDefensiveAction) return;

            // Case D: Standard Tag Matching (matches against MERGED ability+weapon tags)
            if (hasTagOverlap(normalizeTags(pas.tags), normalizedAbilityTags)) {
                let typeLabel = 'passive';
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
    excludedModifiers: string[] = [],
    opponentTags: string[] = [],
    combinedTags: string[] // New: explicitly passed merged tags
): number => {
    let total = 0;
    
    // 1. Ability Bonuses + Base Stats
    const usedStats = new Set<string>();
    
    // Infer stats from MERGED tags
    combinedTags.forEach(t => {
        const lower = t.toLowerCase();
        if (lower.includes('phys') || lower.includes('физ')) usedStats.add('phys');
        if (lower.includes('mag') || lower.includes('маг')) usedStats.add('magic');
        if (lower.includes('uniq') || lower.includes('уник')) usedStats.add('unique');
    });

    if (ability.bonuses) {
        ability.bonuses.forEach(b => {
            const bonusVal = Number(b.val) || 0;
            const bStat = (b.stat || '').toLowerCase();

            // Always add Clean Bonus
            if (bStat === 'cleanb') {
                total += bonusVal;
                return; 
            }

            if (bStat) {
                // Add Base Stat if defined (e.g. {stat: 'phys', val: 0} means add Phys Stat)
                if (bStat.includes('phys') || bStat.includes('физ')) {
                    usedStats.add('phys');
                    const base = Number(participant.stats.phys) || 0;
                    total += (base + calculateLiveStatPenalty(participant, 'phys', injuryRules));
                } 
                if (bStat.includes('mag') || bStat.includes('маг')) {
                    usedStats.add('magic');
                    const base = Number(participant.stats.magic) || 0;
                    total += (base + calculateLiveStatPenalty(participant, 'magic', injuryRules));
                } 
                if (bStat.includes('uniq') || bStat.includes('уник')) {
                    usedStats.add('unique');
                    const base = Number(participant.stats.unique) || 0;
                    total += (base + calculateLiveStatPenalty(participant, 'unique', injuryRules));
                }
            }
            // Add fixed value
            total += bonusVal;
        });
    }

    // 2. Weapon Bonus (Strict Matching + Clean Support)
    if (weapon && weapon.bonuses) {
        weapon.bonuses.forEach(b => {
            const bStat = (b.stat || '').toLowerCase();
            const bVal = Number(b.val) || 0;

            let shouldApply = false;

            // Always apply clean bonus from weapon
            if (bStat === 'cleanb') {
                shouldApply = true;
            } else if (!bStat || bStat === 'any') {
                shouldApply = true;
            } else if ((bStat.includes('phys') || bStat.includes('физ')) && usedStats.has('phys')) {
                shouldApply = true;
            } else if ((bStat.includes('mag') || bStat.includes('маг')) && usedStats.has('magic')) {
                shouldApply = true;
            } else if ((bStat.includes('uniq') || bStat.includes('уник')) && usedStats.has('unique')) {
                shouldApply = true;
            }

            if (shouldApply) {
                total += bVal;
            }
        });
    }

    // 3. External Factors (Using merged tags)
    const externalFactors = getMatchingFactors(participant, combinedTags, ability.name, opponentTags);
    
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
  
  // Helper to extract data AND metadata about an action
  const getActionData = (charId: string, abilityId: string, weaponId?: string, excludedModifiers: string[] = [], incomingTags: string[] = []) => {
        const actor = participants.find(p => p.instance_id === charId || p.id === charId);
        if (!actor) return null;

        let ability = actor.flat_abilities?.find(a => a._id === abilityId);
        
        if (!ability && actor.ability_groups) {
            for (const group of actor.ability_groups) {
                const found = group.abilities.find(a => a._id === abilityId || (a.id && a.id === abilityId) || a.name === abilityId);
                if (found) { ability = found; break; }
            }
        }

        if (!ability) return null;

        const weapon = actor.equipment.usable.find(w => w._id === weaponId || (w.id && w.id === weaponId) || w.name === weaponId);

        // --- MERGE TAGS ---
        // Create a unified list of tags from Ability + Weapon to represent the "Action"
        const abilityTags = normalizeTags(ability.tags);
        const weaponTags = normalizeTags(weapon?.tags || []);
        const combinedTags = Array.from(new Set([...abilityTags, ...weaponTags]));

        const bonusVal = calculateTotalBonus(actor, ability, weapon, injuryRules, excludedModifiers, incomingTags, combinedTags);
        
        // --- PASSIVE NAMES FOR LOGGING ---
        // Note: We pass combinedTags here so passives reacting to weapon tags (e.g. "Fire") work
        const externalFactors = getMatchingFactors(actor, combinedTags, ability.name, incomingTags);
        
        const activeModifiers = externalFactors
            .filter(f => !excludedModifiers.includes(f.name))
            .filter(f => {
                if (f.type === 'passive') {
                    // Show if trigger is specific
                    // WEAKRES is purposefully excluded from this list so it is applied mathematically but hidden in logs
                    const isTriggered = f.tags?.some(t => ['ability_mod', 'on_hit', 'on_defense'].includes(t));
                    return isTriggered;
                }
                return true;
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

        const isForm = combinedTags.some(t => ['form', 'форма'].includes(t.toLowerCase()));
        const isBuff = combinedTags.some(t => ['buff', 'бафф'].includes(t.toLowerCase()));

        return { 
            name: nameStr, 
            actorName: actor.profile.name,
            bonus: `${sign}${bonusVal}`, 
            dice: diceStr, 
            isForm,
            isBuff,
            mechanics: ability.desc_mech,
            modifiers: activeModifiers,
            tags: combinedTags // EXPORT MERGED TAGS FOR NEXT ACTION
        };
  };

  // Main processing loop needs to maintain state
  const processNode = (node: SequenceNode, lastTags: string[]): NodeProcessResult => {
    // Divider acts as a unique token
    if (node.type === 'divider') return { text: '__DIVIDER__', tags: [] };

    // Handle Logic Chain Container
    if (node.type === 'logic_chain') {
        const childrenTexts = node.children.map(c => processNode(c, lastTags).text);
        const childrenStr = childrenTexts.join(' | ');
        return { text: `\n{ ${childrenStr} }`, tags: [] };
    }

    if (node.type === 'condition') {
      const conditionText = node.data?.conditionText || '...';
      const childStrings = node.children.map(c => processNode(c, lastTags).text).filter(s => s && s.trim() !== '');
      let innerContent = childStrings.join(' - ');
      return { text: `${conditionText}: ${innerContent}`, tags: [] };
    }

    if (node.type === 'combo') {
      const validChildren = node.children.filter(c => c.type === 'action');
      if (validChildren.length === 0) return { text: '', tags: [] };
      
      const dataList: any[] = [];
      let currentTags = [...lastTags];

      // Process combo children sequentially context-wise
      validChildren.forEach(c => {
          const d = getActionData(c.data?.charId || '', c.data?.abilityId || '', c.data?.weaponId, c.data?.excludedModifiers, currentTags);
          if (d) {
              dataList.push(d);
              // Only update context if action is offensive
              const hasIgnoredTag = d.tags.some((t: string) => NON_OFFENSIVE_TAGS.includes(t.toLowerCase()));
              if (!hasIgnoredTag && d.tags.length > 0) {
                  currentTags = d.tags;
              }
          }
      });

      if (dataList.length === 0) return { text: '', tags: [] };

      const namesPart = dataList.map(d => `${d.actorName}: ${d.name}`).join(' + ');
      const bonusesPart = dataList.map(d => (d.isForm || d.isBuff) ? '-' : `${d.dice}${d.bonus}`).join('/');
      
      let comboString = `[${namesPart}(${bonusesPart})]`;

      const allModifiers: string[] = [];
      dataList.forEach(d => {
          if (d.modifiers && d.modifiers.length > 0) {
              allModifiers.push(...d.modifiers);
          }
      });

      if (allModifiers.length > 0) {
          comboString += ` - ${allModifiers.join(' - ')}`;
      }
      
      // Return last useful tags
      return { text: comboString, tags: currentTags };
    }

    if (node.type === 'action') {
        const data = getActionData(node.data?.charId || '', node.data?.abilityId || '', node.data?.weaponId, node.data?.excludedModifiers, lastTags);
        if (!data) return { text: '[Unknown Action]', tags: [] };
        
        let mainString = '';

        if (data.isForm) {
            mainString = `<${data.actorName}: ${data.name} (${data.mechanics || ''})>`;
        } else if (data.isBuff) {
            mainString = `(${data.actorName}: ${data.name} (${data.mechanics || ''}))`;
        } else {
            mainString = `${data.actorName}: ${data.name}(${data.dice}${data.bonus})`;
        }

        if (data.modifiers && data.modifiers.length > 0) {
            mainString += ' - ' + data.modifiers.join(' - ');
        }

        return { text: mainString, tags: data.tags };
    }

    return { text: '', tags: [] };
  };

  let lastTags: string[] = [];
  const parts: string[] = [];

  for (const node of nodes) {
      const result = processNode(node, lastTags);
      if (result.text) {
          parts.push(result.text);
      }
      
      // Update global context ONLY if the action is NOT Dodge/Move/Defense
      // This allows AOE attacks (which set context) to persist through multiple defensive responses
      if (result.tags && result.tags.length > 0) {
          const hasIgnoredTag = result.tags.some(t => NON_OFFENSIVE_TAGS.includes(t.toLowerCase()));
          if (!hasIgnoredTag) {
              lastTags = result.tags;
          }
      }
      
      if (node.type === 'divider') {
          // Optional: Reset tags on divider? No specific requirement, but logical.
          // lastTags = []; 
      }
  }
  
  let finalString = '';
  let isStartOfLine = true; 
  
  parts.forEach((part) => {
      if (part === '__DIVIDER__') {
          finalString += '\n\n'; 
          isStartOfLine = true;
      } else {
          const cleanPart = part.trim();
          if (cleanPart) {
              if (isStartOfLine) {
                  finalString += '> ' + cleanPart;
                  isStartOfLine = false;
              } else {
                  finalString += ' - ' + cleanPart;
              }
          }
      }
  });
  
  return { formattedString: finalString.trim() };
};
