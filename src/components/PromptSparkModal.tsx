import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  RefreshCw, 
  Compass, 
  Heart, 
  ShieldAlert, 
  TrendingUp, 
  Sun, 
  Moon, 
  Lightbulb, 
  Check, 
  ArrowRight,
  Zap
} from 'lucide-react';
import type { MoodType } from '../types';
import { fetchApiJson } from '../utils/api';

interface PromptSparkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string, category: string) => void;
}

const CATEGORIES = [
  { id: 'stoic', label: 'Stoic Fortitude', icon: Compass, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'gratitude', label: 'Deep Gratitude', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'resilience', label: 'Resilience & Grit', icon: ShieldAlert, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'growth', label: 'Growth Mindset', icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  { id: 'clarity', label: 'Mental Clarity', icon: Sun, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  { id: 'unwind', label: 'Evening Decompression', icon: Moon, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'creative', label: 'Creative Spark', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
];

const DEFAULT_SPARKS: Record<string, string[]> = {
  stoic: [
    "What is something currently troubling me that is completely outside my control, and how can I let it go?",
    "Where did I act with calm rationality today, and where did I allow temporary emotion to rule?",
    "If I lost what I currently take for granted tomorrow, what would I wish I appreciated more today?",
    "What uncomfortable truth am I avoiding facing right now?"
  ],
  gratitude: [
    "What is a tiny, sensory detail from today (a scent, sound, glance, or warm drink) that brought me unexpected joy?",
    "Who is someone whose presence made my life easier or richer recently, and have I thanked them?",
    "What past challenge or difficulty am I now grateful to have experienced for the strength it gave me?",
    "What part of my body or mind worked reliably for me today that deserves appreciation?"
  ],
  resilience: [
    "What setback did I encounter lately, and what is the single most empowering reframe I can apply to it?",
    "Recall a time I felt overwhelmed in the past. How did I make it through, and what does that prove about me?",
    "What is one courageous micro-action I can take in the next 24 hours to face an ongoing friction?",
    "How can I turn this current point of resistance into fuel for my long-term resilience?"
  ],
  growth: [
    "What skill or trait am I currently in the messy middle of developing, and how can I celebrate my incremental progress?",
    "Where did I operate on autopilot today instead of deliberate intention?",
    "If I had zero fear of being judged, what bold project or change would I begin immediately?",
    "What did a recent mistake or critique teach me that advice never could?"
  ],
  clarity: [
    "If I could only accomplish one single priority tomorrow to feel proud, what must it be?",
    "What recurring thought loop is taking up unnecessary mental bandwidth in my head right now?",
    "What expectations am I carrying that belong to others rather than my own authentic desires?",
    "Break down my biggest current decision into its fundamental facts versus my emotional assumptions."
  ],
  unwind: [
    "What mental luggage or unresolved tasks can I safely put down until tomorrow morning?",
    "How did I show up for myself or others today with kindness?",
    "What feeling do I want to wake up with tomorrow, and what bedtime ritual will support that?",
    "Take three slow deep breaths. What does my body feel like right now, and what does it need to rest?"
  ],
  creative: [
    "Combine two completely unrelated passions of mine into a wild, unconventional idea.",
    "What rule in my industry, routine, or craft is everyone following that might actually be obsolete?",
    "If I were writing a story about this exact chapter of my life, what is the turning point?",
    "What would the most audacious, unfiltered version of my current idea look like?"
  ]
};

export const PromptSparkModal: React.FC<PromptSparkModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('stoic');
  const [sparks, setSparks] = useState<Record<string, string[]>>(DEFAULT_SPARKS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSpark, setCopiedSpark] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const currentList = sparks[selectedCategory] || DEFAULT_SPARKS[selectedCategory] || [];

  const handleGenerateFresh = async () => {
    setIsGenerating(true);
    try {
      const data = await fetchApiJson<{ prompts: string[] }>('/api/gemini/sparks', {
        method: 'POST',
        body: JSON.stringify({ category: selectedCategory }),
      });

      if (Array.isArray(data.prompts) && data.prompts.length > 0) {
        setSparks((prev) => ({
          ...prev,
          [selectedCategory]: data.prompts,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch new AI sparks:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (promptText: string) => {
    onSelectPrompt(promptText, currentCategoryObj.label);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0b0e1b] border border-white/[0.12] rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-indigo-500/30 border border-amber-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Zen Catalyst & Reflection Sparks
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                  Gemini-Powered
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose a thematic lens or generate tailored philosophical introspections.
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

        {/* Categories Bar */}
        <div className="p-4 border-b border-white/[0.08] bg-[#070a14] overflow-x-auto flex items-center gap-2 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? `${cat.bg} text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]`
                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Prompts Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Catalysts for <strong>{currentCategoryObj.label}</strong></span>
            </span>

            <button
              onClick={handleGenerateFresh}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Generating...' : 'Roll New Sparks'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {currentList.map((promptText, idx) => (
              <div
                key={idx}
                className="group relative p-4 rounded-xl bg-white/[0.03] hover:bg-indigo-950/30 border border-white/[0.06] hover:border-indigo-500/40 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-sm hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]"
                onClick={() => handleSelect(promptText)}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/[0.06] text-slate-400 text-xs font-semibold flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 group-hover:text-white leading-relaxed">
                    "{promptText}"
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-1 bg-indigo-500/20 px-2 py-1 rounded-md border border-indigo-500/30">
                    <span>Use Prompt</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#080b15] flex items-center justify-between text-xs text-slate-400">
          <span>Click any spark to start reflecting immediately</span>
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
