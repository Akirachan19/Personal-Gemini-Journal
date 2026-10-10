import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  Lightbulb, 
  MessageSquare, 
  Copy, 
  Check, 
  RotateCcw, 
  Download, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Cpu,
  Bookmark,
  ChevronDown,
  Bell,
  Share2,
  Mic,
  MicOff,
  Star,
  CheckSquare,
  Plus,
  Trash2,
  Tag,
  Smile,
  ListTodo,
  Zap
} from 'lucide-react';
import type { 
  JournalInteraction, 
  AIMode, 
  ChatMessage, 
  NotificationProvider, 
  NotificationSettings, 
  MoodType, 
  ActionItem 
} from '../types';
import { fetchApiJson } from '../utils/api';

interface EntryEditorProps {
  interaction: JournalInteraction | null;
  onUpdateInteraction: (updated: JournalInteraction) => Promise<void>;
  onSendPrompt: (prompt: string, mode: AIMode) => Promise<void>;
  isGenerating: boolean;
  activeModel: string | null;
  saveStatus: 'synced' | 'saving' | 'error';
  saveError: string | null;
  onRetrySave: () => Promise<void>;
  notificationSettings?: NotificationSettings | null;
  onManualDispatch?: (provider: NotificationProvider, userPrompt: string, aiInsight: string) => Promise<void>;
  onOpenNotificationSettings?: () => void;
  onOpenPromptSparks?: () => void;
}

const PROMPT_SUGGESTIONS: Record<AIMode, string[]> = {
  reflect: [
    "Reflect on what challenged me the most today and what mindset helped.",
    "Help me unpack a decision I'm struggling with and identify my core values.",
    "What emotions am I experiencing right now, and what are they trying to tell me?",
    "Summarize what I did well today and what I can forgive myself for."
  ],
  summarize: [
    "Please summarize these notes into core themes, key takeaways, and next actions.",
    "Give me an executive breakdown of my weekly reflection notes.",
    "Synthesize the emotional high points and friction areas from my writing."
  ],
  brainstorm: [
    "Brainstorm 5 innovative angles or solutions to approach this problem.",
    "Give me creative ideas for my upcoming project based on my journal notes.",
    "What are counter-intuitive ideas I haven't considered yet?"
  ],
  chat: [
    "Let's discuss my thought process and explore alternative perspectives.",
    "Ask me 3 deep clarifying questions to help me think this through.",
    "Can you be my devil's advocate on this plan?"
  ]
};

