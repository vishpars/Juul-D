export interface StatBonus {
  val: number;
  stat: string; // 'phys', 'magic', 'unique'
}

export interface Item {
  name: string;
  tags: string[];
  cd: number | null;
  cd_unit: string;
  dur: number | null;
  dur_unit: string;
  limit: number | null;
  limit_unit: string;
  // Removed nested 'desc' object
  desc_lore: string;
  desc_mech: string;
  bonuses: StatBonus[];
  trigger: string;
  trigger_ability_id?: string | null;
  is_blocked?: boolean;
  is_flaw?: boolean;
}

export interface Group {
  id: string; // Added for UI management
  name: string;
  tags: string[];
  items: Item[];
  abilities?: Item[]; 
  group_name: string;
  is_flaw_group: boolean;
  is_hidden?: boolean;
  type: 'passive' | 'active'; // Added to track where it belongs in UI
}

export interface Equipment {
  usable: Item[];
  wearable: Item[];
  inventory: Item[];
}

export interface Stats {
  phys: number;
  magic: number;
  unique: number;
}

export interface Meta {
  uid: string;
  master_id: string;
  avatar_url: string;
  owner_link: string;
  save_status: boolean;
  save_status_reason: string;
}

export interface JsonOutput {
  id: string;
  meta: Meta;
  stats: Stats;
  medcard: {
    injuries: any[];
    conditions: any[];
  };
  profile: {
    name: string;
    level: number;
    faction: string;
    currencies: {
      juhe: number;
      jumi: number;
    };
    npc_volume: string;
  };
  passives: Group[];
  equipment: Equipment;
  resources: any[];
  ability_groups: Group[];
}
