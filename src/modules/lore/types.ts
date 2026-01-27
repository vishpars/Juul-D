
export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
  ARTIFACT = 'Artifact'
}

export enum BookType {
  BOOK = 'Book',
  SCROLL = 'Scroll',
  GRIMOIRE = 'Grimoire',
  TABLET = 'Tablet'
}

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  effects?: string;
  active: boolean;
  active_effects?: string;
  category: number | null; // Foreign Key to LibraryCategory
  created_at?: string;
}

export interface LibraryCategory {
  id: number;
  name: string;
  parent_id?: number | null;
  code?: string;
  segment?: number;
  level?: number;
}

export interface LoreCategory {
  id: string; // UUID
  name: string;
  description?: string;
  parent_id?: string | null;
  created_at?: string;
}

export enum QuestType {
  PERSONAL = 'Personal',
  FACTION = 'Faction',
  PUBLIC = 'Public'
}

export enum QuestStatus {
  AVAILABLE = 'Available',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

// New Alignment type for visual styling
export type QuestAlignment = 'Dark' | 'Light' | 'NPC' | 'Player' | 'Neutral';

export interface QuestDetails {
  givenBy: string;
  acceptedBy: string[]; // List of names
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  type: QuestType;
  status: QuestStatus;
  alignment?: QuestAlignment; // Added for color coding
  details: QuestDetails;
  created_at?: string;
}

export interface CharacterData {
    identity: {
        name: string;
        faction: string;
        level?: number;
        bio?: string;
        avatar_url?: string; // Added avatar support
    };
    avatar_url?: string; // Fallback location
    stats?: any;
    // Add other JSON fields as needed
}

export interface Character {
  id: string;
  name: string; // Column name
  data?: CharacterData; // JSONB column
  faction?: string; // Legacy/Fallback
  class?: string; // Legacy/Fallback
}

export interface Location {
  id: string;
  name: string;
  description: string;
  img: string;
  parent?: string | null; // Column is named 'parent'
  associated_map_id?: string | null; // Link to a GameMap
  created_at?: string;
}

export interface MapPin {
  id: string;
  x: number;
  y: number;
  label?: string; // Optional if linked to location
  locationId?: string | null; // Link to a Location
  description?: string; // Optional override
  icon?: 'tower' | 'cave' | 'town' | 'ruins' | 'default';
  color?: string; // Hex color for the pin glow
  brightness?: number; // 0.5 to 2.0 intensity
}

export interface GameMap {
  id: string;
  name: string;
  image_url: string;
  markers: MapPin[]; // JSONB column
  created_at?: string;
}

export interface WikiArticle {
  id: string;
  name: string; // Changed from title to match lore_articles
  category_id?: string | null; // Foreign Key to LoreCategory
  category?: string; // Fallback/Legacy name for UI
  content: string; // Markdown
  created_at?: string;
}