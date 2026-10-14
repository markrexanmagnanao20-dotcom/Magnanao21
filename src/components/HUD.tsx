/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats, PlayerState, VideoSettings } from '../types/game';
import { Pause, Volume2, VolumeX, Zap, Shield, Heart, Sparkles } from 'lucide-react';
import { SHIPS } from '../game/constants';

interface HUDProps {
  player: PlayerState;
  stats: GameStats;
  isMuted: boolean;
  videoSettings: VideoSettings;
  activeUpgrades: Record<string, number>;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerDash: () => void;
  onTriggerSpecial: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  stats,
  isMuted,
  activeUpgrades,
  onToggleMute,
  onPause,
  onTriggerDash,
  onTriggerSpecial,
}) => {
  const shipConfig = SHIPS[player.shipId] || SHIPS.valkyrie;
  const healthPercent = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (player.shield / player.maxShield) * 100));
  const xpPercent = Math.max(0, Math.min(100, (player.xp / player.xpToNextLevel) * 100));
  const specialPercent = Math.max(0, Math.min(100, (player.specialMeter / player.maxSpecialMeter) * 100));
  const dashReady = player.dashCooldown <= 0;
  const specialReady = player.specialMeter >= player.maxSpecialMeter;

  // Format score
  const scoreDisplay = stats.score.toLocaleString();

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 select-none md:p-5">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Level & XP Bar */}
        <div className="flex flex-col gap-1.5 w-44 sm:w-60">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              LVL {player.level}
            </span>
            <span className="text-slate-400 text-[11px]">
              {Math.floor(player.xp)} / {player.xpToNextLevel} XP
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-xs">
            <div
              className="h-full bg-linear-to-r from-cyan-500 to-sky-300 transition-all duration-150"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Center: Wave & Score & Combo */}
        <div className="flex flex-col items-center">
          <div className="text-xl sm:text-2xl font-black tracking-wider text-white drop-shadow-md font-mono">
            {scoreDisplay}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs font-medium text-slate-400">
            <span>WAVE {stats.wave}</span>
            {stats.currentCombo > 1 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-bold animate-pulse">
                  {stats.currentCombo}x COMBO
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMute}
            aria-label="Toggle sound"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur-xs"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={onPause}
            aria-label="Pause game"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur-xs"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle: Floating notifications or Active Upgrades List */}
      <div className="flex items-center justify-start gap-1.5 flex-wrap max-w-md">
        {Object.entries(activeUpgrades).map(([key, level]) => (
          <div
            key={key}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/85 border border-slate-800 text-[11px] font-medium text-slate-300 backdrop-blur-xs"
          >
            <span className="capitalize">{key.replace('_', ' ')}</span>
            <span className="text-cyan-400 font-bold">T{level}</span>
          </div>
        ))}
      </div>

      {/* Bottom Bar: Health, Shield, Dash & Ultimate */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
        {/* Left: Hull & Shield Bars */}
        <div className="flex flex-col gap-2 w-56 sm:w-72 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
          {/* Hull / Health Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
                <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                HULL
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                {Math.ceil(player.health)} / {player.maxHealth}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900 border border-rose-950/40">
              <div
                className={`h-full transition-all duration-150 ${
                  healthPercent < 25
                    ? 'bg-rose-600 animate-pulse'
                    : healthPercent < 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Shield Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                <Shield className="w-3.5 h-3.5 fill-cyan-500/20" />
                SHIELD
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                {Math.ceil(player.shield)} / {player.maxShield}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-cyan-950/40">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Quick Action Ability Triggers (Dash & Special) */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Dash Button */}
          <button
            onClick={onTriggerDash}
            disabled={!dashReady}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              dashReady
                ? 'bg-sky-950/80 border-sky-500/50 text-sky-200 hover:bg-sky-900/80 cursor-pointer shadow-lg shadow-sky-950/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-400" />
            <span>DASH</span>
            <span className="hidden sm:inline text-[10px] opacity-60">
              {dashReady ? '[Shift]' : `${player.dashCooldown.toFixed(1)}s`}
            </span>
          </button>

          {/* Ultimate / Special Button */}
          <button
            onClick={onTriggerSpecial}
            disabled={!specialReady}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              specialReady
                ? 'bg-linear-to-r from-amber-500 to-rose-500 border-amber-300 text-white cursor-pointer shadow-lg shadow-amber-500/30 animate-pulse'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{shipConfig.specialName}</span>
            <span className="hidden sm:inline text-[10px] opacity-75">
              {specialReady ? '[Space]' : `${Math.floor(specialPercent)}%`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
