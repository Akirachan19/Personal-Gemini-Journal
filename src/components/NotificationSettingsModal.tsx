import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Code, 
  Activity, 
  Mail, 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';
import type { 
  NotificationSettings, 
  NotificationLog, 
  NotificationProvider, 
  NotificationTriggerMode 
} from '../types';
import { testExternalNotification } from '../firebase';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSaveSettings: (settings: NotificationSettings) => Promise<void>;
  logs: NotificationLog[];
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSaveSettings,
  logs,
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'triggers' | 'directive' | 'logs'>('channels');
  const [formData, setFormData] = useState<NotificationSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Testing states
  const [testingProvider, setTestingProvider] = useState<NotificationProvider | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);

  // Keyword input
  const [newKeyword, setNewKeyword] = useState('');
  const [copiedSchema, setCopiedSchema] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleChannel = (channel: 'slack' | 'discord' | 'email') => {
    if (channel === 'slack') {
      setFormData(prev => ({ ...prev, slackEnabled: !prev.slackEnabled }));
    } else if (channel === 'discord') {
      setFormData(prev => ({ ...prev, discordEnabled: !prev.discordEnabled }));
    } else {
      setFormData(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }));
    }
  };

  const handleTestWebhook = async (provider: NotificationProvider) => {
    setTestingProvider(provider);
    setTestResult(null);

    try {
      let targetUrl = '';
      let targetEmail = '';

      if (provider === 'slack') {
        targetUrl = formData.slackWebhookUrl;
      } else if (provider === 'discord') {
        targetUrl = formData.discordWebhookUrl;
      } else {
        targetUrl = formData.emailWebhookUrl;
        targetEmail = formData.emailAddress;
      }

      if (!targetUrl && provider !== 'email') {
        throw new Error(`Please enter a valid ${provider.toUpperCase()} Webhook URL first.`);
      }

      const res = await testExternalNotification(provider, targetUrl, targetEmail);
      setTestResult({
        provider,
        success: true,
        message: res.message || `Test notification verified for ${provider.toUpperCase()}`
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err?.message || `Failed to verify ${provider} webhook.`
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (!formData.filterKeywords.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        filterKeywords: [...prev.filterKeywords, trimmed]
      }));
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setFormData(prev => ({
      ...prev,
      filterKeywords: prev.filterKeywords.filter(k => k !== kw)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save notification settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(id);
    setTimeout(() => setCopiedSchema(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0e1e]/95 border border-white/[0.12] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(99,102,241,0.25)] text-slate-200 backdrop-blur-xl">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Bell className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                External Notifications & Webhook Directive
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  Live API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Dispatch parsed journal reflections to Slack, Discord, and Email with SSRF-hardened directives.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-white/[0.08] bg-black/30 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-4 py-3 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'channels'
                ? 'border-indigo-500 text-indigo-300 font-semibold shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Channels & Webhooks
          </button>

          <button
            onClick={() => setActiveTab('triggers')}
            className={`px-4 py-3 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'triggers'
                ? 'border-indigo-500 text-indigo-300 font-semibold shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Parsing Trigger Rules
          </button>

          <button
            onClick={() => setActiveTab('directive')}
            className={`px-4 py-3 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'directive'
                ? 'border-indigo-500 text-indigo-300 font-semibold shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            API Directive & Schemas
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-3 font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-300 font-semibold shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Dispatch Audit Logs ({logs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed max-h-[60vh]">
          
          {/* Status Feedback Toast inside modal */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200 shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{testResult.provider.toUpperCase()} Verification:</p>
                <p className="text-[11px] opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* TAB 1: Channels & Webhook Configuration */}
          {activeTab === 'channels' && (
            <div className="space-y-5">
              
              {/* Slack Channel */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#4A154B]/80 text-[#ECB22E] flex items-center justify-center font-bold text-xs shadow-sm">
                      #
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Slack Incoming Webhook</h3>
                      <p className="text-[11px] text-slate-400">Post structured Block Kit reflections to your Slack channels</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.slackEnabled}
                      onChange={() => handleToggleChannel('slack')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">
                    Webhook URL (<code className="text-indigo-300">https://hooks.slack.com/...</code>)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                      value={formData.slackWebhookUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                      disabled={!formData.slackEnabled}
                      className="flex-1 bg-[#070914] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestWebhook('slack')}
                      disabled={!formData.slackEnabled || !formData.slackWebhookUrl || testingProvider === 'slack'}
                      className="px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      {testingProvider === 'slack' ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Discord Channel */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#5865F2]/80 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      D
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Discord Webhook Embed</h3>
                      <p className="text-[11px] text-slate-400">Deliver color-coded rich embeds directly to Discord server channels</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.discordEnabled}
                      onChange={() => handleToggleChannel('discord')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300">
                    Webhook URL (<code className="text-indigo-300">https://discord.com/api/webhooks/...</code>)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/12345/abcdef..."
                      value={formData.discordWebhookUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, discordWebhookUrl: e.target.value }))}
                      disabled={!formData.discordEnabled}
                      className="flex-1 bg-[#070914] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestWebhook('discord')}
                      disabled={!formData.discordEnabled || !formData.discordWebhookUrl || testingProvider === 'discord'}
                      className="px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      {testingProvider === 'discord' ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Email / Webhook Relay Channel */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Email & Custom Webhook Relay</h3>
                      <p className="text-[11px] text-slate-400">Receive formatted email digests or proxy through custom server relay</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.emailEnabled}
                      onChange={() => handleToggleChannel('email')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={formData.emailAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
                      disabled={!formData.emailEnabled}
                      className="w-full bg-[#070914] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Relay Endpoint (Optional Webhook)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://api.relay.com/notify"
                        value={formData.emailWebhookUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, emailWebhookUrl: e.target.value }))}
                        disabled={!formData.emailEnabled}
                        className="flex-1 bg-[#070914] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs disabled:opacity-50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestWebhook('email')}
                        disabled={!formData.emailEnabled || (!formData.emailAddress && !formData.emailWebhookUrl) || testingProvider === 'email'}
                        className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                      >
                        {testingProvider === 'email' ? (
                          <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Parsing Trigger Rules */}
          {activeTab === 'triggers' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
                <h3 className="font-semibold text-white mb-2">Automated Notification Trigger Mode</h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Define which types of parsed entries automatically trigger notifications to enabled channels.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'all', label: 'All Gemini Reflections', desc: 'Notify on every new AI synthesis and journal turn' },
                    { id: 'summarize', label: 'Executive Summaries with Action Items', desc: 'Notify when high-level takeaways or next steps are extracted' },
                    { id: 'brainstorm', label: 'Breakthrough Brainstorms', desc: 'Notify only on creative divergent brainstorming sessions' },
                    { id: 'keywords', label: 'Keyword Match Filter', desc: 'Notify only if reflection contains matching trigger keywords' },
                    { id: 'manual', label: 'Manual Dispatch Only', desc: 'Only send when you explicitly click the Dispatch button on an entry' },
                  ].map((modeOption) => (
                    <label
                      key={modeOption.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        formData.triggerMode === modeOption.id
                          ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-100 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]'
                          : 'bg-[#070914] border-white/[0.06] text-slate-300 hover:border-white/[0.12]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="triggerMode"
                        value={modeOption.id}
                        checked={formData.triggerMode === modeOption.id}
                        onChange={() => setFormData(prev => ({ ...prev, triggerMode: modeOption.id as NotificationTriggerMode }))}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-semibold text-white">{modeOption.label}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">{modeOption.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Keyword Filter Management */}
              {formData.triggerMode === 'keywords' && (
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-3">
                  <h4 className="font-semibold text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Trigger Keyword Matchers
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    If an entry prompt or Gemini insight contains any of these phrases, an external notification will be dispatched automatically.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Breakthrough, Goal, Action Item, Priority..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                      className="flex-1 bg-[#070914] border border-white/[0.1] rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Keyword
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.filterKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 shadow-sm"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="hover:text-rose-400 cursor-pointer"
                          aria-label={`Remove ${kw}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: API Directive & Payload Schemas */}
          {activeTab === 'directive' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Notification API Directive Security Spec
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    SSRF Protected
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
                  All external notifications are proxied through server-side handlers (<code className="text-indigo-300">/api/notifications/dispatch</code>) with strict HTTPS enforcement, host boundary checks, and private loopback / metadata server blocking (RFC 1918 & 169.254.169.254).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#070914] border border-white/[0.06]">
                    <span className="text-slate-300 font-semibold block mb-1">Slack Directive</span>
                    <span className="text-slate-400">Validated against <code className="text-indigo-300">hooks.slack.com</code>. Formats Slack Block Kit sections with action headers and markdown quotes.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#070914] border border-white/[0.06]">
                    <span className="text-slate-300 font-semibold block mb-1">Discord Directive</span>
                    <span className="text-slate-400">Validated against <code className="text-indigo-300">discord.com</code>. Formats rich embedded card blocks with dynamic color palette matching reflection mode.</span>
                  </div>
                </div>
              </div>

              {/* Payload Schema Example: Slack Block Kit */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-200 text-xs">Slack Block Kit JSON Schema</h4>
                  <button
                    onClick={() => copyToClipboard(`{
  "text": "MindReflect AI: [SUMMARIZE] Q3 Goals Review",
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "✨ MindReflect AI — Executive Summary" } },
    { "type": "section", "fields": [{ "type": "mrkdwn", "text": "*Title:* Q3 Goals" }, { "type": "mrkdwn", "text": "*Trigger:* Summarize Action Items" }] },
    { "type": "section", "text": { "type": "mrkdwn", "text": "*AI Synthesis:* Key milestones extracted..." } }
  ]
}`, 'slack-schema')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSchema === 'slack-schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSchema === 'slack-schema' ? 'Copied' : 'Copy Schema'}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-[#070914] border border-white/[0.06] font-mono text-[10px] text-indigo-300 overflow-x-auto">
{`{
  "text": "MindReflect AI: [SUMMARIZE] Q3 Goals Review",
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "✨ MindReflect AI — Executive Summary" } },
    { "type": "section", "fields": [{ "type": "mrkdwn", "text": "*Title:* Q3 Goals" }, { "type": "mrkdwn", "text": "*Trigger:* Summarize Action Items" }] },
    { "type": "section", "text": { "type": "mrkdwn", "text": "*AI Synthesis:* Key milestones extracted..." } }
  ]
}`}
                </pre>
              </div>

              {/* Discord Embed Schema */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-200 text-xs">Discord Embed JSON Schema</h4>
                  <button
                    onClick={() => copyToClipboard(`{
  "username": "MindReflect AI",
  "embeds": [{
    "title": "✨ Breakthrough Idea: AI Mindfulness",
    "description": "**Prompt:** How can we focus deeper?\\n\\n**AI Synthesis:** Explore micro-reflections...",
    "color": 6514417,
    "fields": [{ "name": "Mode", "value": "brainstorm", "inline": true }]
  }]
}`, 'discord-schema')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSchema === 'discord-schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSchema === 'discord-schema' ? 'Copied' : 'Copy Schema'}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-[#070914] border border-white/[0.06] font-mono text-[10px] text-indigo-300 overflow-x-auto">
{`{
  "username": "MindReflect AI",
  "embeds": [{
    "title": "✨ Breakthrough Idea: AI Mindfulness",
    "description": "**Prompt:** How can we focus deeper?\\n\\n**AI Synthesis:** Explore micro-reflections...",
    "color": 6514417,
    "fields": [{ "name": "Mode", "value": "brainstorm", "inline": true }]
  }]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Dispatch Audit Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Recent Notification Audit Logs</h3>
                <span className="text-[11px] text-slate-400">Tracked in user-isolated Firestore</span>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center bg-black/40 border border-white/[0.08] rounded-xl text-slate-400">
                  <Activity className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No notification dispatches recorded yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When entries are parsed or tested, audit records will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            log.status === 'success'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.provider === 'slack' ? '#' : log.provider === 'discord' ? 'D' : '@'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                            <span>{log.entryTitle || 'Journal Reflection'}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                log.status === 'success'
                                  ? 'bg-emerald-950/60 text-emerald-300'
                                  : 'bg-rose-950/60 text-rose-300'
                              }`}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-md">
                            {log.messageExcerpt || log.errorMessage || `Dispatched to ${log.provider}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 shrink-0 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settings saved to Firestore!
              </span>
            )}
            {saveError && (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {saveError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-notification-settings-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 glass-button-primary text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save Preferences
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
