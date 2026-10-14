/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Achievement, AudioSettings, GameMode, VideoSettings } from '../types/game';

const HIGH_SCORE_KEY = 'aether_surge_high_scores';
const ACHIEVEMENTS_KEY = 'aether_surge_achievements';
const AUDIO_SETTINGS_KEY = 'aether_surge_audio_settings';
const VIDEO_SETTINGS_KEY = 'aether_surge_video_settings';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_kill',
    title: 'First Contact',
    description: 'Vaporize your first alien aggressor',
    icon: 'Crosshair',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'combo_10',
    title: 'Combo Surge',
    description: 'Reach a 10x combo multiplier',
    icon: 'Zap',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'wave_5',
    title: 'Void Survivor',
    description: 'Survive past Wave 5',
    icon: 'Shield',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'boss_slayer',
    title: 'Titan Crusher',
    description: 'Defeat a cosmic Dreadnought boss',
    icon: 'Skull',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'crystal_collector',
    title: 'Aether Harvester',
    description: 'Collect 100 energy crystals',
    icon: 'Gem',
    unlocked: false,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: 'max_level',
    title: 'Overcharged Nexus',
    description: 'Reach player level 10 in a single run',
    icon: 'Sparkles',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
];

export const getHighScores = (): Record<GameMode, number> => {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return { ENDLESS: 0, BOSS_RUSH: 0, OVERDRIVE: 0 };
};

export const saveHighScore = (mode: GameMode, score: number): boolean => {
  try {
    const scores = getHighScores();
    if (score > (scores[mode] || 0)) {
      scores[mode] = score;
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
      return true; // new high score!
    }
  } catch {
    // ignore
  }
  return false;
};

export const getStoredAchievements = (): Achievement[] => {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) {
      const parsed: Achievement[] = JSON.parse(raw);
      // Merge in case new achievements were added
      return INITIAL_ACHIEVEMENTS.map((initial) => {
        const found = parsed.find((p) => p.id === initial.id);
        return found ? { ...initial, ...found } : initial;
      });
    }
  } catch {
    // fallback
  }
  return INITIAL_ACHIEVEMENTS;
};

export const saveAchievements = (achievements: Achievement[]) => {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch {
    // ignore
  }
};

export const getAudioSettings = (): AudioSettings => {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.35,
    muted: false,
  };
};

export const saveAudioSettings = (settings: AudioSettings) => {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

export const getVideoSettings = (): VideoSettings => {
  try {
    const raw = localStorage.getItem(VIDEO_SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    particleQuality: 'HIGH',
    screenShake: true,
    showTouchControls: false,
    autoFire: false,
  };
};

export const saveVideoSettings = (settings: VideoSettings) => {
  try {
    localStorage.setItem(VIDEO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};
