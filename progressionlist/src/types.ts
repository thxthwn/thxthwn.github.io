export interface NoteCounts {
  tap: number | null;
  hold: number | null;
  slide: number | null;
  touch: number | null;
  break: number | null;
  total: number | null;
}

export interface SongSheet {
  type: 'std' | 'dx';
  difficulty: 'basic' | 'advanced' | 'expert' | 'master' | 'remaster';
  level: string;
  internalLevelValue: number;
  noteDesigner: string;
  noteCounts: NoteCounts;
  version: string;
  internalId: number;
  releaseDate?: string;
  isSpecial: boolean;
}

export interface MaimaiSong {
  songId: string;
  category: string;
  title: string;
  artist: string;
  bpm: number;
  imageName: string; // The dxdata hash
  officialImageFilename?: string; // The SEGA official filename injected by server
  isNew: boolean;
  isLocked: boolean;
  sheets: SongSheet[];
  searchAcronyms: string[];
}

// A batch can either be level-range based (random selection) or a specific song list
export interface Batch {
  id: string;
  name: string;
  description: string;
  // For level-range batches (Batches 1-7)
  minLevel?: number;
  maxLevel?: number;
  randomCount?: [number, number]; // [min, max] songs to pick randomly
  // For specific-song batches (Batches 8-16)
  songTitles?: (string | { title: string; tags: string[] })[];
}

export type SkillCategory = 'Stamina' | 'Technical' | 'Speed' | 'Slides' | 'Trills' | 'Jackhammers' | 'General';

export interface ProgressionEntry {
  songId: string;
  difficulty: 'EXP' | 'MAS' | 'Re:MAS';
  skill: SkillCategory;
  batchId: string;
}
