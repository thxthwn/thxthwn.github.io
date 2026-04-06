/// <reference types="vite/client" />
import { MaimaiSong, SongSheet } from "../types";

const DXDATA_URL = import.meta.env.VITE_DXDATA_URL;

export async function fetchMaimaiSongs(): Promise<MaimaiSong[]> {
  try {
    const response = await fetch(DXDATA_URL);
    if (!response.ok) throw new Error("Failed to fetch dxdata");
    const data = await response.json();
    return data.songs || [];
  } catch (error) {
    console.error("Error fetching songs:", error);
    return [];
  }
}

export function getSheet(song: MaimaiSong, difficulty: string, type?: 'std' | 'dx'): SongSheet | undefined {
  const diffMap: Record<string, string> = {
    'BAS': 'basic',
    'ADV': 'advanced',
    'EXP': 'expert',
    'MAS': 'master',
    'Re:MAS': 'remaster',
  };
  const mappedDiff = diffMap[difficulty] || difficulty.toLowerCase();
  
  return song.sheets.find(s => 
    s.difficulty === mappedDiff && (type ? s.type === type : true)
  );
}

export function getInternalLevel(song: MaimaiSong, difficulty: string, type?: 'std' | 'dx'): number {
  const sheet = getSheet(song, difficulty, type);
  return sheet?.internalLevelValue || 0;
}

export function getDisplayLevel(song: MaimaiSong, difficulty: string, type?: 'std' | 'dx'): string {
  const sheet = getSheet(song, difficulty, type);
  return sheet?.level || "N/A";
}

export function getDifficultyValue(level: string | undefined): number {
  if (!level) return 0;
  const base = parseFloat(level.replace('+', ''));
  return level.includes('+') ? base + 0.7 : base;
}

export function formatDifficulty(level: string | undefined): string {
  return level || "N/A";
}

export function getImageUrl(song: MaimaiSong): string {
  if (song.imageName) {
    // Direct link to the image source used by dxrating via .env
    return `${import.meta.env.VITE_COVER_BASE_URL}${song.imageName}.jpg`;
  }
  return "https://picsum.photos/seed/maimai/200/200";
}
