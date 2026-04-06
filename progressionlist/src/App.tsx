import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Trophy, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  TrendingUp,
  Zap,
  Dumbbell,
  Settings2,
  LayoutGrid,
  List as ListIcon,
  Shuffle,
  X,
  Info
} from 'lucide-react';
import { MaimaiSong, Batch } from './types';
import { BATCHES, FRAUD_CHARTS } from './constants';
import { fetchMaimaiSongs, getImageUrl } from './services/maimaiService';
import { cn } from './lib/utils';

interface DynamicEntry {
  song: MaimaiSong;
  difficulty: 'EXP' | 'MAS' | 'Re:MAS';
  type: 'std' | 'dx';
  internalLevel: number;
  displayLevel: string;
  batchId: string;
}

interface DisplayBatch extends Batch {
  songCount: number;
  entries: DynamicEntry[];
  isRandom: boolean;
}

// Seeded random for stable batch generation per session
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Song title matching helpers for curated batches
// Some user-specified songs have hints like "(DX)", "(STD)", "(MAS)", "(Re:MAS)" 
// We need to match the base title and filter by the hint
interface SongMatchHint {
  baseTitle: string;
  typeHint?: 'std' | 'dx';
  diffHint?: 'expert' | 'master' | 'remaster';
}

function parseSongTitle(raw: string): SongMatchHint {
  let baseTitle = raw.trim();
  let typeHint: 'std' | 'dx' | undefined;
  let diffHint: 'expert' | 'master' | 'remaster' | undefined;

  // Check for (DX) or (STD) suffix
  if (/\(DX\)\s*$/i.test(baseTitle)) {
    typeHint = 'dx';
    baseTitle = baseTitle.replace(/\s*\(DX\)\s*$/i, '').trim();
  } else if (/\(STD\)\s*$/i.test(baseTitle)) {
    typeHint = 'std';
    baseTitle = baseTitle.replace(/\s*\(STD\)\s*$/i, '').trim();
  }

  // Check for (Re:MAS), (MAS), (EXP) suffix
  if (/\(Re:MAS\)\s*$/i.test(baseTitle)) {
    diffHint = 'remaster';
    baseTitle = baseTitle.replace(/\s*\(Re:MAS\)\s*$/i, '').trim();
  } else if (/\(MAS\)\s*$/i.test(baseTitle)) {
    diffHint = 'master';
    baseTitle = baseTitle.replace(/\s*\(MAS\)\s*$/i, '').trim();
  } else if (/\(EXP\)\s*$/i.test(baseTitle)) {
    diffHint = 'expert';
    baseTitle = baseTitle.replace(/\s*\(EXP\)\s*$/i, '').trim();
  }

  return { baseTitle, typeHint, diffHint };
}

