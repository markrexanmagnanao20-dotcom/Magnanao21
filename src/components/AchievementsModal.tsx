/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Achievement } from '../types/game';
import { X, Trophy, Crosshair, Zap, Shield, Skull, Gem, Sparkles, CheckCircle2, Lock } from 'lucide-react';

interface AchievementsModalProps {
  achievements: Achievement[];
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Crosshair,
  Zap,
  Shield,
  Skull,
  Gem,
  Sparkles,
};

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ achievements, onClose }) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
              COMBAT HONORS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1 shrink-0">
          <span>Trophies Unlocked</span>
          <span className="font-mono font-bold text-amber-400">
            {unlockedCount} / {achievements.length}
          </span>
        </div>

        {/* Achievements List */}
        <div className="space-y-2.5 overflow-y-auto pr-1">
          {achievements.map((ach) => {
            const Icon = ICON_MAP[ach.icon] || Trophy;

            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
                  ach.unlocked
                    ? 'bg-slate-950/80 border-amber-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    ach.unlocked
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{ach.title}</span>
                    {ach.unlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 leading-normal">{ach.description}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          Return
        </button>
      </div>
    </div>
  );
};
