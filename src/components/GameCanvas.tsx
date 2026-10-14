/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../game/engine';
import { CanvasRenderer } from '../game/renderer';
import { VideoSettings } from '../types/game';

interface GameCanvasProps {
  engine: GameEngine;
  videoSettings: VideoSettings;
  moveVector: { x: number; y: number };
  isFiringFromTouch: boolean;
  isPaused: boolean;
  onDash: () => void;
  onSpecial: () => void;
  onPause: () => void;
  onHudTick: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  videoSettings,
  moveVector,
  isFiringFromTouch,
  isPaused,
  onDash,
  onSpecial,
  onPause,
  onHudTick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 140 : 200,
  });
  const isMouseDownRef = useRef<boolean>(false);
  const keysDownRef = useRef<Record<string, boolean>>({});
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameIdRef = useRef<number | null>(null);
  const hudUpdateTimerRef = useRef<number>(0);

  // Stable references for all mutable/dynamic props to prevent RAF loop destruction
  const moveVectorRef = useRef(moveVector);
  moveVectorRef.current = moveVector;

  const isFiringFromTouchRef = useRef(isFiringFromTouch);
  isFiringFromTouchRef.current = isFiringFromTouch;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const videoSettingsRef = useRef(videoSettings);
  videoSettingsRef.current = videoSettings;

  const onDashRef = useRef(onDash);
  onDashRef.current = onDash;

  const onSpecialRef = useRef(onSpecial);
  onSpecialRef.current = onSpecial;

  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;

  const onHudTickRef = useRef(onHudTick);
  onHudTickRef.current = onHudTick;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new CanvasRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(100, window.innerWidth || 800);
      const height = Math.max(100, window.innerHeight || 600);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      engine.resize(width, height);
      renderer.resize(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse movement listener
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDownRef.current = true;
      } else if (e.button === 2) {
        // Right click to dash
        e.preventDefault();
        onDashRef.current();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDownRef.current = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Full Keyboard controls for movement and actions
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      keysDownRef.current[key] = true;
      keysDownRef.current[code] = true;

      // Pause toggle
      if (key === 'p' || key === 'escape') {
        e.preventDefault();
        onPauseRef.current();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onSpecialRef.current();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || key === 'e') {
        e.preventDefault();
        onDashRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();
      delete keysDownRef.current[key];
      delete keysDownRef.current[code];
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Main 60/120 FPS animation loop (rock-solid, zero chance of dying)
    const loop = (currentTime: number) => {
      try {
        const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastTimeRef.current) / 1000));
        lastTimeRef.current = currentTime;

        const paused = isPausedRef.current;

        // Calculate aim vector relative to ship position
        const px = Number.isFinite(engine.player.x) ? engine.player.x : 400;
        const py = Number.isFinite(engine.player.y) ? engine.player.y : 300;
        const aimVector = {
          x: mousePosRef.current.x - px,
          y: mousePosRef.current.y - py,
        };

        const firing = isMouseDownRef.current || isFiringFromTouchRef.current;

        // Desktop keyboard movement calculation (WASD & Arrows)
        let kx = 0;
        let ky = 0;
        const k = keysDownRef.current;
        if (k['w'] || k['arrowup'] || k['keyw']) ky -= 1;
        if (k['s'] || k['arrowdown'] || k['keys']) ky += 1;
        if (k['a'] || k['arrowleft'] || k['keya']) kx -= 1;
        if (k['d'] || k['arrowright'] || k['keyd']) kx += 1;

        if (kx !== 0 && ky !== 0) {
          kx *= 0.7071;
          ky *= 0.7071;
        }

        // If virtual touch joystick is in use, prefer that; otherwise use keyboard WASD
        const move = moveVectorRef.current;
        const effectiveMove =
          move.x !== 0 || move.y !== 0
            ? move
            : { x: kx, y: ky };

        if (!paused) {
          // Update engine simulation
          const { shakeIntensity } = engine.update(dt, effectiveMove, aimVector, firing);
          if (shakeIntensity > 0) {
            renderer.setShake(shakeIntensity);
          }

          // Throttle HUD update notifications (10 FPS - light on React)
          hudUpdateTimerRef.current += dt;
          if (hudUpdateTimerRef.current >= 0.1) {
            hudUpdateTimerRef.current = 0;
            onHudTickRef.current();
          }
        }

        // Render frame
        renderer.render(
          paused ? 0 : dt,
          engine.player,
          engine.enemies,
          engine.projectiles,
          engine.particles,
          engine.shards,
          engine.floatTexts,
          engine.drones,
          engine.aimAngle,
          videoSettingsRef.current,
          paused ? false : firing
        );
      } catch (err) {
        // Fallback: log and continue to avoid black screen
        console.warn('GameCanvas render error:', err);
      } finally {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [engine]); // ONLY depend on engine! Never tear down during gameplay loop!

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full cursor-crosshair touch-none select-none"
    />
  );
};
