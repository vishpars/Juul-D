
export enum Faction {
  LIGHT = "Свет",
  DARK = "Тьма",
  NPC = "Бестиарий",
  GRAVEYARD = "Могильник"
}

export enum StatType {
  PHYS = "phys",
  MAGIC = "magic",
  UNIQUE = "unique"
}

export enum PassiveTrigger {
  ALWAYS = "Always",
  ON_HIT = "On Hit",
  ON_KILL = "On Kill",
  LOW_HP = "Low HP",
  COMBAT_START = "Combat Start",
  ACTIVATED = "Activated",
  INFLICT_PHYS = "Inflict Phys Injury",
  INFLICT_MAG = "Inflict Mag Injury",
  TAKE_PHYS = "Take Phys Injury",
  TAKE_MAG = "Take Mag Injury"
}

export interface Bonus {
  stat: StatType;
  val: number;
}

export interface Resource {
  label: string;
  current: number;
  max: number;
}

export interface Wearable {
  name: string;
  bonuses: Bonus[];
  tags: string[];
  is_equipped: boolean;
  desc_lore: string;
  desc_mech: string;
}

export interface Usable {
  name: string;
  bonuses: Bonus[];
  tags: string[];
  desc_lore: string;
  desc_mech: string;
}

export interface InventoryItem {
  name: string;
  desc_lore: string;
  desc_mech: string;
  qty: number;
}

export interface Ability {
  name: string;
  bonuses: Bonus[];
  tags: string[];
  desc_lore: string;
  desc_mech: string;
  cd: number;
  cd_unit: string;
  dur: number;
  dur_unit: string;
  limit?: number;
  limit_unit?: string;
}

export interface AbilityGroup {
  name: string;
  tags: string[];
  abilities: Ability[];
  is_hidden?: boolean;
}

export interface Passive {
  name: string;
  bonuses: Bonus[];
  trigger: string;
  tags: string[];
  desc_lore: string;
  desc_mech: string;
  is_flaw: boolean;
  cd: number;
  cd_unit: string;
  dur: number;
  dur_unit: string;
}

export interface PassiveGroup {
  group_name: string;
  tags: string[];
  items: Passive[];
  is_flaw_group?: boolean;
}

export interface InjuryDefinition {
  tag: string;
  label: string;
  value: number;
  type: 1 | 2 | 3;
  desc?: string;
  stack?: number;
}

export interface Injury {
  template_id: string;
  custom_name: string;
  count: number;
}

export interface Condition {
  name: string;
  desc: string;
  turns: number;
}

export interface TimeUnit {
  tag: string;
  label: string;
  battle: boolean;
}

export interface TrainingRecord {
  char_id: string;
  limits: string; // Format "3/4/2/2/2"
  current: Record<string, number[]>; // Key is day "1", "2". Value is array [0,0,0,0,0]
}

export interface CharacterData {
  id: string;
  meta: {
    uid: string;
    master_id?: string;
    owner_link: string;
    avatar_url: string;
    save_status: boolean;
    save_status_reason?: string;
  };
  profile: {
    name: string;
    faction: Faction;
    npc_volume: string;
    level: number;
    bio: string;
    currencies: {
      juhe: number;
      jumi: number;
    };
  };
  stats: {
    phys: number;
    magic: number;
    unique: number;
  };
  resources: Resource[];
  equipment: {
    wearable: Wearable[];
    usable: Usable[];
    inventory: InventoryItem[];
  };
  ability_groups: AbilityGroup[];
  passives: PassiveGroup[];
  medcard: {
    injuries: Injury[];
    conditions: Condition[];
  };
}
