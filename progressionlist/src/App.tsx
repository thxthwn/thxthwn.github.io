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
  List as ListIcon
} from 'lucide-react';
import { MaimaiSong, Batch, SkillCategory } from './types';
import { BATCHES } from './constants';
import { fetchMaimaiSongs, getSheet, getInternalLevel, getImageUrl } from './services/maimaiService';
import { cn } from './lib/utils';

interface DynamicEntry {
  song: MaimaiSong;
  difficulty: 'EXP' | 'MAS' | 'Re:MAS';
  internalLevel: number;
  displayLevel: string;
  batchId: string;
}

export default function App() {
  const [songs, setSongs] = useState<MaimaiSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSongs, setCompletedSongs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function init() {
      const data = await fetchMaimaiSongs();
      setSongs(data);
      setLoading(false);
      
      const saved = localStorage.getItem('maimai-progress');
      if (saved) {
        setCompletedSongs(new Set(JSON.parse(saved)));
      }
    }
    init();
  }, []);

  // Dynamically populate batches from actual song data
  const batchEntries = useMemo(() => {
    if (songs.length === 0) return new Map<string, DynamicEntry[]>();
    
    const entriesMap = new Map<string, DynamicEntry[]>();
    BATCHES.forEach(b => entriesMap.set(b.id, []));

    songs.forEach(song => {
      // Check expert, master, and remaster difficulty sheets
      const targetSheets = song.sheets.filter(s => ['expert', 'master', 'remaster'].includes(s.difficulty));
      
      targetSheets.forEach(sheet => {
        const level = sheet.internalLevelValue;
        if (level <= 0) return;

        // Map difficulty internally
        let difficultyBadge: 'EXP' | 'MAS' | 'Re:MAS' = 'MAS';
        if (sheet.difficulty === 'expert') difficultyBadge = 'EXP';
        if (sheet.difficulty === 'remaster') difficultyBadge = 'Re:MAS';

        // Find all matching batches for this level (in case of overlaps like 14.8)
        const matchingBatches = BATCHES.filter(b => level >= b.minLevel && level <= b.maxLevel);
        
        matchingBatches.forEach(batch => {
          const entries = entriesMap.get(batch.id)!;
          // Avoid duplicate songs of the exact same difficulty (same title in both std and dx)
          if (!entries.some(e => e.song.songId === song.songId && e.difficulty === difficultyBadge)) {
            entries.push({
              song,
              difficulty: difficultyBadge,
              internalLevel: level,
              displayLevel: sheet.level,
              batchId: batch.id,
            });
          }
        });
      });
    });

    // Sort entries within each batch by internal level
    entriesMap.forEach((entries, key) => {
      entries.sort((a, b) => a.internalLevel - b.internalLevel);
    });

    return entriesMap;
  }, [songs]);

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
    if (!searchQuery) return BATCHES;
    return BATCHES.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentBatchEntries = useMemo(() => {
    if (!selectedBatch) return [];
    let entries = batchEntries.get(selectedBatch.id) || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e => 
        e.song.title.toLowerCase().includes(q) || 
        e.song.artist.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [selectedBatch, batchEntries, searchQuery]);

  const getBatchProgress = (batchId: string) => {
    const entries = batchEntries.get(batchId) || [];
    if (entries.length === 0) return 0;
    const completed = entries.filter(e => completedSongs.has(`${e.song.songId}-${e.difficulty}`)).length;
    return Math.round((completed / entries.length) * 100);
  };

  const getBatchSongCount = (batchId: string) => {
    return (batchEntries.get(batchId) || []).length;
  };

  const totalEntries = useMemo(() => {
    let total = 0;
    batchEntries.forEach(entries => total += entries.length);
    return total;
  }, [batchEntries]);

  // Comprehensible Input Recommendation
  const recommendation = useMemo(() => {
    if (loading || songs.length === 0) return null;
    
    let maxLevel = 0;
    completedSongs.forEach(key => {
      const lastDash = key.lastIndexOf('-');
      const songId = key.substring(0, lastDash);
      const diff = key.substring(lastDash + 1); // EXP, MAS, Re:MAS
      
      const song = songs.find(s => s.songId === songId);
      if (song) {
        // Map back EXP/MAS/Re:MAS to expert/master/remaster
        let mappedDiff = 'master';
        if (diff === 'EXP') mappedDiff = 'expert';
        if (diff === 'Re:MAS') mappedDiff = 'remaster';
        
        const internalLevel = getInternalLevel(song, mappedDiff);
        maxLevel = Math.max(maxLevel, internalLevel);
      }
    });

    const targetMin = maxLevel || 10;
    const targetMax = targetMin + 1;

    // Collect all valid candidate sheets across EXP/MAS/Re:MAS
    const candidates: { song: MaimaiSong, diff: 'EXP' | 'MAS' | 'Re:MAS', internal: number, display: string }[] = [];

    songs.forEach(s => {
      const targetSheets = s.sheets.filter(sh => ['expert', 'master', 'remaster'].includes(sh.difficulty));
      targetSheets.forEach(sh => {
        const level = sh.internalLevelValue;
        if (level >= targetMin && level <= targetMax) {
          let difficultyBadge: 'EXP' | 'MAS' | 'Re:MAS' = 'MAS';
          if (sh.difficulty === 'expert') difficultyBadge = 'EXP';
          if (sh.difficulty === 'remaster') difficultyBadge = 'Re:MAS';
          
          if (!completedSongs.has(`${s.songId}-${difficultyBadge}`)) {
            candidates.push({
              song: s,
              diff: difficultyBadge,
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

  const getRecommendationLevel = () => {
    if (!recommendation) return null;
    return recommendation.internal.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-blue-500/30">
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
                      <div className="flex items-center gap-6">
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
                            <span className="text-xs text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.5 rounded">
                              i{recommendation.internal.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-500">Suggested based on your ceiling</span>
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
                        {Math.round((completedSongs.size / (totalEntries || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedSongs.size / (totalEntries || 1)) * 100}%` }}
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
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Level Range</span>
                      <p className="text-lg font-bold text-white">{batch.minLevel} - {batch.maxLevel}</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{batch.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{batch.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500 font-medium">{getBatchSongCount(batch.id)} songs</span>
                    <div className="flex flex-wrap gap-1">
                      {batch.skills.map(skill => (
                        <span key={skill} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">PROGRESS</span>
                      <span className="text-blue-400">{getBatchProgress(batch.id)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{ width: `${getBatchProgress(batch.id)}%` }}
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
                <span className="text-xs text-slate-500 font-medium">{currentBatchEntries.length} songs · Level {selectedBatch.minLevel} – {selectedBatch.maxLevel}</span>
              </div>

              {/* Song List */}
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {currentBatchEntries.map((entry, idx) => {
                  const isCompleted = completedSongs.has(`${entry.song.songId}-${entry.difficulty}`);

                  return (
                    <motion.div
                      key={`${entry.song.songId}-${entry.difficulty}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all",
                        isCompleted 
                          ? "bg-blue-500/5 border-blue-500/30" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
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
                          <h4 className="font-bold text-white truncate">{entry.song.title}</h4>
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
                            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/10 px-1.5 py-0.5 rounded">
                              i{entry.internalLevel.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleComplete(`${entry.song.songId}-${entry.difficulty}`)}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            isCompleted ? "text-blue-400 bg-blue-400/10" : "text-slate-600 hover:text-slate-400 hover:bg-white/5"
                          )}
                        >
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
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
