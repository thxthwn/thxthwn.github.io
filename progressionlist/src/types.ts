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

export interface Batch {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  skills: SkillCategory[];
}

export type SkillCategory = 'Stamina' | 'Technical' | 'Speed' | 'Slides' | 'Trills' | 'Jackhammers' | 'General';

export interface ProgressionEntry {
  songId: string;
  difficulty: 'EXP' | 'MAS' | 'Re:MAS';
  skill: SkillCategory;
  batchId: string;
}