const MOOD_OPTIONS: Array<{ id: MoodType; label: string; emoji: string; color: string }> = [
  { id: 'clarity', label: 'Clarity', emoji: '🧘', color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' },
  { id: 'gratitude', label: 'Gratitude', emoji: '🙏', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
  { id: 'growth', label: 'Growth', emoji: '🌱', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { id: 'focus', label: 'Focus', emoji: '⚡', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'resilience', label: 'Resilience', emoji: '🛡️', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
  { id: 'anxious', label: 'Anxious', emoji: '🌧️', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
  { id: 'creative', label: 'Creative', emoji: '🎨', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🕊️', color: 'text-teal-400 border-teal-500/40 bg-teal-500/10' },
];

export const EntryEditor: React.FC<EntryEditorProps> = ({
  interaction,
  onUpdateInteraction,
  onSendPrompt,
  isGenerating,
  activeModel,
  saveStatus,
  saveError,
  onRetrySave,
  notificationSettings,
  onManualDispatch,
  onOpenNotificationSettings,
  onOpenPromptSparks,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<AIMode>(interaction?.mode || 'reflect');
  const [title, setTitle] = useState(interaction?.title || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dispatchingMsgId, setDispatchingMsgId] = useState<string | null>(null);
  const [dispatchSuccessMsgId, setDispatchSuccessMsgId] = useState<{ id: string; provider: string } | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Metadata states
  const [showActionPanel, setShowActionPanel] = useState(true);
  const [newActionText, setNewActionText] = useState('');
  const [isExtractingActions, setIsExtractingActions] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (interaction) {
      setTitle(interaction.title || 'Untitled Reflection');
      setMode(interaction.mode || 'reflect');
    }
  }, [interaction?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interaction?.messages, isGenerating]);

  // Setup Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice dictation is not supported by your browser. Please try Google Chrome or Microsoft Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (interaction && title.trim() && title !== interaction.title) {
      onUpdateInteraction({
        ...interaction,
        title: title.trim(),
        updatedAt: Date.now(),
      });
    }
  };

  const handleModeChange = (newMode: AIMode) => {
    setMode(newMode);
    if (interaction) {
      onUpdateInteraction({
        ...interaction,
        mode: newMode,
        updatedAt: Date.now(),
      });
    }
  };

  const handleToggleFavorite = () => {
    if (!interaction) return;
    const newFav = !interaction.isFavorite;
    onUpdateInteraction({
      ...interaction,
      isFavorite: newFav,
      updatedAt: Date.now(),
    });
  };

  const handleSelectMood = (mood: MoodType) => {
    if (!interaction) return;
    const nextMood = interaction.mood === mood ? undefined : mood;
    onUpdateInteraction({
      ...interaction,
      mood: nextMood,
      updatedAt: Date.now(),
    });
  };

  // Action Items Management
  const handleToggleAction = (actionId: string) => {
    if (!interaction) return;
    const items = (interaction.actionItems || []).map((item) =>
      item.id === actionId ? { ...item, completed: !item.completed } : item
    );
    onUpdateInteraction({
      ...interaction,
      actionItems: items,
      updatedAt: Date.now(),
    });
  };

  const handleAddAction = () => {
    if (!interaction || !newActionText.trim()) return;
    const newItem: ActionItem = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      text: newActionText.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    const updatedItems = [...(interaction.actionItems || []), newItem];
    setNewActionText('');
    onUpdateInteraction({
      ...interaction,
      actionItems: updatedItems,
      updatedAt: Date.now(),
    });
  };

  const handleDeleteAction = (actionId: string) => {
    if (!interaction) return;
    const items = (interaction.actionItems || []).filter((item) => item.id !== actionId);
    onUpdateInteraction({
      ...interaction,
      actionItems: items,
      updatedAt: Date.now(),
    });
  };

  // AI Action Item & Insight Extractor
  const handleExtractAIActions = async () => {
    if (!interaction) return;
    setIsExtractingActions(true);
    try {
      const fullText = `${interaction.title}\n\n${interaction.initialPrompt}\n\n${interaction.messages?.map(m => m.content).join('\n\n') || ''}`;
      const data = await fetchApiJson<{
        actionItems?: string[];
        keyTakeaways?: string[];
        mood?: MoodType;
        sentimentScore?: number;
        suggestedTags?: string[];
      }>('/api/gemini/analyze-insights', {
        method: 'POST',
        body: JSON.stringify({ text: fullText }),
      });

      const newActions: ActionItem[] = (data.actionItems || []).map((t: string) => ({
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        text: t,
        completed: false,
        createdAt: Date.now(),
      }));

      const existingIds = new Set((interaction.actionItems || []).map(a => a.text.toLowerCase()));
      const filteredNew = newActions.filter(a => !existingIds.has(a.text.toLowerCase()));

      const mergedActions = [...(interaction.actionItems || []), ...filteredNew];
      const mergedTags = Array.from(new Set([...(interaction.tags || []), ...(data.suggestedTags || [])]));

      onUpdateInteraction({
        ...interaction,
        actionItems: mergedActions,
        mood: (data.mood as MoodType) || interaction.mood,
        sentimentScore: typeof data.sentimentScore === 'number' ? data.sentimentScore : interaction.sentimentScore,
        tags: mergedTags,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Action extraction failed:', err);
    } finally {
      setIsExtractingActions(false);
    }
  };

  // Tag Management
  const handleAddTag = () => {
    if (!interaction || !tagInput.trim()) return;
    const cleanTag = tagInput.trim().replace(/^#/, '');
    const currentTags = interaction.tags || [];
    if (!currentTags.includes(cleanTag)) {
      onUpdateInteraction({
        ...interaction,
        tags: [...currentTags, cleanTag],
        updatedAt: Date.now(),
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!interaction) return;
    const currentTags = interaction.tags || [];
    onUpdateInteraction({
      ...interaction,
      tags: currentTags.filter(t => t !== tagToRemove),
      updatedAt: Date.now(),
    });
  };

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const promptToSend = inputText.trim();
    setInputText('');
    await onSendPrompt(promptToSend, mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleManualDispatchClick = async (
    msgId: string,
    aiContent: string,
    provider: NotificationProvider
  ) => {
    if (!onManualDispatch) return;
    setDispatchingMsgId(msgId);
    setDispatchSuccessMsgId(null);
    try {
      const userPrompt = interaction?.initialPrompt || title || 'Journal Reflection';
      await onManualDispatch(provider, userPrompt, aiContent);
      setDispatchSuccessMsgId({ id: msgId, provider });
      setTimeout(() => setDispatchSuccessMsgId(null), 3000);
    } catch (e: any) {
      alert(`Dispatch error: ${e?.message || 'Failed to send external notification'}`);
    } finally {
      setDispatchingMsgId(null);
    }
  };

  const handleExport = (format: 'markdown' | 'text' | 'json') => {
    if (!interaction) return;
    let content = '';
    let filename = `${interaction.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'markdown') {
      content = `# ${interaction.title}\n\n*Created: ${new Date(interaction.createdAt).toLocaleString()}*\n*Mode: ${interaction.mode}*\n*Mood: ${interaction.mood || 'Unspecified'}*\n\n`;
      if (interaction.actionItems && interaction.actionItems.length > 0) {
        content += `## Action Items\n`;
        interaction.actionItems.forEach(a => {
          content += `- [${a.completed ? 'x' : ' '}] ${a.text}\n`;
        });
        content += `\n---\n\n`;
      }
      interaction.messages.forEach((msg) => {
        const roleName = msg.role === 'user' ? '### 👤 User Reflection' : `### ✨ Gemini 3.6 Flash (${msg.modelUsed || 'Gemini'})`;
        content += `${roleName}\n\n${msg.content}\n\n---\n\n`;
      });
      filename += '.md';
    } else if (format === 'text') {
      content = `${interaction.title}\nDate: ${new Date(interaction.createdAt).toLocaleString()}\nMood: ${interaction.mood || 'None'}\n\n`;
      interaction.messages.forEach((msg) => {
        content += `[${msg.role.toUpperCase()}]:\n${msg.content}\n\n`;
      });
      filename += '.txt';
    } else if (format === 'json') {
      content = JSON.stringify(interaction, null, 2);
      filename += '.json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const messages = interaction?.messages || [];
  const actionItems = interaction?.actionItems || [];
  const tags = interaction?.tags || [];
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-transparent text-slate-100 overflow-hidden">
      {/* Top Bar: Title, Favorite & Configuration Controls */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#080b15]/75 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Star / Favorite toggle */}
          {interaction && (
            <button
              onClick={handleToggleFavorite}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                interaction.isFavorite
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-amber-300 hover:bg-white/[0.08]'
              }`}
              title={interaction.isFavorite ? 'Starred Favorite' : 'Star this Reflection'}
            >
              <Star className={`w-4 h-4 ${interaction.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              autoFocus
              className="bg-[#0b0e1c] border border-indigo-500/80 rounded-xl px-3 py-1 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-full max-w-md shadow-inner"
            />
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              className="text-base font-bold text-slate-100 hover:text-indigo-300 cursor-pointer truncate max-w-md transition-colors flex items-center gap-2"
              title="Click to edit title"
            >
              <span>{title || (interaction ? 'Untitled Reflection' : 'New Journal Session')}</span>
              <Bookmark className="w-3.5 h-3.5 text-slate-500 hover:text-indigo-400 shrink-0 transition-colors" />
            </h2>
          )}

          {interaction && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
              <Clock className="w-3 h-3 text-slate-400" />
              {new Date(interaction.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Mode Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Mode switcher pills */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-1 text-xs backdrop-blur-md">
            <button
              onClick={() => handleModeChange('reflect')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'reflect'
                  ? 'bg-indigo-600 text-white font-medium shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Deep self-reflection & insights"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reflect</span>
            </button>
            <button
              onClick={() => handleModeChange('summarize')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'summarize'
                  ? 'bg-sky-600 text-white font-medium shadow-[0_0_12px_rgba(2,132,199,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Executive summarizer & action points"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Summarize</span>
            </button>
            <button
              onClick={() => handleModeChange('brainstorm')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'brainstorm'
                  ? 'bg-amber-600 text-white font-medium shadow-[0_0_12px_rgba(217,119,6,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Brainstorming & divergent ideas"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Brainstorm</span>
            </button>
            <button
              onClick={() => handleModeChange('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'chat'
                  ? 'bg-purple-600 text-white font-medium shadow-[0_0_12px_rgba(147,51,234,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Conversational journaling"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dialogue</span>
            </button>
          </div>

          {/* Export Dropdown */}
          {interaction && messages.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExport('markdown')}
                className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-xs flex items-center gap-1.5 border border-white/[0.08] transition-all cursor-pointer shadow-sm"
                title="Export as Markdown"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden lg:inline">Export</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mood Selector & Tag Strip (If interaction exists) */}
      {interaction && (
        <div className="px-4 sm:px-6 py-2 bg-[#070914]/80 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mood Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <Smile className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mood:</span>
            </span>
            {MOOD_OPTIONS.map((m) => {
              const isSelected = interaction.mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMood(m.id)}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? `${m.color} border shadow-[0_0_10px_rgba(99,102,241,0.2)]`
                      : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tags & Action Counter */}
          <div className="flex items-center gap-3">
            {/* Tags preview / quick add */}
            <div className="flex items-center gap-1.5">
              {tags.map((tag) => (
                <span 
                  key={tag} 
                  className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1"
                >
                  #{tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="+ tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="w-14 bg-transparent text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:w-20 transition-all"
                />
              </div>
            </div>

            {/* Toggle Action Items Panel */}
            <button
              onClick={() => setShowActionPanel(!showActionPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                showActionPanel
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-amber-400" />
              <span>Actions ({actionItems.filter(a => a.completed).length}/{actionItems.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Items Panel Drawer (Collapsible) */}
      {interaction && showActionPanel && (
        <div className="px-4 sm:px-6 py-3 bg-[#080b18]/90 border-b border-white/[0.08] backdrop-blur-md">
          <div className="max-w-4xl mx-auto space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Reflective Action Items & Micro-Habits
                </span>
              </div>

              <button
                onClick={handleExtractAIActions}
                disabled={isExtractingActions || messages.length === 0}
                className="flex items-center gap-1.5 text-[11px] text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Extract action items and emotional themes from this reflection using Gemini"
              >
                <Sparkles className={`w-3 h-3 text-indigo-400 ${isExtractingActions ? 'animate-spin' : ''}`} />
                <span>{isExtractingActions ? 'Extracting with Gemini...' : 'Extract Actions ✨'}</span>
              </button>
            </div>

            {/* Action Items List */}
            {actionItems.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-1">
                No action items yet. Add one below or click "Extract Actions ✨" to let Gemini distill habits from your writing.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                      item.completed
                        ? 'bg-white/[0.02] border-white/[0.04] text-slate-500 line-through'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-200'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleAction(item.id)}
                        className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer"
                      />
                      <span className="text-xs truncate">{item.text}</span>
                    </label>

                    <button
                      onClick={() => handleDeleteAction(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/40 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add action item input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add a new personal action item or takeaway..."
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
              />
              <button
                onClick={handleAddAction}
                disabled={!newActionText.trim()}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Error Banner if any */}
      {saveStatus === 'error' && (
        <div className="px-6 py-2.5 bg-rose-950/80 backdrop-blur-md border-b border-rose-800/80 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {saveError || 'Failed to persist changes to Cloud Firestore database.'}
            </span>
          </div>
          <button
            onClick={onRetrySave}
            className="flex items-center gap-1 bg-rose-800 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Retry Save
          </button>
        </div>
      )}

      {/* Messages / Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-12 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-10 space-y-6">
            <div className="relative inline-block">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(99,102,241,0.3)] backdrop-blur-md">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 tracking-tight">
                Begin Your Journal Reflection
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Write freely about what is on your mind, what happened today, or an idea you are exploring. Gemini 3.6 Flash will provide insights, synthesis, or brainstorming.
              </p>
            </div>

            {/* Quick Sparks Launcher Button */}
            {onOpenPromptSparks && (
              <div className="flex justify-center">
                <button
                  onClick={onOpenPromptSparks}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Explore Zen Catalyst Sparks (Stoic, Gratitude, Resilience...)</span>
                </button>
              </div>
            )}

            {/* Quick Starter Prompts */}
            <div className="text-left space-y-2.5 max-w-lg mx-auto pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suggested Prompts ({mode})
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {PROMPT_SUGGESTIONS[mode]?.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/40 hover:bg-white/[0.07] text-xs text-slate-300 transition-all flex items-center justify-between group cursor-pointer shadow-sm hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                  isUser ? 'ml-auto' : 'mr-auto'
                }`}
              >
                {/* Role Header */}
                <div className="flex items-center gap-2 mb-1.5 px-1 text-xs text-slate-400">
                  {isUser ? (
                    <span className="font-semibold text-slate-300">Your Reflection</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> Gemini 3.6 Flash
                      </span>
                      {msg.modelUsed && (
                        <span className="text-[10px] bg-black/40 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Bubble Card */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl w-full text-sm leading-relaxed transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-indigo-950/80 to-purple-950/70 border border-indigo-500/30 text-slate-100 rounded-tr-sm shadow-[0_4px_20px_-4px_rgba(79,70,229,0.25)] backdrop-blur-md'
                      : 'bg-[#0e1224]/80 border border-white/[0.08] text-slate-200 rounded-tl-sm shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] backdrop-blur-md'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed text-slate-200">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}

                  {/* Action row on Gemini responses */}
                  {!isUser && (
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Isolated in Firestore
                        </span>

                        {/* Notification Status / Quick Dispatch */}
                        {onManualDispatch && (
                          <div className="flex items-center gap-1 pl-2 border-l border-white/[0.08]">
                            <span className="text-[10px] text-slate-500 hidden sm:inline">Notify:</span>
                            
                            {/* Slack Button */}
                            <button
                              onClick={() => handleManualDispatchClick(msg.id, msg.content, 'slack')}
                              disabled={dispatchingMsgId === msg.id}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                notificationSettings?.slackEnabled
                                  ? 'bg-[#4A154B]/60 text-[#ECB22E] hover:bg-[#4A154B] border border-[#ECB22E]/30'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                              }`}
                              title={notificationSettings?.slackEnabled ? 'Dispatch to Slack' : 'Configure Slack in Notification Settings'}
                            >
                              # Slack
                            </button>

                            {/* Discord Button */}
                            <button
                              onClick={() => handleManualDispatchClick(msg.id, msg.content, 'discord')}
                              disabled={dispatchingMsgId === msg.id}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                notificationSettings?.discordEnabled
                                  ? 'bg-[#5865F2]/40 text-indigo-200 hover:bg-[#5865F2]/70 border border-[#5865F2]/40'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                              }`}
                              title={notificationSettings?.discordEnabled ? 'Dispatch to Discord' : 'Configure Discord in Notification Settings'}
                            >
                              Discord
                            </button>

                            {/* Email Button */}
                            <button
                              onClick={() => handleManualDispatchClick(msg.id, msg.content, 'email')}
                              disabled={dispatchingMsgId === msg.id}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                                notificationSettings?.emailEnabled
                                  ? 'bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/40'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                              }`}
                              title={notificationSettings?.emailEnabled ? 'Dispatch to Email Relay' : 'Configure Email in Notification Settings'}
                            >
                              Email
                            </button>

                            {dispatchSuccessMsgId?.id === msg.id && (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 animate-fade-in">
                                <Check className="w-3 h-3" /> Dispatched!
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06] cursor-pointer"
                        title="Copy response"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px] font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator while Gemini generates */}
        {isGenerating && (
          <div className="flex flex-col items-start max-w-3xl mr-auto">
            <div className="flex items-center gap-1.5 mb-1.5 px-1 text-xs text-indigo-300">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
              <span>Gemini 3.6 Flash is synthesizing insights...</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0e1224]/80 border border-indigo-500/30 rounded-tl-sm w-full max-w-md shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s] shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s] shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <span className="text-xs text-slate-300 font-medium">Connecting to Gemini AI Engine...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 border-t border-white/[0.08] bg-[#080b15]/75 backdrop-blur-xl shrink-0 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Quick chips if in conversation */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] text-slate-500 shrink-0">Follow-up:</span>
              <button
                onClick={() => setInputText("What are 3 concrete action steps I can take based on this?")}
                className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-white/[0.08] text-[11px] whitespace-nowrap transition-all cursor-pointer"
              >
                Action Steps
              </button>
              <button
                onClick={() => setInputText("Can you give me a counter-perspective to challenge my assumptions?")}
                className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-white/[0.08] text-[11px] whitespace-nowrap transition-all cursor-pointer"
              >
                Counter-Perspective
              </button>
              <button
                onClick={() => setInputText("Summarize this conversation in two sentences.")}
                className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-white/[0.08] text-[11px] whitespace-nowrap transition-all cursor-pointer"
              >
                Quick Summary
              </button>
            </div>
          )}

          {/* Textarea Box */}
          <div className="relative bg-[#060810]/70 border border-white/[0.1] rounded-2xl p-3 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-inner backdrop-blur-md transition-all">
            <textarea
              ref={textareaRef}
              id="journal-prompt-textarea"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length === 0
                  ? "Write down your journal entry, thoughts, or questions (Cmd/Ctrl + Enter to reflect)..."
                  : "Reply to continue the dialogue or explore deeper..."
              }
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-xs">
              <div className="flex items-center gap-2 sm:gap-3 text-slate-400 text-[11px]">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.08]'
                  }`}
                  title={isRecording ? 'Stop Voice Dictation' : 'Start Voice Dictation'}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
                  <span className="hidden sm:inline">{isRecording ? 'Listening...' : 'Dictate'}</span>
                </button>

                <span>{wordCount} words</span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline">Press <kbd className="bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono">Cmd/Ctrl + Enter</kbd></span>
              </div>

              <button
                id="submit-reflection-btn"
                onClick={handleSend}
                disabled={!inputText.trim() || isGenerating}
                className="flex items-center gap-2 glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{messages.length === 0 ? `Reflect (${mode})` : 'Send Reply'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
