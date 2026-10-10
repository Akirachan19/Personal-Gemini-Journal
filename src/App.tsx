import React, { useState, useEffect, useCallback } from 'react';
import { 
  onUserAuthStateChanged, 
  signInWithGoogle, 
  logOut, 
  subscribeToUserInteractions, 
  saveInteractionToFirestore, 
  deleteInteractionFromFirestore,
  subscribeToNotificationSettings,
  saveNotificationSettingsToFirestore,
  subscribeToNotificationLogs,
  saveNotificationLogToFirestore,
  dispatchExternalNotification,
  getDefaultNotificationSettings
} from './firebase';
import type { 
  UserProfile, 
  JournalInteraction, 
  AIMode, 
  ChatMessage, 
  NotificationSettings, 
  NotificationLog, 
  NotificationProvider 
} from './types';
import { Navbar } from './components/Navbar';
import { AuthLanding } from './components/AuthLanding';
import { JournalSidebar } from './components/JournalSidebar';
import { EntryEditor } from './components/EntryEditor';
import { ThreatModelModal } from './components/ThreatModelModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { PromptSparkModal } from './components/PromptSparkModal';
import { AnalyticsModal } from './components/AnalyticsModal';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
  const [syncError, setSyncError] = useState<string | null>(null);

  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);
  const [isSparksModalOpen, setIsSparksModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Notification States
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onUserAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
        setInteractions([]);
        setActiveInteractionId(null);
        setNotificationSettings(null);
        setNotificationLogs([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Notification Settings & Logs
  useEffect(() => {
    if (!user) return;

    const unsubSettings = subscribeToNotificationSettings(user.uid, (settings) => {
      setNotificationSettings(settings);
    });

    const unsubLogs = subscribeToNotificationLogs(user.uid, (logs) => {
      setNotificationLogs(logs);
    });

    return () => {
      unsubSettings();
      unsubLogs();
    };
  }, [user?.uid]);

  // Subscribe to Firestore interactions for authenticated user
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      return;
    }

    setInteractionsLoading(true);
    const unsubscribe = subscribeToUserInteractions(
      user.uid,
      (items) => {
        setInteractions(items);
        setInteractionsLoading(false);
        setSyncStatus('synced');
        setSyncError(null);

        // Auto-select latest if none selected and items exist
        setActiveInteractionId((curr) => {
          if (!curr && items.length > 0) {
            return items[0].id;
          }
          return curr;
        });
      },
      (error) => {
        console.error('Failed to load interactions from Firestore:', error);
        setInteractionsLoading(false);
        setSyncStatus('error');
        setSyncError('Could not sync with Firestore database.');
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) || null;

  // Handle Google Sign In
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err?.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Create a new blank interaction
  const handleNewEntry = useCallback(() => {
    if (!user) return;
    const newId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newInteraction: JournalInteraction = {
      id: newId,
      userId: user.uid,
      title: 'New Reflection',
      initialPrompt: '',
      mode: 'reflect',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
    };

    setActiveInteractionId(newId);
    // Optimistically update list
    setInteractions((prev) => [newInteraction, ...prev]);
  }, [user]);

  // Update existing interaction
  const handleUpdateInteraction = async (updated: JournalInteraction) => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      // Optimistic update
      setInteractions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      await saveInteractionToFirestore(user.uid, updated);
      setSyncStatus('synced');
      setSyncError(null);
    } catch (err: any) {
      console.error('Failed to update interaction:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to save reflection to Firestore');
    }
  };

  // Delete an interaction
  const handleDeleteInteraction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this journal entry?')) return;

    try {
      setSyncStatus('saving');
      await deleteInteractionFromFirestore(user.uid, id);
      setInteractions((prev) => prev.filter((item) => item.id !== id));
      if (activeInteractionId === id) {
        const remaining = interactions.filter((item) => item.id !== id);
        setActiveInteractionId(remaining.length > 0 ? remaining[0].id : null);
      }
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to delete interaction:', err);
      setSyncStatus('error');
      setSyncError('Failed to delete reflection from Firestore.');
    }
  };

  // Send prompt to Gemini and save interaction to Firestore
  const handleSendPrompt = async (promptText: string, mode: AIMode) => {
    if (!user || !promptText.trim()) return;

    setIsGenerating(true);
    setSyncStatus('saving');
    setSyncError(null);

    // Create user message
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_user',
      role: 'user',
      content: promptText.trim(),
      timestamp: Date.now(),
    };

    // Determine target interaction (current or create new)
    let currentItem = activeInteraction;
    let isNew = false;

    if (!currentItem) {
      isNew = true;
      const newId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      currentItem = {
        id: newId,
        userId: user.uid,
        title: promptText.trim().slice(0, 40) + '...',
        initialPrompt: promptText.trim(),
        mode: mode,
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
      };
      setActiveInteractionId(newId);
    } else {
      currentItem = {
        ...currentItem,
        initialPrompt: currentItem.initialPrompt || promptText.trim(),
        mode: mode,
        messages: [...(currentItem.messages || []), userMessage],
        updatedAt: Date.now(),
      };
    }

    // Update UI optimistically
    const updatedWithUserMsg = { ...currentItem };
    setInteractions((prev) => {
      const exists = prev.some((i) => i.id === updatedWithUserMsg.id);
      if (exists) {
        return prev.map((i) => (i.id === updatedWithUserMsg.id ? updatedWithUserMsg : i));
      }
      return [updatedWithUserMsg, ...prev];
    });

    try {
      // Call server-side Gemini API route
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText.trim(),
          mode: mode,
          history: currentItem.messages.slice(0, -1), // Prior history excluding current prompt
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_ai',
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        modelUsed: data.modelUsed || 'gemini-3.6-flash',
      };

      setActiveModel(data.modelUsed || 'gemini-3.6-flash');

      const finalInteraction: JournalInteraction = {
        ...currentItem,
        title: data.suggestedTitle || currentItem.title,
        messages: [...currentItem.messages, assistantMessage],
        updatedAt: Date.now(),
      };

      // Guaranteed Transaction Verification: Persist to Firestore
      await saveInteractionToFirestore(user.uid, finalInteraction);

      // Trigger Automated External Notifications if criteria matches
      if (notificationSettings) {
        checkAndDispatchAutomaticNotifications(
          finalInteraction,
          promptText.trim(),
          data.reply,
          mode,
          notificationSettings
        );
      }

      // Update state
      setInteractions((prev) =>
        prev.map((i) => (i.id === finalInteraction.id ? finalInteraction : i))
      );
      setSyncStatus('synced');
      setSyncError(null);
    } catch (err: any) {
      console.error('Error during Gemini reflection or Firestore save:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Error occurred while processing reflection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper: Evaluates trigger rules and dispatches notification
  const checkAndDispatchAutomaticNotifications = async (
    interaction: JournalInteraction,
    prompt: string,
    aiReply: string,
    mode: AIMode,
    settings: NotificationSettings
  ) => {
    if (!user) return;
    if (!settings.slackEnabled && !settings.discordEnabled && !settings.emailEnabled) {
      return;
    }

    let shouldTrigger = false;
    const triggerMode = settings.triggerMode;

    if (triggerMode === 'all') {
      shouldTrigger = true;
    } else if (triggerMode === 'summarize' && mode === 'summarize') {
      shouldTrigger = true;
    } else if (triggerMode === 'brainstorm' && mode === 'brainstorm') {
      shouldTrigger = true;
    } else if (triggerMode === 'keywords') {
      const combinedText = `${prompt} ${aiReply}`.toLowerCase();
      shouldTrigger = settings.filterKeywords.some((kw) =>
        combinedText.includes(kw.toLowerCase().trim())
      );
    }

    if (!shouldTrigger) return;

    // Dispatch to enabled channels in parallel
    const activeProviders: NotificationProvider[] = [];
    if (settings.slackEnabled && settings.slackWebhookUrl) activeProviders.push('slack');
    if (settings.discordEnabled && settings.discordWebhookUrl) activeProviders.push('discord');
    if (settings.emailEnabled && (settings.emailAddress || settings.emailWebhookUrl)) activeProviders.push('email');

    for (const provider of activeProviders) {
      try {
        let webhookUrl = '';
        if (provider === 'slack') webhookUrl = settings.slackWebhookUrl;
        if (provider === 'discord') webhookUrl = settings.discordWebhookUrl;
        if (provider === 'email') webhookUrl = settings.emailWebhookUrl;

        await dispatchExternalNotification({
          provider,
          webhookUrl,
          emailAddress: provider === 'email' ? settings.emailAddress : undefined,
          emailWebhookUrl: provider === 'email' ? settings.emailWebhookUrl : undefined,
          entry: {
            id: interaction.id,
            title: interaction.title,
            mode: mode,
            initialPrompt: prompt,
            latestAiInsight: aiReply,
            createdAt: interaction.createdAt,
            tags: interaction.tags || [],
          },
          triggerReason: `Auto-trigger (${settings.triggerMode})`,
        });

        const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await saveNotificationLogToFirestore(user.uid, {
          id: logId,
          userId: user.uid,
          interactionId: interaction.id,
          provider,
          status: 'success',
          entryTitle: interaction.title,
          messageExcerpt: aiReply.slice(0, 120) + '...',
          timestamp: Date.now(),
        });
      } catch (err: any) {
        console.warn(`Automated notification failed for ${provider}:`, err);
        const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await saveNotificationLogToFirestore(user.uid, {
          id: logId,
          userId: user.uid,
          interactionId: interaction.id,
          provider,
          status: 'failed',
          entryTitle: interaction.title,
          messageExcerpt: (prompt || '').slice(0, 120),
          errorMessage: err?.message || 'Dispatch error',
          timestamp: Date.now(),
        });
      }
    }
  };

  // Manual Dispatch Handler
  const handleManualDispatch = async (
    provider: NotificationProvider,
    userPrompt: string,
    aiInsight: string
  ) => {
    if (!user || !notificationSettings) return;

    let webhookUrl = '';
    if (provider === 'slack') webhookUrl = notificationSettings.slackWebhookUrl;
    if (provider === 'discord') webhookUrl = notificationSettings.discordWebhookUrl;
    if (provider === 'email') webhookUrl = notificationSettings.emailWebhookUrl;

    if (!webhookUrl && provider !== 'email') {
      setIsNotificationModalOpen(true);
      throw new Error(`Please configure your ${provider.toUpperCase()} Webhook URL in Notification Settings.`);
    }

    const currentId = activeInteraction?.id || 'manual_entry';
    const title = activeInteraction?.title || 'Journal Reflection';
    const mode = activeInteraction?.mode || 'reflect';

    const res = await dispatchExternalNotification({
      provider,
      webhookUrl,
      emailAddress: provider === 'email' ? notificationSettings.emailAddress : undefined,
      emailWebhookUrl: provider === 'email' ? notificationSettings.emailWebhookUrl : undefined,
      entry: {
        id: currentId,
        title,
        mode,
        initialPrompt: userPrompt,
        latestAiInsight: aiInsight,
        createdAt: activeInteraction?.createdAt || Date.now(),
        tags: activeInteraction?.tags || [],
      },
      triggerReason: 'Manual user dispatch',
    });

    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await saveNotificationLogToFirestore(user.uid, {
      id: logId,
      userId: user.uid,
      interactionId: currentId,
      provider,
      status: res.success ? 'success' : 'failed',
      entryTitle: title,
      messageExcerpt: aiInsight.slice(0, 120) + '...',
      timestamp: Date.now(),
    });
  };

  // Save settings handler
  const handleSaveNotificationSettings = async (newSettings: NotificationSettings) => {
    if (!user) return;
    await saveNotificationSettingsToFirestore(user.uid, newSettings);
    setNotificationSettings(newSettings);
  };

  // Calculate active channels
  const activeChannelsCount = (notificationSettings?.slackEnabled ? 1 : 0) +
    (notificationSettings?.discordEnabled ? 1 : 0) +
    (notificationSettings?.emailEnabled ? 1 : 0);

  // Retry save handler in case of network glitch
  const handleRetrySave = async () => {
    if (!user || !activeInteraction) return;
    setSyncStatus('saving');
    try {
      await saveInteractionToFirestore(user.uid, activeInteraction);
      setSyncStatus('synced');
      setSyncError(null);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err?.message || 'Retry save failed');
    }
  };

  return (
    <div className="min-h-screen immersive-canvas text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/80 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        syncStatus={syncStatus}
        onShowSecurityInfo={() => setIsThreatModalOpen(true)}
        onShowNotificationSettings={() => setIsNotificationModalOpen(true)}
        onShowPromptSparks={() => setIsSparksModalOpen(true)}
        onShowAnalytics={() => setIsAnalyticsModalOpen(true)}
        activeChannelsCount={activeChannelsCount}
      />

      {/* Main View */}
      {authLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 blur-md bg-indigo-500/20 rounded-full"></div>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Verifying secure authentication state...</p>
        </div>
      ) : !user ? (
        <AuthLanding
          onSignIn={handleSignIn}
          authLoading={authLoading}
          authError={authError}
          onShowSecurityInfo={() => setIsThreatModalOpen(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Journal Entries History Sidebar */}
          <JournalSidebar
            interactions={interactions}
            activeId={activeInteractionId}
            onSelect={(id) => setActiveInteractionId(id)}
            onNewEntry={handleNewEntry}
            onDelete={handleDeleteInteraction}
            isLoading={interactionsLoading}
          />

          {/* Right: Active Entry Workspace & Gemini Chat */}
          <EntryEditor
            interaction={activeInteraction}
            onUpdateInteraction={handleUpdateInteraction}
            onSendPrompt={handleSendPrompt}
            isGenerating={isGenerating}
            activeModel={activeModel}
            saveStatus={syncStatus}
            saveError={syncError}
            onRetrySave={handleRetrySave}
            notificationSettings={notificationSettings}
            onManualDispatch={handleManualDispatch}
            onOpenNotificationSettings={() => setIsNotificationModalOpen(true)}
            onOpenPromptSparks={() => setIsSparksModalOpen(true)}
          />
        </div>
      )}

      {/* Threat Model & Security Specification Modal */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />

      {/* External Notifications & Webhook Settings Modal */}
      {user && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          settings={notificationSettings || getDefaultNotificationSettings(user.uid)}
          onSaveSettings={handleSaveNotificationSettings}
          logs={notificationLogs}
        />
      )}

      {/* Zen Catalyst Sparks Generator Modal */}
      <PromptSparkModal
        isOpen={isSparksModalOpen}
        onClose={() => setIsSparksModalOpen(false)}
        onSelectPrompt={(sparkPrompt) => {
          if (!activeInteraction) {
            handleNewEntry();
          }
          handleSendPrompt(sparkPrompt, 'reflect');
        }}
      />

      {/* Analytics & Emotional Trends Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        interactions={interactions}
      />
    </div>
  );
}
