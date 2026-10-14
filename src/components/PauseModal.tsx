/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Settings as SettingsIcon } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onOpenSettings: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToMenu,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col items-center text-center">
        <h2 className="text-xl font-black uppercase text-white font-mono tracking-wider mb-2">
          TACTICAL HOLD
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Engines idling, systems standby
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume Sortie</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Mission</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={onReturnToMenu}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white font-medium text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Abort to Hangar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
