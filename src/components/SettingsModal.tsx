/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AudioSettings, VideoSettings } from '../types/game';
import { X, Volume2, VolumeX, Sparkles, Smartphone } from 'lucide-react';

interface SettingsModalProps {
  audio: AudioSettings;
  video: VideoSettings;
  onUpdateAudio: (audio: AudioSettings) => void;
  onUpdateVideo: (video: VideoSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  audio,
  video,
  onUpdateAudio,
  onUpdateVideo,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
            CONFIGURATION
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <span>Audio Diagnostics</span>
            <button
              onClick={() => onUpdateAudio({ ...audio, muted: !audio.muted })}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
            >
              {audio.muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{audio.muted ? 'Unmute All' : 'Mute All'}</span>
            </button>
          </div>

          {/* Master Volume */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Master Volume</span>
              <span className="font-mono">{Math.round(audio.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.masterVolume}
              onChange={(e) => onUpdateAudio({ ...audio, masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Weapons & SFX</span>
              <span className="font-mono">{Math.round(audio.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.sfxVolume}
              onChange={(e) => onUpdateAudio({ ...audio, sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Synthesizer Music</span>
              <span className="font-mono">{Math.round(audio.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.musicVolume}
              onChange={(e) => onUpdateAudio({ ...audio, musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Graphics & Gameplay */}
        <div className="space-y-4 mb-6">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Display & Controls
          </div>

          {/* Screen Shake */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Kinetic Screen Shake</span>
            <button
              onClick={() => onUpdateVideo({ ...video, screenShake: !video.screenShake })}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                video.screenShake ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {video.screenShake ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Auto Fire */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Continuous Auto-Fire</span>
            <button
              onClick={() => onUpdateVideo({ ...video, autoFire: !video.autoFire })}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                video.autoFire ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {video.autoFire ? 'Active' : 'Manual'}
            </button>
          </div>

          {/* Touch Controls Toggle */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              On-Screen Virtual Controls
            </span>
            <button
              onClick={() => onUpdateVideo({ ...video, showTouchControls: !video.showTouchControls })}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                video.showTouchControls ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {video.showTouchControls ? 'Force On' : 'Automatic'}
            </button>
          </div>

          {/* Particle Quality */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                VFX Particle Density
              </span>
              <span className="font-mono text-cyan-400">{video.particleQuality}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onUpdateVideo({ ...video, particleQuality: q })}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    video.particleQuality === q
                      ? 'bg-slate-800 border-cyan-400 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Confirm & Close
        </button>
      </div>
    </div>
  );
};
