
import React from 'react';
import { AuthUser } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 no-print">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl border-b border-slate-200/50"></div>
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-premium group-hover:rotate-6">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                SympVis <span className="text-indigo-600">AI</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] -mt-1">Safety First</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900 leading-none mb-1">{user.fullName || user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{user.primaryEmailAddress?.emailAddress || user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-premium border border-slate-200 shadow-sm"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
                Encrypted Session
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Privacy Transparency Banner */}
      <div className="bg-slate-900 py-3 no-print border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">No medical data stored permanently.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Session deleted after 30 minutes.</p>
          </div>
        </div>
      </div>

      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 no-print">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              © {new Date().getFullYear()} SympVis Health Intelligence
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Advanced triage using multi-modal large language models and clinical guardrails.
            </p>
          </div>
          <div className="bg-indigo-50 px-6 py-4 rounded-2xl max-w-md border border-indigo-100">
            <p className="text-[10px] text-indigo-700 italic font-medium leading-relaxed text-center md:text-left">
              SympVis is not a substitute for professional medical advice, diagnosis, or treatment.
              Always seek the advice of your physician.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