export default function App() {
  const [songs, setSongs] = useState<MaimaiSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DisplayBatch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSongs, setCompletedSongs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [randomSeed, setRandomSeed] = useState(1337); // Static seed for stable progression list
  const [showWelcome, setShowWelcome] = useState(false);
  const [hideWelcomeFuture, setHideWelcomeFuture] = useState(false);

  useEffect(() => {
    async function init() {
      const data = await fetchMaimaiSongs();
      setSongs(data);
      setLoading(false);
      
      const saved = localStorage.getItem('maimai-progress');
      if (saved) {
        setCompletedSongs(new Set(JSON.parse(saved)));
      }

      const hideWelcome = localStorage.getItem('maimai-hide-welcome');
      if (hideWelcome !== 'true') {
        setShowWelcome(true);
      }
    }
    init();
  }, []);

  const closeWelcomeModal = () => {
    if (hideWelcomeFuture) {
      localStorage.setItem('maimai-hide-welcome', 'true');
    }
    setShowWelcome(false);
  };


  // Build display batches from song data
  const displayBatches = useMemo(() => {
    if (songs.length === 0) return [];

    const rng = seededRandom(randomSeed);
    const result: DisplayBatch[] = [];

    BATCHES.forEach(batch => {
      if (batch.songTitles && batch.songTitles.length > 0) {
        // Curated song list batch
        const entries: DynamicEntry[] = [];

        batch.songTitles.forEach(rawTitle => {
          const hint = parseSongTitle(rawTitle);
          
          // Find matching song by title (fuzzy: case-insensitive, trimmed)
          const matchingSongs = songs.filter(s => {
            const songTitle = s.title.trim().toLowerCase();
            const searchTitle = hint.baseTitle.toLowerCase();
            if (!songTitle || !searchTitle) return false;
            return songTitle === searchTitle || songTitle.includes(searchTitle);
          });

          if (matchingSongs.length === 0) return;

          // For each matching song, find the best sheet
          matchingSongs.forEach(song => {
            const candidateSheets = song.sheets.filter(s => {
              if (!['expert', 'master', 'remaster'].includes(s.difficulty)) return false;
              if (hint.typeHint && s.type !== hint.typeHint) return false;
              if (hint.diffHint && s.difficulty !== hint.diffHint) return false;
              return true;
            });

            if (candidateSheets.length === 0) return;

            // Pick the highest difficulty sheet if no hint, or the matching one
            const sheet = candidateSheets.sort((a, b) => {
              const diffOrder = { expert: 0, master: 1, remaster: 2 };
              return (diffOrder[b.difficulty as keyof typeof diffOrder] || 0) - (diffOrder[a.difficulty as keyof typeof diffOrder] || 0);
            })[0];

            let difficultyBadge: 'EXP' | 'MAS' | 'Re:MAS' = 'MAS';
            if (sheet.difficulty === 'expert') difficultyBadge = 'EXP';
            if (sheet.difficulty === 'remaster') difficultyBadge = 'Re:MAS';

            // Avoid duplicates
            if (!entries.some(e => e.song.songId === song.songId && e.difficulty === difficultyBadge && e.type === sheet.type)) {
              entries.push({
                song,
                difficulty: difficultyBadge,
                type: sheet.type,
                internalLevel: sheet.internalLevelValue,
                displayLevel: sheet.level,
                batchId: batch.id,
              });
            }
          });
        });

        result.push({
          ...batch,
          songCount: entries.length,
          entries,
          isRandom: false,
        });
      } else if (batch.minLevel !== undefined && batch.maxLevel !== undefined) {
        // Level-range based random batch
        const allCandidates: DynamicEntry[] = [];

        songs.forEach(song => {
          const targetSheets = song.sheets.filter(s => ['expert', 'master', 'remaster'].includes(s.difficulty));
          targetSheets.forEach(sheet => {
            const level = sheet.internalLevelValue;
            if (level <= 0) return;
            if (level < batch.minLevel! || level > batch.maxLevel!) return;

            let difficultyBadge: 'EXP' | 'MAS' | 'Re:MAS' = 'MAS';
            if (sheet.difficulty === 'expert') difficultyBadge = 'EXP';
            if (sheet.difficulty === 'remaster') difficultyBadge = 'Re:MAS';

            if (!allCandidates.some(e => e.song.songId === song.songId && e.difficulty === difficultyBadge && e.type === sheet.type)) {
              allCandidates.push({
                song,
                difficulty: difficultyBadge,
                type: sheet.type,
                internalLevel: level,
                displayLevel: sheet.level,
                batchId: batch.id,
              });
            }
          });
        });

        // Pick random count from the candidates
        const [minCount, maxCount] = batch.randomCount || [7, 7];
        const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
        const shuffled = shuffleArray(allCandidates, rng);
        const picked = shuffled.slice(0, Math.min(count, shuffled.length));

        result.push({
          ...batch,
          songCount: picked.length,
          entries: picked,
          isRandom: true,
        });
      }
    });

    return result;
  }, [songs, randomSeed]);

  const toggleComplete = (songKey: string) => {
    const newSet = new Set(completedSongs);
    if (newSet.has(songKey)) {
      newSet.delete(songKey);
    } else {
      newSet.add(songKey);
    }
    setCompletedSongs(newSet);
    localStorage.setItem('maimai-progress', JSON.stringify(Array.from(newSet)));
  };

  const filteredBatches = useMemo(() => {
    if (!searchQuery) return displayBatches;
    return displayBatches.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayBatches, searchQuery]);

  const currentBatchEntries = useMemo(() => {
    if (!selectedBatch) return [];
    let entries = selectedBatch.entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e => 
        e.song.title.toLowerCase().includes(q) || 
        e.song.artist.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [selectedBatch, searchQuery]);

  const getBatchProgress = (batch: DisplayBatch) => {
    if (batch.songCount === 0) return 0;
    const completed = batch.entries.filter(e => completedSongs.has(`${e.song.songId}-${e.difficulty}-${e.type}`)).length;
    return Math.round((completed / batch.songCount) * 100);
  };

  const totalEntriesCount = useMemo(() => {
    const uniqueKeys = new Set<string>();
    displayBatches.forEach(batch => {
      batch.entries.forEach(e => {
        uniqueKeys.add(`${e.song.songId}-${e.difficulty}-${e.type}`);
      });
    });
    return uniqueKeys.size;
  }, [displayBatches]);

  // Comprehensible Input Recommendation
  const recommendation = useMemo(() => {
    if (loading || songs.length === 0) return null;
    
    let maxLevel = 0;
    completedSongs.forEach(key => {
      const parts = key.split('-');
      if (parts.length < 3) return;
      
      const type = parts.pop();
      const diff = parts.pop();
      const songId = parts.join('-');
      
      const song = songs.find(s => s.songId === songId);
      if (song) {
        let mappedDiff = 'master';
        if (diff === 'EXP') mappedDiff = 'expert';
        if (diff === 'Re:MAS') mappedDiff = 'remaster';
        
        const sheet = song.sheets.find(s => s.difficulty === mappedDiff && s.type === type);
        if (sheet) {
          maxLevel = Math.max(maxLevel, sheet.internalLevelValue);
        }
      }
    });

    const targetMin = maxLevel || 10;
    const targetMax = targetMin + 1;

    const candidates: { song: MaimaiSong, diff: 'EXP' | 'MAS' | 'Re:MAS', type: 'std' | 'dx', internal: number, display: string }[] = [];

    songs.forEach(s => {
      const targetSheets = s.sheets.filter(sh => ['expert', 'master', 'remaster'].includes(sh.difficulty));
      targetSheets.forEach(sh => {
        const level = sh.internalLevelValue;
        if (level >= targetMin && level <= targetMax) {
          let difficultyBadge: 'EXP' | 'MAS' | 'Re:MAS' = 'MAS';
          if (sh.difficulty === 'expert') difficultyBadge = 'EXP';
          if (sh.difficulty === 'remaster') difficultyBadge = 'Re:MAS';
          
          if (!completedSongs.has(`${s.songId}-${difficultyBadge}-${sh.type}`)) {
            candidates.push({
              song: s,
              diff: difficultyBadge,
              type: sh.type,
              internal: level,
              display: sh.level
            });
          }
        }
      });
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [songs, completedSongs, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-400 font-medium animate-pulse">Loading Maimai Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeWelcomeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f1115] border border-white/10 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={closeWelcomeModal}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">maimai Progression List</h2>
              </div>

              <div className="space-y-6 text-slate-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-base text-slate-200">
                  This list is a structured path through maimai's difficulty tiers, designed to help you improve naturally rather than grinding randomly.
                </p>

                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                    How it works
                  </h3>
                  <p>
                    Batches 1–7 are random ranges — play charts within the given level window until the range feels comfortable. Batches 8 onwards are curated, specific charts chosen because they teach particular skills in a logical order.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                    When to move on
                  </h3>
                  <p>
                    Don't rush. Move to the next batch when you can SSS most charts in the current one cleanly — not perfectly, but without your accuracy visibly collapsing midway through. For curated batches, pay attention to the stretch charts at the end: those are the readiness check.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                    A few things to know
                  </h3>
                  <ul className="space-y-3 list-disc list-inside">
                    <li>
                      <span className="text-white font-medium">Chart constants</span> (the decimal numbers like 13.4 or 14.7) reflect the official internal rating, but community experience sometimes disagrees. Charts flagged with a ↑ community or individual difference note play harder than their number suggests — treat those honestly rather than assuming you're just having a bad day.
                    </li>
                    <li>
                      <span className="text-white font-medium">Some charts in the higher batches require chart-specific knowledge.</span> If something feels impossibly hard the first few times but suddenly clicks, that's normal — certain patterns need a few repetitions to internalize, not more raw skill.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
                  <strong>This list is not exhaustive.</strong> It's a guide, not a rulebook. If a chart feels wrong for where you are, skip it and come back later.
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-white/5 group-hover:border-blue-400 transition-colors">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={hideWelcomeFuture}
                      onChange={(e) => setHideWelcomeFuture(e.target.checked)}
                    />
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 opacity-0 peer-checked:opacity-100 transition-opacity absolute" />
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Don't show this again</span>
                </label>
                
                <button 
                  onClick={closeWelcomeModal}
                  className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                  I understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Trophy className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                Maimai Progression
              </h1>
              <p className="text-xs text-blue-400 font-medium tracking-wider uppercase">Improvement Batches</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text"
                placeholder={selectedBatch ? "Search songs..." : "Search batches..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              />
            </div>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Settings2 className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section / Recommendation */}
        <AnimatePresence mode="wait">
          {!selectedBatch && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-cyan-600/5 border border-blue-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-48 h-48 text-blue-400" />
                  </div>
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold mb-4">
                      <Zap className="w-3 h-3" /> COMPREHENSIBLE INPUT
                    </span>
                    <h2 className="text-3xl font-bold mb-4">Your Next Challenge</h2>
                    {recommendation ? (
                      <div 
                        className="flex items-center gap-6 cursor-pointer group/rec transition-all hover:bg-white/5 p-4 -m-4 rounded-3xl"
                        onClick={() => toggleComplete(`${recommendation.song.songId}-${recommendation.diff}-${recommendation.type}`)}
                      >
                        <div className="w-24 h-24 rounded-2xl bg-slate-800 flex-shrink-0 overflow-hidden border border-white/10">
                           <img 
                            src={getImageUrl(recommendation.song)}
                            alt={recommendation.song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://picsum.photos/seed/maimai/200/200";
                            }}
                           />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{recommendation.song.title}</h3>
                          <p className="text-slate-400 text-sm mb-2">{recommendation.song.artist}</p>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-xs font-bold uppercase",
                              recommendation.diff === 'Re:MAS' ? "bg-white text-purple-700 shadow-[0_0_8px_rgba(168,85,247,0.4)]" :
                              recommendation.diff === 'MAS' ? "bg-purple-500/20 text-purple-400" :
                              "bg-red-500/20 text-red-400"
                            )}>
                              {recommendation.diff} {recommendation.display}
                            </span>
                             {recommendation.type === 'dx' ? (
                               <span className="bg-white px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border border-white/10">
                                 <span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                                   DX
                                 </span>
                               </span>
                             ) : (
                               <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                 STD
                               </span>
                             )}
                            <span className="text-xs text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.5 rounded">
                              i{recommendation.internal.toFixed(1)}
                            </span>
                            {FRAUD_CHARTS.includes(recommendation.song.title) && (
                              <div title="Community rating: Harder than internal level" className="flex items-center">
                                <TrendingUp className="w-5 h-5 text-red-500 animate-bounce" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400">Complete some songs to get personalized recommendations!</p>
                    )}
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Global Progress</h3>
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-4xl font-bold text-white">{completedSongs.size}</span>
                      <span className="text-slate-500 mb-1">songs mastered</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Overall Completion</span>
                      <span className="text-blue-400 font-bold">
                        {Math.round((completedSongs.size / (totalEntriesCount || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedSongs.size / (totalEntriesCount || 1)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Batch Selection or Batch Detail */}
        <AnimatePresence mode="wait">
          {!selectedBatch ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredBatches.map((batch, idx) => (
                <motion.button
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => { setSelectedBatch(batch); setSearchQuery(""); }}
                  className="group relative p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-blue-500/50 transition-all text-left overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Dumbbell className="w-24 h-24" />
                  </div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                      {batch.isRandom ? <Shuffle className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
                    </div>
                    <div className="text-right">
                      {batch.minLevel !== undefined && batch.maxLevel !== undefined ? (
                        <>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Level Range</span>
                          <p className="text-lg font-bold text-white">{batch.minLevel} – {batch.maxLevel}</p>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Curated</span>
                          <p className="text-lg font-bold text-white">{batch.songCount} songs</p>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{batch.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{batch.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-medium">{batch.songCount} songs</span>
                    {batch.isRandom && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-400 uppercase tracking-tighter">
                        Random
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">PROGRESS</span>
                      <span className="text-blue-400">{getBatchProgress(batch)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{ width: `${getBatchProgress(batch)}%` }}
                      />
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Batch Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <button 
                  onClick={() => { setSelectedBatch(null); setSearchQuery(""); }}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Batches
                </button>
                <div className="flex items-center gap-4">

                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-blue-500 text-white shadow-lg" : "text-slate-500 hover:text-white")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-blue-500 text-white shadow-lg" : "text-slate-500 hover:text-white")}
                    >
                      <ListIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                <h2 className="text-3xl font-bold text-white mb-2">{selectedBatch.name}</h2>
                <p className="text-slate-400 max-w-2xl mb-3">{selectedBatch.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    {currentBatchEntries.length} songs
                    {selectedBatch.minLevel !== undefined && ` · Level ${selectedBatch.minLevel} – ${selectedBatch.maxLevel}`}
                  </span>
                  {selectedBatch.isRandom && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-400 uppercase">
                      Randomly selected
                    </span>
                  )}
                </div>
              </div>

              {/* Song List */}
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {currentBatchEntries.map((entry, idx) => {
                  const isCompleted = completedSongs.has(`${entry.song.songId}-${entry.difficulty}-${entry.type}`);

                  return (
                    <motion.div
                      key={`${entry.song.songId}-${entry.difficulty}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all cursor-pointer",
                        isCompleted 
                          ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10" 
                          : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]"
                      )}
                      onClick={() => toggleComplete(`${entry.song.songId}-${entry.difficulty}-${entry.type}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0 overflow-hidden border border-white/10">
                           <img 
                            src={getImageUrl(entry.song)}
                            alt={entry.song.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://picsum.photos/seed/maimai/100/100";
                            }}
                           />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-white truncate">{entry.song.title}</h4>
                            {FRAUD_CHARTS.includes(entry.song.title) && (
                              <div title="Community rating: Harder than internal level" className="shrink-0 flex items-center">
                                <TrendingUp className="w-4 h-4 text-red-500 animate-bounce" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-2">{entry.song.artist}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-black uppercase",
                              entry.difficulty === 'Re:MAS' ? "bg-white text-purple-700 shadow-[0_0_8px_rgba(168,85,247,0.4)]" :
                              entry.difficulty === 'MAS' ? "bg-purple-500/20 text-purple-400" :
                              "bg-red-500/20 text-red-400"
                            )}>
                              {entry.difficulty} {entry.displayLevel}
                            </span>
                             {entry.type === 'dx' ? (
                               <span className="bg-white px-1.5 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border border-white/10">
                                 <span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                                   DX
                                 </span>
                               </span>
                             ) : (
                               <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                                 STD
                               </span>
                             )}
                            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.5 rounded">
                              i{entry.internalLevel.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div 
                          className={cn(
                            "p-2 rounded-full transition-all",
                            isCompleted ? "text-blue-400 bg-blue-400/10" : "text-slate-600 group-hover:text-slate-400 group-hover:bg-white/5"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium">Maimai Progression List &copy; 2026</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-slate-500">
            <a href="#" className="hover:text-blue-400 transition-colors">About GDDP Logic</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Song Database</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Community Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
