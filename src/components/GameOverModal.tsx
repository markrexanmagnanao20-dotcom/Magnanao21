/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats } from '../types/game';
import { RotateCcw, Home, Trophy, Skull } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  isNewHighScore: boolean;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewHighScore,
  onRestart,
  onReturnToMenu,
}) => {
  const accuracy =
    stats.shotsFired > 0
      ? Math.min(100, Math.round((stats.shotsHit / stats.shotsFired) * 100))
      : 0;

  const minutes = Math.floor(stats.timeSurvived / 60);
  const seconds = Math.floor(stats.timeSurvived % 60);
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Skull Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-500 mb-4 animate-bounce">
          <Skull className="w-7 h-7" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black tracking-wider uppercase text-white font-mono mb-1">
          HULL BREACH DETECTED
        </h2>
        <p className="text-xs text-rose-400 font-semibold mb-6">
          Vessel telemetry lost in deep space
        </p>

        {/* Score Display */}
        <div className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 mb-6 flex flex-col items-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            FINAL SCORE
          </span>
          <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {stats.score.toLocaleString()}
          </span>

          {isNewHighScore && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Trophy className="w-4 h-4" />
              <span>NEW RECORD ESTABLISHED</span>
            </div>
          )}
        </div>

        {/* Detailed Run Telemetry Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8 text-left">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">WAVE REACHED</span>
            <span className="text-base font-bold font-mono text-cyan-400">{stats.wave}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">TARGETS DESTROYED</span>
            <span className="text-base font-bold font-mono text-emerald-400">{stats.enemiesDefeated}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">MAX COMBO</span>
            <span className="text-base font-bold font-mono text-amber-400">{stats.maxCombo}x</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">SHARDS HARVESTED</span>
            <span className="text-base font-bold font-mono text-sky-400">{stats.crystalsCollected}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">FIRE ACCURACY</span>
            <span className="text-base font-bold font-mono text-slate-200">{accuracy}%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">FLIGHT TIME</span>
            <span className="text-base font-bold font-mono text-slate-200">{timeFormatted}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Deploy Again</span>
          </button>
          <button
            onClick={onReturnToMenu}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Hangar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
