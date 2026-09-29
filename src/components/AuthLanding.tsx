import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BrainCircuit,
  Layers
} from 'lucide-react';

interface AuthLandingProps {
  onSignIn: () => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  onShowSecurityInfo: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({
  onSignIn,
  authLoading,
  authError,
  onShowSecurityInfo,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignInClick = async () => {
    try {
      setIsSigningIn(true);
      await onSignIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent text-slate-100 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 w-full">
        {/* Security & Tech Tag */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Gemini 3.6 Flash Resilient AI
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] backdrop-blur-md">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Firestore Owner-Isolated Security
          </span>
        </div>

        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Personal Reflection & Journaling with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              Gemini 3.6 Flash
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300/90 leading-relaxed max-w-2xl mx-auto font-normal">
            Deepen self-awareness, organize complex thoughts, and synthesize insights with an interactive AI journal. Isolated securely in your personal Cloud Firestore database.
          </p>
        </div>

        {/* Call to Action Box */}
        <div className="max-w-md mx-auto bg-[#0d1020]/75 border border-white/[0.1] rounded-2xl p-7 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_30px_-5px_rgba(99,102,241,0.15)] backdrop-blur-xl mb-14">
          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            id="google-sign-in-btn"
            onClick={handleSignInClick}
            disabled={authLoading || isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-semibold px-6 py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer active:scale-[0.99]"
          >
            {authLoading || isSigningIn ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="text-sm font-semibold">Continue with Google Sign-In</span>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-4 pt-4 border-t border-white/[0.08] text-center">
            <p className="text-[11px] text-slate-400">
              Federated Identity via Firebase Auth. No custom passwords stored.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="bg-[#0e1224]/60 border border-white/[0.08] rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-[#121630]/70 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-md group">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)] group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              Multi-Turn Journal Reflection
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore your thoughts, receive thoughtful philosophical perspectives, and uncover deeper patterns with Gemini 3.6 Flash.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0e1224]/60 border border-white/[0.08] rounded-2xl p-6 hover:border-emerald-500/40 hover:bg-[#121630]/70 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-md group">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              Strict User-Isolation Security
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforced by Firestore Security Rules (<code className="text-[11px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">request.auth.uid == userId</code>). Zero cross-user data leakage.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0e1224]/60 border border-white/[0.08] rounded-2xl p-6 hover:border-amber-500/40 hover:bg-[#121630]/70 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] backdrop-blur-md group">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              Resilient Model Fallback Ladder
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated cascading recovery through Gemini 3.6 Flash, 3.1 Flash-Lite, and 3.7 Flash with zero downtime.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/[0.08] bg-[#070914]/75 backdrop-blur-xl py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>MindReflect AI • Cloud Run AI Challenge Architecture</span>
          <button
            onClick={onShowSecurityInfo}
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Review Threat Model & Security Specification
          </button>
        </div>
      </div>
    </div>
  );
};
