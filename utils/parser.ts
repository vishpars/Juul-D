import { JsonOutput, Group, Item, StatBonus } from '../types';

const cleanText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
};

// Improved Bonus Parser
const parseBonuses = (text: string): StatBonus[] => {
  const bonuses: StatBonus[] = [];
  const lower = text.toLowerCase();
  
  // 1. Extract Explicit Bonuses (with +/- signs)
  // We look for patterns like: "Stat... +Number" or "+Number ... Stat"
  // The sign is crucial to distinguish from Cooldowns/Durations.
  
  // Regex to find all signed numbers
  const signedNumRegex = /([+-]\d+)/g;
  let numMatch;
  const foundStats = new Set<string>();

  while ((numMatch = signedNumRegex.exec(lower)) !== null) {
    const val = parseInt(numMatch[0]);
    const index = numMatch.index;
    
    // Look contextually around the number (e.g., 30 chars before and after)
    const start = Math.max(0, index - 40);
    const end = Math.min(lower.length, index + 40);
    const context = lower.substring(start, end);

    let stat = '';
    
    // Prioritize closest keywords
    if (context.match(/(?:физ|сила|тело|атак)/) && !context.match(/(?:маг|чары)/)) stat = 'phys';
    else if (context.match(/(?:маг|чары|разум|интеллект)/)) stat = 'magic';
    else if (context.match(/(?:уник|особен|специф)/)) stat = 'unique';

    if (stat) {
      bonuses.push({ val, stat });
      foundStats.add(stat);
    }
  }

  // 2. Check for Implicit/Declarative Stats (e.g. "Маг. способность" with no number -> +0)
  // Only add if we haven't found a bonus for this stat yet.
  
  if (!foundStats.has('phys') && lower.match(/(?:физ\.?\s*(?:способность|сила|урон)|физическая\s*(?:способность|сила))/)) {
      bonuses.push({ val: 0, stat: 'phys' });
  }
  if (!foundStats.has('magic') && lower.match(/(?:маг\.?\s*(?:способность|сила|урон)|магическая\s*(?:способность|сила))/)) {
      bonuses.push({ val: 0, stat: 'magic' });
  }
  if (!foundStats.has('unique') && lower.match(/(?:уник\.?\s*(?:способность|сила|урон)|уникальная\s*(?:способность|сила))/)) {
      bonuses.push({ val: 0, stat: 'unique' });
  }
  
  // Deduplicate by stat
  const uniqueBonuses: StatBonus[] = [];
  const seen = new Set<string>();
  // Prioritize non-zero values
  bonuses.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
  
  bonuses.forEach(b => {
      if (!seen.has(b.stat)) {
          seen.add(b.stat);
          uniqueBonuses.push(b);
      }
  });
  
  return uniqueBonuses;
};

const parseTimeParams = (text: string) => {
  const result = {
    cd: 0,
    cd_unit: '',
    dur: 0,
    dur_unit: '',
    limit: 0,
    limit_unit: ''
  };

  const lower = text.toLowerCase();

  // CD parsing
  const cdMatch = lower.match(/(?:кд|перезарядка|время восстановления)[\.:\s]*(\d+)\s*([а-я]+)?/);
  if (cdMatch) {
    result.cd = parseInt(cdMatch[1]);
    if (cdMatch[2] && cdMatch[2].startsWith('ход')) result.cd_unit = 'post';
    else if (cdMatch[2] && cdMatch[2].startsWith('раз')) result.cd_unit = 'times';
    else if (cdMatch[2] && cdMatch[2].startsWith('час')) result.cd_unit = 'hour';
    else result.cd_unit = 'post'; // default
  }

  // Duration parsing
  const durMatch = lower.match(/(?:длительность|время действия)[\.:\s]*(\d+)\s*([а-я]+)?/);
  if (durMatch) {
    result.dur = parseInt(durMatch[1]);
     if (durMatch[2] && durMatch[2].startsWith('ход')) result.dur_unit = 'post';
     else if (durMatch[2] && durMatch[2].startsWith('битв')) result.dur_unit = 'battle';
     else result.dur_unit = 'post';
  }

  return result;
};

