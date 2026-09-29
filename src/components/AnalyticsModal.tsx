import React from 'react';
import { 
  BarChart3, 
  X, 
  Flame, 
  BookOpen, 
  CheckCircle2, 
  Smile, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import type { JournalInteraction, MoodType } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: JournalInteraction[];
}

const MOOD_META: Record<MoodType, { label: string; emoji: string; color: string; bg: string }> = {
  clarity: { label: 'Clarity', emoji: '🧘', color: 'text-indigo-400', bg: 'bg-indigo-500' },
  gratitude: { label: 'Gratitude', emoji: '🙏', color: 'text-rose-400', bg: 'bg-rose-500' },
  growth: { label: 'Growth', emoji: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  focus: { label: 'Focus', emoji: '⚡', color: 'text-amber-400', bg: 'bg-amber-500' },
  resilience: { label: 'Resilience', emoji: '🛡️', color: 'text-sky-400', bg: 'bg-sky-500' },
  anxious: { label: 'Anxious', emoji: '🌧️', color: 'text-purple-400', bg: 'bg-purple-500' },
  creative: { label: 'Creative', emoji: '🎨', color: 'text-yellow-400', bg: 'bg-yellow-500' },
  peaceful: { label: 'Peaceful', emoji: '🕊️', color: 'text-teal-400', bg: 'bg-teal-500' },
};

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  interactions,
}) => {
  if (!isOpen) return null;

  // Calculate Metrics
  const totalEntries = interactions.length;
  
  let totalWords = 0;
  let totalActionItems = 0;
  let completedActionItems = 0;
  const moodCounts: Partial<Record<MoodType, number>> = {};
  const modeCounts = { reflect: 0, summarize: 0, brainstorm: 0, chat: 0 };
  const allTags: Record<string, number> = {};

  interactions.forEach((item) => {
    // Mode
    if (item.mode && modeCounts[item.mode] !== undefined) {
      modeCounts[item.mode]++;
    }

    // Mood
    if (item.mood) {
      moodCounts[item.mood] = (moodCounts[item.mood] || 0) + 1;
    }

    // Action Items
    if (item.actionItems) {
      totalActionItems += item.actionItems.length;
      completedActionItems += item.actionItems.filter((a) => a.completed).length;
    }

    // Words
    const entryWords = (item.initialPrompt || '').split(/\s+/).filter(Boolean).length;
    const msgWords = (item.messages || []).reduce((acc, m) => acc + (m.content || '').split(/\s+/).filter(Boolean).length, 0);
    totalWords += (entryWords + msgWords);

    // Tags
    (item.tags || []).forEach((tag) => {
      allTags[tag] = (allTags[tag] || 0) + 1;
    });
  });

  // Calculate Streak
  const uniqueDates = Array.from(
    new Set(
      interactions.map((i) => new Date(i.createdAt).toDateString())
    )
  );
  const currentStreak = uniqueDates.length; // Approximate active session count

  const actionCompletionRate = totalActionItems > 0 
    ? Math.round((completedActionItems / totalActionItems) * 100) 
    : 0;

  const topTags = Object.entries(allTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-[#0b0e1b] border border-white/[0.12] rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Reflection Analytics & Mindset Landscape
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40">
                  Real-Time
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Cognitive trends, emotional resonance, and reflective milestones over time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Total Entries</span>
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-slate-100">{totalEntries}</span>
              <span className="text-[10px] text-slate-500 mt-1">Stored in Firestore</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Words Reflected</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-slate-100">{totalWords.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 mt-1">Human & AI synthesis</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Action Habits</span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-slate-100">{completedActionItems} / {totalActionItems}</span>
              <span className="text-[10px] text-amber-400 mt-1">{actionCompletionRate}% completed</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Active Days</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-2xl font-bold text-slate-100">{currentStreak}</span>
              <span className="text-[10px] text-rose-400 mt-1">Reflective milestone</span>
            </div>
          </div>

          {/* Emotional & Mood Landscape */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Smile className="w-4 h-4 text-indigo-400" />
                <span>Emotional Resonance & Mood Distribution</span>
              </h3>
              <span className="text-xs text-slate-500">
                {Object.keys(moodCounts).length} Moods Tracked
              </span>
            </div>

            {Object.keys(moodCounts).length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No moods tagged yet. Use the mood selector or Gemini auto-tagging on your reflections.
              </p>
            ) : (
              <div className="space-y-2.5">
                {(Object.keys(MOOD_META) as MoodType[]).map((mKey) => {
                  const meta = MOOD_META[mKey];
                  const count = moodCounts[mKey] || 0;
                  if (count === 0) return null;
                  const pct = Math.round((count / totalEntries) * 100);

                  return (
                    <div key={mKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <span>{meta.emoji}</span>
                          <span className="font-medium">{meta.label}</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${meta.bg} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mode Breakdown & Top Themes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Modes */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Reflection Modes Used</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-400 block">Reflect</span>
                  <span className="text-lg font-bold text-indigo-300">{modeCounts.reflect}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-400 block">Summarize</span>
                  <span className="text-lg font-bold text-sky-300">{modeCounts.summarize}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-400 block">Brainstorm</span>
                  <span className="text-lg font-bold text-amber-300">{modeCounts.brainstorm}</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-400 block">Chat</span>
                  <span className="text-lg font-bold text-purple-300">{modeCounts.chat}</span>
                </div>
              </div>
            </div>

            {/* Top Themes */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Top Reflective Tags & Themes</span>
              </h4>

              {topTags.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No tags added yet. Add hashtags to your reflections to track recurring themes.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {topTags.map(([tag, count]) => (
                    <span 
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1.5"
                    >
                      <span>#{tag}</span>
                      <span className="text-[10px] text-indigo-400/80 bg-indigo-500/20 px-1.5 py-0.2 rounded-full">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#080b15] flex items-center justify-between text-xs text-slate-400">
          <span>Updated dynamically with every reflection save</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
