import React from 'react';
import { ShieldCheck, X, Lock, Key, Server, Database, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0e1e]/90 border border-white/[0.12] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(99,102,241,0.2)] text-slate-200 backdrop-blur-xl">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Security Architecture & Agentic Threat Model</h2>
              <p className="text-xs text-slate-400">Structured 5-Zone Threat Modeling & OWASP Top 10 Mitigations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
          {/* Section 1: 5 Threat Zones Table */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Agentic Threat Summary (The 5 Threat Zones)
            </h3>
            <div className="overflow-x-auto border border-white/[0.08] rounded-xl shadow-inner bg-black/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-300 font-semibold text-[11px]">
                    <th className="p-3">Threat Zone</th>
                    <th className="p-3">Identified Risks</th>
                    <th className="p-3">Implemented Countermeasures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">1. Input Surfaces</td>
                    <td className="p-3 text-slate-400">Prompt injection, malformed JSON payloads, prototype pollution, cross-site script injections.</td>
                    <td className="p-3 text-emerald-400">Top-level Express body-parsing, strict type validation, string sanitization, and Markdown output encoding.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">2. Planning & Reasoning</td>
                    <td className="p-3 text-slate-400">System instruction bypass, behavioral drift, unintended action execution.</td>
                    <td className="p-3 text-emerald-400">Strict system prompts bound to reflective journaling, temperature clamping (0.3 - 0.7), scoped mode schemas.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">3. Tool Execution</td>
                    <td className="p-3 text-slate-400">Privilege escalation, SSRF, dynamic code evaluation.</td>
                    <td className="p-3 text-emerald-400">No dynamic eval or arbitrary shell invocation; all endpoints parameterized and restricted to Gemini API proxy.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">4. Memory & State</td>
                    <td className="p-3 text-slate-400">Cross-user data leakage, unauthorized reads/writes in Firestore, state desynchronization.</td>
                    <td className="p-3 text-emerald-400">Enforced Firestore security rules (<code className="text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800/40">request.auth.uid == userId</code>) at subcollection path <code className="text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800/40">/users/&#123;userId&#125;/interactions/&#123;id&#125;</code>.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-200">5. Inter-System Communication</td>
                    <td className="p-3 text-slate-400">API key leakage, credential exposure in frontend bundles, unhandled upstream outages.</td>
                    <td className="p-3 text-emerald-400">Server-side proxy for Gemini API with Secret Manager injection. Automated Fallback Ladder (<code className="text-[10px] bg-indigo-950/50 px-1.5 py-0.5 rounded text-indigo-300 border border-indigo-800/40">gemini-3.6-flash &rarr; 3.1-flash-lite &rarr; 3.7-flash</code>).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Firestore Security Rules */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
            <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Verified Firestore Security Rules (<code className="text-emerald-400">firestore.rules</code>)
            </h4>
            <pre className="p-3.5 rounded-lg bg-[#070914] border border-white/[0.08] font-mono text-[11px] text-emerald-300 overflow-x-auto shadow-inner">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
            </pre>
            <p className="text-[11px] text-slate-400 mt-2">
              Ensures complete tenant isolation where no user can query or mutate another user's journal entries or summaries.
            </p>
          </div>

          {/* Section 3: Secret Management Standards */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08]">
            <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Zero-Hardcoding Secret Hygiene
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>No Client-Side AI Keys:</strong> All Gemini API calls are strictly handled server-side via Node Express backend.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>Secret Manager & Env Var Injection:</strong> Secrets loaded at runtime via <code className="text-amber-300 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-800/40">process.env.GEMINI_API_KEY</code>.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>Federated Auth:</strong> No plain password handling in custom application code.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-black/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 glass-button-primary text-white rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
          >
            Close Threat Model
          </button>
        </div>
      </div>
    </div>
  );
};
