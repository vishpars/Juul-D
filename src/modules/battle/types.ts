
export type TimeUnit = 'action' | 'turn' | 'post' | 'ходы' | 'посты' | 'часы' | 'сутки' | 'сцена' | 'бой';
export type BattleStatus = 'startup' | 'active' | 'finished';

// --- JSON MAPPING STRUCTURES ---

export interface JsonBonus {
  val: number;
  stat: string; // 'phys', 'magic', 'unique', etc.
}

export interface JsonStatBlock {
  phys: number;
  magic: number;
  unique: number;
  [key: string]: number;
}

export interface JsonResource {
  label: string;
  current: number;
  max: number;
}

export interface JsonItem {
  id?: string;
  name: string;
  tags: string[];
  bonuses: JsonBonus[];
  desc_lore?: string;
  desc_mech?: string;
  is_equipped?: boolean; // Only for wearable
  qty?: number; // Only for inventory
  // Generated frontend ID
  _id: string; 
}

export interface JsonAbility {
  id?: string;
  name: string;
  tags: string[];
  bonuses: JsonBonus[];
  scaling?: string[];
  cd: number;
  cd_unit: string;
  dur: number;
  dur_unit: string;
  limit?: number;
  limit_unit?: string;
  desc_lore?: string;
  desc_mech?: string;
  // Generated frontend ID
  _id: string;
}

export interface JsonAbilityGroup {
  name: string;
  tags: string[]; // Inherited tags
  abilities: JsonAbility[];
}

export interface JsonPassiveItem {
  name: string;
  tags: string[];
  bonuses: JsonBonus[];
  trigger: string; // "ALWAYS", "COMBAT_START", etc.
  is_flaw: boolean;
  desc_mech?: string;
  desc_lore?: string;
  dur?: number;
  dur_unit?: string;
  // Generated frontend ID
  _id: string;
}

export interface JsonPassiveGroup {
  group_name: string;
  is_flaw_group?: boolean;
  items: JsonPassiveItem[];
}

export interface JsonIdentity {
  name: string;
  faction: string;
  level: number;
  npc_volume: string;
  bio?: string;
}

export interface JsonMeta {
  uid: string;
  avatar_url: string;
  master_id?: string; // For minions
}

export interface JsonInjury {
  count: number;
  custom_name: string;
  template_id: string;
}

export interface JsonMedCard {
  injuries: JsonInjury[];
  conditions: any[];
}

// --- APP INTERNAL STRUCTURES ---

export interface CharacterTemplate {
  id: string;
  meta: JsonMeta;
  profile: JsonIdentity; // Renamed from identity
  stats: JsonStatBlock;
  resources: JsonResource[];
  equipment: {
    usable: JsonItem[];
    wearable: JsonItem[];
    inventory: JsonItem[];
  };
  ability_groups: JsonAbilityGroup[];
  passives: JsonPassiveGroup[];
  medcard: JsonMedCard; // Renamed from med_card
  
  // Flattened lists for easier access in UI/Engine, populated during init
  flat_abilities: JsonAbility[]; 
  flat_passives: JsonPassiveItem[];
}

export interface ActiveEffect {
  id: string;
  name: string;
  tags?: string[];
  bonuses: JsonBonus[];
  duration_left: number;
  unit: string;
  original_ability_id?: string;
}

export interface Cooldown {
  id: string;
  name: string;
  val: number; // Current value
  max: number; // Original max
  unit: string; // 'turn', 'action', 'hour', etc.
}

export interface BattleParticipant extends CharacterTemplate {
  instance_id: string; // Unique battle ID
  is_player: boolean;
  
  battle_stats: {
    hp_penalty_current: number; // Legacy/Total
    trauma_phys: number;
    trauma_mag: number;
    trauma_uniq: number;
    actions_max: number;
    actions_left: number;
  };

  active_effects: ActiveEffect[];
  cooldowns: Cooldown[];
  usage_counts: Record<string, number>; // Map ability_id -> count
}

export interface LogEntry {
  id: string;
  round: number;
  timestamp: string;
  text_formatted: string;
  details?: any;
  type: 'action' | 'system' | 'round_change';
  summary?: string; // Manually edited summary for this log point
}

// --- TRAUMA DEFS ---
export interface TraumaDefinition {
  label: string;
  value: number; // Penalty value per instance
  stack: number | null; // Threshold to activate
  desc?: string;
}

export interface InjuryRule {
  tag: string;
  label: string;
  value: number;
  stack: number | null;
}

// --- SEQUENCE & DND TYPES ---

export type NodeType = 'action' | 'combo' | 'condition' | 'divider' | 'logic_chain';
export type LogicType = 'IF' | 'ELIF' | 'ELSE';
export type ReactionType = 'none' | 'dodge' | 'block';

export interface SequenceNode {
  id: string;
  type: NodeType;
  data?: {
    // Action Data
    charId?: string;
    abilityId?: string;
    weaponId?: string; // Selected weapon from equipment.usable
    excludedModifiers?: string[]; // Modifiers to exclude from calculation
    
    // Logic Data
    conditionText?: string;
    logicType?: LogicType; 
  };
  children: SequenceNode[];
}

export interface DraggableAbilityItem {
  type: 'SOURCE_ABILITY';
  charId: string;
  abilityId: string;
}

// --- LEGACY / COMPATIBILITY TYPES ---
export type Ability = JsonAbility;
export type Passive = JsonPassiveItem;

export interface TargetConfig {
  participant_id: string;
  reaction: ReactionType;
}

export interface SequenceStep {
  actor_id: string;
  ability_ids: string[];
  target_configs: TargetConfig[];
}
