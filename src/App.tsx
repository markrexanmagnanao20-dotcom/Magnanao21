/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Achievement,
  AudioSettings,
  GameMode,
  GameState,
  ShipId,
  UpgradeOption,
  VideoSettings,
} from './types/game';
import { GameEngine } from './game/engine';
import { sound } from './services/soundEffects';
import {
  getAudioSettings,
  getStoredAchievements,
  getHighScores,
  getVideoSettings,
  saveAudioSettings,
  saveAchievements,
  saveHighScore,
  saveVideoSettings,
} from './services/storage';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { VirtualJoystick } from './components/VirtualJoystick';
import { UpgradeModal } from './components/UpgradeModal';
import { StartMenu } from './components/StartMenu';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { Trophy } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(getAudioSettings);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(getVideoSettings);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>(getHighScores);
  const [achievements, setAchievements] = useState<Achievement[]>(getStoredAchievements);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [, setHudTick] = useState<number>(0);
  const handleHudTick = useCallback(() => {
    setHudTick((t) => (t + 1) % 10000);
  }, []);

  // Input states
  const [moveVector, setMoveVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFiringFromTouch, setIsFiringFromTouch] = useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Detect touch device on mount
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  // Sync sound settings with Web Audio engine
  useEffect(() => {
    sound.setVolumes(
      audioSettings.masterVolume,
      audioSettings.sfxVolume,
      audioSettings.musicVolume,
      audioSettings.muted
    );
  }, [audioSettings]);

  // Game Engine instance
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine(
      window.innerWidth || 800,
      window.innerHeight || 600,
      achievements,
      videoSettings
    );
  }
  const engine = engineRef.current;

  // Level Up callback
  const handleLevelUp = useCallback((options: UpgradeOption[]) => {
    setUpgradeOptions(options);
    setGameState('UPGRADE_SELECTION');
  }, []);

  // Game Over callback
  const handleGameOver = useCallback(() => {
    if (!engine) return;
    const isNew = saveHighScore(engine.gameMode, engine.stats.score);
    setIsNewHighScore(isNew);
    setHighScores(getHighScores());
    setGameState('GAME_OVER');
  }, [engine]);

  // Achievement unlock toast
  const handleAchievementUnlocked = useCallback((ach: Achievement) => {
    setAchievements((prev) => {
      const updated = prev.map((a) => (a.id === ach.id ? { ...a, unlocked: true } : a));
      saveAchievements(updated);
      return updated;
    });

    setAchievementToast(ach);
    setTimeout(() => {
      setAchievementToast(null);
    }, 4000);
  }, []);

  // Register engine callbacks
  useEffect(() => {
    engine.setCallbacks(handleLevelUp, handleGameOver, handleAchievementUnlocked);
    engine.setVideoSettings(videoSettings);
  }, [engine, handleLevelUp, handleGameOver, handleAchievementUnlocked, videoSettings]);

  // Start a new game
  const handleStartGame = (shipId: ShipId, mode: GameMode) => {
    engine.reset(shipId, mode);
    setGameState('PLAYING');
    try {
      sound.startMusic();
    } catch {
      // ignore
    }
  };

  // Select an upgrade
  const handleSelectUpgrade = (upgradeId: string) => {
    engine.applyUpgrade(upgradeId);
    setGameState('PLAYING');
  };

  // Dash and Special actions
  const handleDash = useCallback(() => {
    engine.triggerDash();
  }, [engine]);

  const handleSpecial = useCallback(() => {
    engine.triggerSpecial();
  }, [engine]);

  // Pause / Resume
  const handlePause = () => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
      try {
        sound.stopMusic();
      } catch {
        // ignore
      }
    }
  };

  const handleResume = () => {
    if (gameState === 'PAUSED') {
      setGameState('PLAYING');
      try {
        sound.startMusic();
      } catch {
        // ignore
      }
    }
  };

  const handleRestart = () => {
    engine.reset(engine.player.shipId, engine.gameMode);
    setGameState('PLAYING');
    try {
      sound.startMusic();
    } catch {
      // ignore
    }
  };

  const handleReturnToMenu = () => {
    setGameState('MENU');
    try {
      sound.stopMusic();
    } catch {
      // ignore
    }
  };

  const handleToggleMute = () => {
    const updated = { ...audioSettings, muted: !audioSettings.muted };
    setAudioSettings(updated);
    saveAudioSettings(updated);
  };

  const handleUpdateAudio = (updated: AudioSettings) => {
    setAudioSettings(updated);
    saveAudioSettings(updated);
  };

  const handleUpdateVideo = (updated: VideoSettings) => {
    setVideoSettings(updated);
    saveVideoSettings(updated);
    engine.setVideoSettings(updated);
  };

  const showTouchControls = videoSettings.showTouchControls || isTouchDevice;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans antialiased select-none">
      {/* 1. Main Menu */}
      {gameState === 'MENU' && (
        <StartMenu
          onStartGame={handleStartGame}
          highScores={highScores}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 2. Gameplay Surface */}
      {gameState !== 'MENU' && (
        <div className="relative h-full w-full">
          <GameCanvas
            engine={engine}
            videoSettings={videoSettings}
            moveVector={moveVector}
            isFiringFromTouch={isFiringFromTouch}
            isPaused={gameState !== 'PLAYING'}
            onDash={handleDash}
            onSpecial={handleSpecial}
            onPause={handlePause}
            onHudTick={handleHudTick}
          />

          {/* Interactive HUD */}
          <HUD
            player={engine.player}
            stats={engine.stats}
            isMuted={audioSettings.muted}
            videoSettings={videoSettings}
            activeUpgrades={engine.activeUpgrades}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onTriggerDash={handleDash}
            onTriggerSpecial={handleSpecial}
          />

          {/* Virtual Joystick for Mobile or Forced Touch Controls */}
          {showTouchControls && gameState === 'PLAYING' && (
            <VirtualJoystick
              onMove={setMoveVector}
              onFireChange={setIsFiringFromTouch}
              onDash={handleDash}
              onSpecial={handleSpecial}
              isAutoFire={videoSettings.autoFire}
              onToggleAutoFire={() =>
                handleUpdateVideo({ ...videoSettings, autoFire: !videoSettings.autoFire })
              }
              specialReady={engine.player.specialMeter >= engine.player.maxSpecialMeter}
              dashReady={engine.player.dashCooldown <= 0}
            />
          )}
        </div>
      )}

      {/* 3. Level-Up Upgrade Selection Overlay */}
      {gameState === 'UPGRADE_SELECTION' && (
        <UpgradeModal options={upgradeOptions} onSelect={handleSelectUpgrade} />
      )}

      {/* 4. Pause Menu */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 5. Game Over Debriefing Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          stats={engine.stats}
          isNewHighScore={isNewHighScore}
          onRestart={handleRestart}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {/* 6. Settings Modal */}
      {showSettings && (
        <SettingsModal
          audio={audioSettings}
          video={videoSettings}
          onUpdateAudio={handleUpdateAudio}
          onUpdateVideo={handleUpdateVideo}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 7. Achievements Modal */}
      {showAchievements && (
        <AchievementsModal
          achievements={achievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* 8. Achievement Unlocked Floating Toast Banner */}
      {achievementToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/60 shadow-2xl shadow-amber-500/20 backdrop-blur-md animate-in slide-in-from-top-6 duration-300">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-950/60 border border-amber-500/80 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              HONOR UNLOCKED
            </span>
            <span className="text-xs font-bold text-white">{achievementToast.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}
