/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { UpgradeOption } from '../types/game';
import { Split, Gauge, Radio, ShieldCheck, Target, Magnet, Wrench, Shield, Zap, Flame, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  options: UpgradeOption[];
  onSelect: (upgradeId: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Split,
  Gauge,
  Radio,
  ShieldCheck,
  Target,
  Magnet,
  Wrench,
  Shield,
  Zap,
  Flame,
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ options, onSelect }) => {
  // Support keyboard 1, 2, 3 shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) {
        onSelect(options[0].id);
      } else if (e.key === '2' && options[1]) {
        onSelect(options[1].id);
      } else if (e.key === '3' && options[2]) {
        onSelect(options[2].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelect]);

  const getRarityBadge = (rarity: UpgradeOption['rarity']) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'text-amber-400 border-amber-500/50 bg-amber-950/40';
      case 'EPIC':
        return 'text-purple-400 border-purple-500/50 bg-purple-950/40';
      case 'RARE':
        return 'text-sky-400 border-sky-500/50 bg-sky-950/40';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-900/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-2 text-cyan-400">
          <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
          <h2 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white font-mono">
            SYSTEM UPGRADE AVAILABLE
          </h2>
          <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <p className="text-slate-400 text-sm mb-6 text-center">
          Choose a tactical module to augment your vessel's combat capabilities
        </p>

        {/* 3 Upgrade Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {options.map((option, idx) => {
            const IconComponent = ICON_MAP[option.icon] || Sparkles;
            const rarityStyle = getRarityBadge(option.rarity);

            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id)}
                className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 hover:bg-slate-800/90 transition-all duration-200 shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 cursor-pointer"
              >
                {/* Number Key Indicator */}
                <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[11px] font-mono font-bold text-slate-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                  {idx + 1}
                </div>

                {/* Icon Container */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 mb-4 group-hover:scale-110 group-hover:border-cyan-400 transition-transform">
                  <IconComponent className="w-8 h-8 text-cyan-400" />
                </div>

                {/* Rarity */}
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border mb-2 ${rarityStyle}`}>
                  {option.rarity}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {option.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {option.description}
                </p>

                {/* Tier Progress */}
                <div className="mt-auto flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Tier</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {option.currentLevel} → {option.currentLevel + 1}
                  </span>
                  <span className="text-slate-600">/ {option.maxLevel}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-slate-500 font-mono">
          Press [1], [2], or [3] on keyboard or click a module to install
        </p>
      </div>
    </div>
  );
};
