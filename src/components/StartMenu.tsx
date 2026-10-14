/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode, ShipId } from '../types/game';
import { SHIPS } from '../game/constants';
import { Play, Trophy, Settings as SettingsIcon, HelpCircle, Shield, Zap, Flame, Gauge } from 'lucide-react';

interface StartMenuProps {
  onStartGame: (shipId: ShipId, mode: GameMode) => void;
  highScores: Record<GameMode, number>;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartGame,
  highScores,
  onOpenAchievements,
  onOpenSettings,
}) => {
  const [selectedShipId, setSelectedShipId] = useState<ShipId>('valkyrie');
  const [selectedMode, setSelectedMode] = useState<GameMode>('ENDLESS');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const currentShip = SHIPS[selectedShipId] || SHIPS.valkyrie;

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-y-auto overflow-x-hidden p-4 sm:p-8 bg-slate-950 text-slate-100">
      {/* Background Cover Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: `url('/src/assets/images/cosmic_nebula_cover_1791882443952.jpg')` }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/70 to-slate-950 pointer-events-none" />

      {/* Top Bar Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h1 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase font-mono">
            AETHER SURGE
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">How to Play</span>
          </button>
          <button
            onClick={onOpenAchievements}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Records</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content: Ship Selection Hangar & Mode Configuration */}
      <main className="relative z-10 my-auto py-6 flex flex-col items-center max-w-5xl mx-auto w-full">
        {/* Game Mode Selector Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-8 backdrop-blur-md">
          {(['ENDLESS', 'BOSS_RUSH', 'OVERDRIVE'] as GameMode[]).map((mode) => {
            const isActive = selectedMode === mode;
            const labels: Record<GameMode, string> = {
              ENDLESS: 'Endless Incursion',
              BOSS_RUSH: 'Boss Rush',
              OVERDRIVE: 'Overdrive Frenzy',
            };
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* High Score Banner for current mode */}
        <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
          <span>High Score:</span>
          <span className="font-mono font-bold text-amber-400 text-sm">
            {(highScores[selectedMode] || 0).toLocaleString()} PTS
          </span>
        </div>

        {/* Ship Hangar Display Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
          {/* Left Column: Ship Selector Buttons */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              SELECT COMBAT VESSEL
            </span>
            {Object.values(SHIPS).map((ship) => {
              const isSelected = selectedShipId === ship.id;
              return (
                <button
                  key={ship.id}
                  onClick={() => setSelectedShipId(ship.id)}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                  }`}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-cover bg-center overflow-hidden"
                    style={{
                      backgroundImage: ship.imagePath ? `url('${ship.imagePath}')` : undefined,
                      backgroundColor: ship.primaryColor + '20',
                    }}
                  >
                    {!ship.imagePath && <Shield className="w-6 h-6" style={{ color: ship.primaryColor }} />}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{ship.name}</span>
                    <span className="text-xs text-slate-400">{ship.role}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Ship Telemetry & Specs */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-slate-900/85 border border-slate-800 backdrop-blur-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-white">{currentShip.name}</h3>
                <span
                  className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border"
                  style={{
                    color: currentShip.primaryColor,
                    borderColor: currentShip.primaryColor + '60',
                    backgroundColor: currentShip.primaryColor + '15',
                  }}
                >
                  {currentShip.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {currentShip.description}
              </p>

              {/* Ship Performance Meters */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Mobility
                    </span>
                    <span className="font-mono text-slate-300">{currentShip.stats.speed.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${(currentShip.stats.speed / 10) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Hull & Shield
                    </span>
                    <span className="font-mono text-slate-300">
                      {currentShip.stats.health + currentShip.stats.shield}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${((currentShip.stats.health + currentShip.stats.shield) / 250) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> Firepower
                    </span>
                    <span className="font-mono text-slate-300">{currentShip.stats.damage}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${(currentShip.stats.damage / 40) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Fire Rate
                    </span>
                    <span className="font-mono text-slate-300">{currentShip.stats.fireRate}/s</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(currentShip.stats.fireRate / 12) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Special Ability Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-6">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Tactical Ability: {currentShip.specialName}
                </span>
                <p className="text-xs text-slate-400 leading-normal">
                  {currentShip.specialDescription}
                </p>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={() => onStartGame(selectedShipId, selectedMode)}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-xl shadow-cyan-500/25 cursor-pointer active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Launch Sortie</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/80 gap-2">
        <span>Controls: WASD / Arrows to Move · Mouse to Aim & Fire · Space for Ability · Shift to Dash</span>
        <span>Ready for Sortie</span>
      </footer>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Tactical Flight Manual
            </h2>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-6">
              <p>
                <strong>Movement & Aim:</strong> Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">W, A, S, D</kbd> or arrow keys to propel your ship. Move mouse to aim and click/hold left button to fire. (Touch screens feature dual on-screen joysticks).
              </p>
              <p>
                <strong>Evasive Dash:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">Shift</kbd> to execute a high-speed dash with brief invulnerability.
              </p>
              <p>
                <strong>Tactical Ultimate:</strong> Fill your power meter by vaporizing hostiles. Detonate with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">Space</kbd> for screen-clearing effects.
              </p>
              <p>
                <strong>Aether Shards & Rogue Upgrades:</strong> Destroy enemies and collect glowing energy shards to gain XP. Leveling up unlocks randomized tier upgrades!
              </p>
              <p>
                <strong>Combo Multiplier:</strong> Chaining kills before the timer expires amplifies your score up to 5x.
              </p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