const guessTags = (name: string, lore: string, mech: string): string[] => {
  const tags: Set<string> = new Set();
  const combined = (name + ' ' + lore + ' ' + mech).toLowerCase();

  if (combined.includes('огонь') || combined.includes('огнен')) tags.add('fire');
  if (combined.includes('меч ')) tags.add('sword');
  if (combined.includes('оружие')) tags.add('weapon');
  if (combined.includes('демон')) tags.add('demon');
  if (combined.includes('некромант') || combined.includes('нежить')) tags.add('necromancy');
  if (combined.includes('защит') || combined.includes('щит')) tags.add('defense');
  if (combined.includes('лечен') || combined.includes('исцел')) tags.add('heal');
  if (combined.includes('иллюз')) tags.add('illusion');
  if (combined.includes('ментал')) tags.add('mental');
  
  return Array.from(tags);
};

export const parseHtml = (htmlContent: string): JsonOutput => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const result: JsonOutput = {
    id: "generated-" + Math.random().toString(36).substr(2, 9),
    meta: {
      uid: "",
      master_id: "",
      avatar_url: "",
      owner_link: "",
      save_status: true,
      save_status_reason: ""
    },
    stats: { phys: 0, magic: 0, unique: 0 },
    medcard: { injuries: [], conditions: [] },
    profile: {
      name: "",
      level: 1,
      faction: "Свет",
      currencies: { juhe: 0, jumi: 0 },
      npc_volume: ""
    },
    passives: [],
    equipment: { usable: [], wearable: [], inventory: [] },
    resources: [],
    ability_groups: []
  };

  // 1. Basic Info
  const h1 = doc.querySelector('h1');
  if (h1) result.profile.name = cleanText(h1.textContent);

  const firstFigure = doc.querySelector('figure img');
  if (firstFigure) {
    const src = firstFigure.getAttribute('src');
    if (src) result.meta.avatar_url = src;
  }

  const contentDiv = doc.querySelector('.article_view');
  if (!contentDiv) return result;

  // 2. Scan for Global Stats explicitly anywhere in the doc using permissive regex
  const fullText = contentDiv.textContent || "";
  
  // Regex to catch "Физическая характеристик: +30" or "Физ: 30"
  // [^:]* matches anything (like "характеристика" or typos) until the colon
  const physMatch = fullText.match(/(?:физическая|физ\.?)[^:]*[:\s]*\+?(\d+)/i);
  if (physMatch) result.stats.phys = parseInt(physMatch[1]);

  const magicMatch = fullText.match(/(?:магическая|маг\.?)[^:]*[:\s]*\+?(\d+)/i);
  if (magicMatch) result.stats.magic = parseInt(magicMatch[1]);

  const uniqueMatch = fullText.match(/(?:уникальная|уник\.?)[^:]*[:\s]*\+?(\d+)/i);
  if (uniqueMatch) result.stats.unique = parseInt(uniqueMatch[1]);


  // 3. Structure Parsing
  let currentSection: 'PASSIVE' | 'ACTIVE' | 'EQUIPMENT' = 'PASSIVE';
  let currentGroup: Group | null = null;
  let currentItem: Item | null = null;

  const nodes = Array.from(contentDiv.children);

  for (const node of nodes) {
    const tagName = node.tagName.toLowerCase();
    const text = cleanText(node.textContent);
    const lowerText = text.toLowerCase();

    // -- Handle CITE (Section or Group headers) --
    if (tagName === 'cite' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
      const isPassiveHeader = lowerText.includes('пассивные');
      const isActiveHeader = lowerText.includes('активные') && !lowerText.includes('пассивные'); 
      const isEquipHeader = (lowerText.includes('снаряжение') || lowerText.includes('инвентарь') || lowerText.includes('имущество')) && !lowerText.includes('дебафф');
      const isDebuffHeader = lowerText.includes('дебафф') || lowerText.includes('прокляти') || lowerText.includes('особенности') || lowerText.includes('травмы');

      if (isPassiveHeader) {
        currentSection = 'PASSIVE';
        currentGroup = null; 
        continue;
      }
      if (isActiveHeader) {
        currentSection = 'ACTIVE';
        currentGroup = null;
        continue;
      }
      if (isEquipHeader) {
        currentSection = 'EQUIPMENT';
        currentGroup = null;
        continue;
      }
      
      // Explicitly handle Debuffs
      if (isDebuffHeader) {
          currentSection = 'PASSIVE'; 
          const groupName = text || "Дебаффы";
          const newGroup: Group = {
            id: Math.random().toString(36).substr(2, 9),
            name: groupName,
            group_name: groupName,
            items: [],
            tags: [],
            is_flaw_group: true,
            type: 'passive'
          };
          currentGroup = newGroup;
          result.passives.push(newGroup);
          continue;
      }

      // Group Name
      if (currentSection !== 'EQUIPMENT') {
        const groupName = text;
        const newGroup: Group = {
          id: Math.random().toString(36).substr(2, 9),
          name: groupName,
          group_name: groupName,
          items: [],
          tags: [],
          is_flaw_group: lowerText.includes('дебафф') || lowerText.includes('минус'),
          type: currentSection === 'PASSIVE' ? 'passive' : 'active'
        };

        currentGroup = newGroup;
        if (currentSection === 'PASSIVE') {
          result.passives.push(newGroup);
        } else {
          result.ability_groups.push(newGroup);
        }
      }
      continue;
    }

    // -- Handle Items (Blockquote) --
    if (tagName === 'blockquote') {
      if (!currentGroup && currentSection !== 'EQUIPMENT') {
        const defaultGroup: Group = {
            id: Math.random().toString(36).substr(2, 9),
            name: "Общее",
            group_name: "Общее",
            items: [],
            tags: [],
            is_flaw_group: false,
            type: currentSection === 'PASSIVE' ? 'passive' : 'active'
        };
        currentGroup = defaultGroup;
        if (currentSection === 'PASSIVE') result.passives.push(defaultGroup);
        else result.ability_groups.push(defaultGroup);
      }

      const itemName = cleanText(node.textContent);
      
      currentItem = {
        name: itemName,
        tags: [],
        cd: 0,
        cd_unit: "",
        dur: 0,
        dur_unit: "",
        limit: 0,
        limit_unit: "",
        desc_lore: "",
        desc_mech: "",
        bonuses: [], 
        trigger: "always",
        is_blocked: false,
        trigger_ability_id: null
      };

      if (currentSection === 'EQUIPMENT') {
        result.equipment.usable.push(currentItem);
      } else if (currentGroup) {
        currentGroup.items.push(currentItem);
      }
      continue;
    }

    // -- Handle Details (P) --
    if (tagName === 'p' && currentItem) {
      const hasStrong = node.querySelector('strong') || node.querySelector('b');
      const textContent = cleanText(node.textContent);
      
      if (hasStrong) {
        // Mechanics
        currentItem.desc_mech += (currentItem.desc_mech ? "\n" : "") + textContent;
        
        const bonuses = parseBonuses(textContent);
        if (bonuses.length > 0) {
          currentItem.bonuses.push(...bonuses);
        }

        const timeParams = parseTimeParams(textContent);
        if (timeParams.cd > 0) {
            currentItem.cd = timeParams.cd;
            currentItem.cd_unit = timeParams.cd_unit;
        }
        if (timeParams.dur > 0) {
            currentItem.dur = timeParams.dur;
            currentItem.dur_unit = timeParams.dur_unit;
        }

        if (textContent.toLowerCase().includes('заблокировано')) {
            currentItem.is_blocked = true;
        }
      } else {
        // Lore
        currentItem.desc_lore += (currentItem.desc_lore ? "\n" : "") + textContent;
      }
    }
  }

  // 4. Post-Process
  result.passives = result.passives.filter(g => g.items.length > 0);
  result.ability_groups = result.ability_groups.filter(g => g.items.length > 0);

  const processItems = (items: Item[]) => {
    items.forEach(item => {
        item.tags = guessTags(item.name, item.desc_lore, item.desc_mech);
        
        if (item.cd && item.cd > 0) item.trigger = "post";
        else item.trigger = "always";

        if (item.name.toLowerCase().includes('аура')) {
             item.trigger = "Combat_Start";
             if (!item.dur_unit) item.dur_unit = "battle";
        }
    });
  };

  result.passives.forEach(g => {
    processItems(g.items);
    g.abilities = JSON.parse(JSON.stringify(g.items));
  });
  
  result.ability_groups.forEach(g => {
    processItems(g.items);
    g.abilities = JSON.parse(JSON.stringify(g.items));
  });

  processItems(result.equipment.usable);

  return result;
};
