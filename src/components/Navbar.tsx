import React from 'react';
import { Sparkles, Database, LogOut, ShieldCheck, User as UserIcon, Bell, BarChart3, Zap } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  syncStatus: 'synced' | 'saving' | 'error';
  onShowSecurityInfo: () => void;
  onShowNotificationSettings?: () => void;
  onShowPromptSparks?: () => void;
  onShowAnalytics?: () => void;
  activeChannelsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  syncStatus,
  onShowSecurityInfo,
  onShowNotificationSettings,
  onShowPromptSparks,
  onShowAnalytics,
  activeChannelsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#080b14]/75 backdrop-blur-xl border-b border-white/[0.08] text-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Badges */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/80 via-indigo-500/80 to-purple-500/80 p-0.5 shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_22px_-2px_rgba(99,102,241,0.6)]">
              <div className="w-full h-full bg-[#0b0e1b] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 tracking-tight text-lg drop-shadow-sm">MindReflect AI</span>
              <span className="text-[11px] font-medium tracking-wide bg-indigo-500/15 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 shadow-[0_0_10px_-2px_rgba(99,102,241,0.2)]">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Gemini 3.6 Flash
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Database className="w-3 h-3 text-emerald-400" /> Isolated Firestore
              </span>
              <span className="text-slate-600">•</span>
              <button 
                onClick={onShowSecurityInfo}
                className="text-slate-400 hover:text-indigo-300 underline underline-offset-2 transition-colors flex items-center gap-1 cursor-pointer"
                title="View Security & Threat Model architecture"
              >
                <ShieldCheck className="w-3 h-3 text-sky-400" /> Security Model
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Tool Controls, Sync Status & Auth Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prompt Catalyst Sparks Button */}
          {user && onShowPromptSparks && (
            <button
              id="navbar-prompt-sparks-btn"
              onClick={onShowPromptSparks}
              className="p-2 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl border border-white/[0.08] hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm group"
              title="Open Zen Catalyst & Reflection Sparks"
            >
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline text-xs font-medium">Sparks</span>
            </button>
          )}

          {/* Analytics & Mood Trends Button */}
          {user && onShowAnalytics && (
            <button
              id="navbar-analytics-btn"
              onClick={onShowAnalytics}
              className="p-2 text-slate-300 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl border border-white/[0.08] hover:border-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm group"
              title="View Reflection Analytics & Mood Landscape"
            >
              <BarChart3 className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline text-xs font-medium">Analytics</span>
            </button>
          )}

          {/* Notification Directive Settings Button */}
          {user && onShowNotificationSettings && (
            <button
              id="navbar-notification-settings-btn"
              onClick={onShowNotificationSettings}
              className="relative p-2 text-slate-300 hover:text-indigo-300 hover:bg-white/[0.06] rounded-xl border border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm group"
              title="Configure External Notifications & Webhook Directives"
            >
              <Bell className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-xs font-medium">Notifications</span>
              {activeChannelsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
              )}
            </button>
          )}

          {/* Sync Status Badge */}
          {user && (
            <div className="hidden lg:flex items-center text-xs font-medium px-3 py-1 rounded-full bg-slate-900/80 border border-white/[0.08] backdrop-blur-md shadow-inner">
              {syncStatus === 'synced' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  Synced
                </span>
              )}
              {syncStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                  Saving...
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
                  Sync Issue
                </span>
              )}
            </div>
          )}

          {/* User Profile */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User Avatar'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover shadow-[0_0_10px_-2px_rgba(99,102,241,0.3)]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-medium text-slate-200 leading-tight">
                    {user.displayName || 'Journaler'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate max-w-[120px] leading-tight">
                    {user.email || user.uid}
                  </p>
                </div>
              </div>

              <button
                id="sign-out-button"
                onClick={onSignOut}
                className="p-2 text-slate-400 hover:text-rose-300 hover:bg-white/[0.06] rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Sign in to sync your reflections</div>
          )}
        </div>
      </div>
    </header>
  );
};
