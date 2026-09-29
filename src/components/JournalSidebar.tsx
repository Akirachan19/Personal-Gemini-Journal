import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Sparkles, 
  Lightbulb, 
  MessageSquare, 
  Trash2, 
  Calendar,
  X,
  Layers,
  Star,
  CheckSquare
} from 'lucide-react';
import type { JournalInteraction, AIMode, MoodType } from '../types';

interface JournalSidebarProps {
  interactions: JournalInteraction[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewEntry: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite?: (id: string, isFav: boolean, e: React.MouseEvent) => void;
  isLoading: boolean;
}

const MOOD_EMOJIS: Record<MoodType, string> = {
  clarity: '🧘',
  gratitude: '🙏',
  growth: '🌱',
  focus: '⚡',
  resilience: '🛡️',
  anxious: '🌧️',
  creative: '🎨',
  peaceful: '🕊️',
};

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  interactions,
  activeId,
  onSelect,
  onNewEntry,
  onDelete,
  onToggleFavorite,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<AIMode | 'all' | 'favorites'>('all');

  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      if (filterMode === 'favorites') {
        if (!item.isFavorite) return false;
      } else if (filterMode !== 'all') {
        if (item.mode !== filterMode) return false;
      }

      const textToSearch = `${item.title} ${item.initialPrompt} ${item.tags?.join(' ') || ''} ${item.summary || ''} ${item.messages?.map(m => m.content).join(' ') || ''}`.toLowerCase();
      const matchesSearch = !searchQuery.trim() || textToSearch.includes(searchQuery.toLowerCase().trim());
      return matchesSearch;
    });
  }, [interactions, searchQuery, filterMode]);

  const getModeIcon = (mode: AIMode) => {
    switch (mode) {
      case 'summarize':
        return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
      case 'brainstorm':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
      case 'reflect':
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-[#080b15]/70 backdrop-blur-xl border-r border-white/[0.08] shrink-0 h-[calc(100vh-4rem)] shadow-[4px_0_24px_-4px_rgba(0,0,0,0.4)]">
      {/* Header & New Entry Button */}
      <div className="p-4 border-b border-white/[0.08] space-y-3">
        <button
          id="new-entry-btn"
          onClick={onNewEntry}
          className="w-full flex items-center justify-center gap-2 glass-button-primary text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm cursor-pointer active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-entries-input"
            type="text"
            placeholder="Search reflections, tags, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-600/80 text-white font-medium shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-indigo-400/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border border-transparent'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilterMode('favorites')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filterMode === 'favorites'
                ? 'bg-amber-500/80 text-white font-medium shadow-[0_0_12px_rgba(245,158,11,0.4)] border border-amber-400/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-amber-300 hover:bg-white/[0.08] border border-transparent'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400 fill-amber-400/50" />
            <span>Starred</span>
          </button>

          {(['reflect', 'summarize', 'brainstorm', 'chat'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-all cursor-pointer ${
                filterMode === mode
                  ? 'bg-indigo-600/80 text-white font-medium shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-indigo-400/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border border-transparent'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Interactions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && interactions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2.5">
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
            <span>Loading your reflections from Firestore...</span>
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            {searchQuery || filterMode !== 'all' ? (
              <p>No entries match your search criteria.</p>
            ) : (
              <div className="space-y-2">
                <BookOpen className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="font-medium text-slate-400">No journal entries yet</p>
                <p className="text-[11px]">Click "New Reflection" above to begin your first Gemini-powered entry.</p>
              </div>
            )}
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isActive = activeId === item.id;
            const messageCount = item.messages?.length || 0;
            const moodEmoji = item.mood ? MOOD_EMOJIS[item.mood] : null;
            const totalActions = item.actionItems?.length || 0;
            const completedActions = item.actionItems?.filter(a => a.completed).length || 0;

            return (
              <div
                key={item.id}
                id={`journal-item-${item.id}`}
                onClick={() => onSelect(item.id)}
                className={`group relative p-3.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-950/40 border border-indigo-500/40 shadow-[0_0_20px_-5px_rgba(99,102,241,0.25)]'
                    : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{getModeIcon(item.mode)}</span>
                    {moodEmoji && (
                      <span className="text-xs shrink-0" title={`Mood: ${item.mood}`}>
                        {moodEmoji}
                      </span>
                    )}
                    <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                      {item.title || 'Untitled Entry'}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => onToggleFavorite(item.id, !item.isFavorite, e)}
                        className={`p-1 rounded transition-colors ${
                          item.isFavorite 
                            ? 'text-amber-400 hover:text-amber-300' 
                            : 'text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100'
                        }`}
                        title={item.isFavorite ? 'Remove Star' : 'Star Reflection'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(item.updatedAt || item.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                  {item.initialPrompt || item.messages?.[0]?.content || 'Empty entry'}
                </p>

                {/* Tags or Action Items preview */}
                {(totalActions > 0 || (item.tags && item.tags.length > 0)) && (
                  <div className="flex items-center gap-2 mb-2">
                    {totalActions > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <CheckSquare className="w-2.5 h-2.5" />
                        <span>{completedActions}/{totalActions}</span>
                      </span>
                    )}
                    {(item.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] text-indigo-300/80 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/[0.06]">
                  <span className="capitalize text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.05]">
                    {item.mode}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{messageCount} turn{messageCount === 1 ? '' : 's'}</span>
                    <button
                      onClick={(e) => onDelete(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all rounded hover:bg-rose-950/40"
                      title="Delete Entry"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#070913]/60 backdrop-blur-md text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          {interactions.length} Saved {interactions.length === 1 ? 'Entry' : 'Entries'}
        </span>
        <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Isolated DB
        </span>
      </div>
    </aside>
  );
};
