/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Zap, Crosshair, Sparkles } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onFireChange: (isFiring: boolean) => void;
  onDash: () => void;
  onSpecial: () => void;
  isAutoFire: boolean;
  onToggleAutoFire: () => void;
  specialReady: boolean;
  dashReady: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onFireChange,
  onDash,
  onSpecial,
  isAutoFire,
  onToggleAutoFire,
  specialReady,
  dashReady,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    setActiveTouchId(touch.identifier);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        setActiveTouchId(null);
        setKnobPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove({ x: 0, y: 0 });
      return;
    }

    const clampedDist = Math.min(dist, maxRadius);
    const nx = (dx / dist) * clampedDist;
    const ny = (dy / dist) * clampedDist;

    setKnobPos({ x: nx, y: ny });
    onMove({ x: nx / maxRadius, y: ny / maxRadius });
  };

  // Keyboard navigation fallback listener for WASD/Arrows
  useEffect(() => {
    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      updateFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
      updateFromKeys();
    };

    const updateFromKeys = () => {
      let kx = 0;
      let ky = 0;
      if (keys['w'] || keys['arrowup']) ky -= 1;
      if (keys['s'] || keys['arrowdown']) ky += 1;
      if (keys['a'] || keys['arrowleft']) kx -= 1;
      if (keys['d'] || keys['arrowright']) kx += 1;

      if (kx !== 0 && ky !== 0) {
        kx *= 0.7071;
        ky *= 0.7071;
      }

      if (activeTouchId === null) {
        onMove({ x: kx, y: ky });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTouchId, onMove]);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Left Bottom: Floating Movement Joystick */}
      <div className="pointer-events-auto absolute bottom-6 left-6 touch-none">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-900/60 border border-slate-700/60 shadow-xl backdrop-blur-sm"
        >
          {/* Knob */}
          <div
            className="h-12 w-12 rounded-full bg-cyan-500/80 border-2 border-white shadow-lg shadow-cyan-500/50 transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Bottom: Action Buttons */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-end gap-3 touch-none">
        {/* Special Ultimate Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onSpecial();
          }}
          onClick={onSpecial}
          disabled={!specialReady}
          className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-transform active:scale-90 ${
            specialReady
              ? 'bg-amber-500 border-amber-300 text-white animate-pulse shadow-amber-500/40'
              : 'bg-slate-900/70 border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          aria-label="Ultimate Ability"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Dash Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onDash();
            }}
            onClick={onDash}
            disabled={!dashReady}
            className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-transform active:scale-90 ${
              dashReady
                ? 'bg-sky-600 border-sky-300 text-white shadow-sky-600/40'
                : 'bg-slate-900/70 border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            aria-label="Dash"
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Primary Fire / Auto-Fire Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onFireChange(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (!isAutoFire) onFireChange(false);
            }}
            onMouseDown={() => onFireChange(true)}
            onMouseUp={() => {
              if (!isAutoFire) onFireChange(false);
            }}
            onClick={onToggleAutoFire}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-xl transition-transform active:scale-95 ${
              isAutoFire
                ? 'bg-rose-600 border-rose-300 text-white shadow-rose-600/50'
                : 'bg-slate-800/90 border-cyan-400 text-cyan-300 shadow-cyan-900/30'
            }`}
            aria-label="Fire weapon"
          >
            <Crosshair className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
