/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Achievement,
  Drone,
  Enemy,
  EnemyType,
  FloatText,
  GameMode,
  GameStats,
  Particle,
  PlayerState,
  Projectile,
  ShipId,
  UpgradeOption,
  VideoSettings,
  XpShard,
} from '../types/game';
import { ALL_UPGRADES, SHIPS } from './constants';
import { sound } from '../services/soundEffects';

export class GameEngine {
  public player!: PlayerState;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public shards: XpShard[] = [];
  public floatTexts: FloatText[] = [];
  public drones: Drone[] = [];
  public stats!: GameStats;
  public width: number = 800;
  public height: number = 600;
  public aimAngle: number = 0;
  public isFiring: boolean = false;
  public activeUpgrades: Record<string, number> = {};
  public gameMode: GameMode = 'ENDLESS';

  private waveTimer: number = 0;
  private waveSpawnIndex: number = 0;
  private waveQueue: { type: EnemyType; delay: number }[] = [];
  private bossSpawnedThisWave: boolean = false;
  private idCounter: number = 0;
  private onLevelUpCallback?: (options: UpgradeOption[]) => void;
  private onGameOverCallback?: () => void;
  private onAchievementUnlockedCallback?: (ach: Achievement) => void;
  private achievements: Achievement[] = [];
  private videoSettings: VideoSettings;

  constructor(
    width: number,
    height: number,
    achievements: Achievement[],
    videoSettings: VideoSettings
  ) {
    this.width = width;
    this.height = height;
    this.achievements = achievements;
    this.videoSettings = videoSettings;
    this.reset('valkyrie', 'ENDLESS');
  }

  public setCallbacks(
    onLevelUp: (options: UpgradeOption[]) => void,
    onGameOver: () => void,
    onAchievementUnlocked: (ach: Achievement) => void
  ) {
    this.onLevelUpCallback = onLevelUp;
    this.onGameOverCallback = onGameOver;
    this.onAchievementUnlockedCallback = onAchievementUnlocked;
  }

  public setVideoSettings(settings: VideoSettings) {
    this.videoSettings = settings;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public reset(shipId: ShipId, mode: GameMode = 'ENDLESS') {
    this.gameMode = mode;
    const config = SHIPS[shipId] || SHIPS.valkyrie;

    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      health: config.stats.health,
      maxHealth: config.stats.health,
      shield: config.stats.shield,
      maxShield: config.stats.shield,
      shieldRechargeTimer: 0,
      dashCooldown: 0,
      maxDashCooldown: 1.0,
      isDashing: false,
      dashDuration: 0,
      specialMeter: 0,
      maxSpecialMeter: 100,
      fireCooldown: 0,
      invulnerableTimer: 0,
      shipId: shipId,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      speed: config.stats.speed,
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      spreadCount: 1,
      hasPiercing: false,
      homingCount: 0,
      homingTimer: 0,
      droneCount: 0,
      magnetRadius: 100,
      empCooldown: 0,
      timeFreezeTimer: 0,
    };

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.shards = [];
    this.floatTexts = [];
    this.drones = [];
    this.activeUpgrades = {};

    this.stats = {
      score: 0,
      highScore: 0,
      wave: 1,
      enemiesDefeated: 0,
      crystalsCollected: 0,
      shotsFired: 0,
      shotsHit: 0,
      maxCombo: 1,
      currentCombo: 1,
      comboTimer: 0,
      timeSurvived: 0,
    };

    if (mode === 'OVERDRIVE') {
      this.player.fireRateMultiplier = 1.8;
      this.player.damageMultiplier = 1.25;
    }

    this.startWave(1);
  }

  public update(dt: number, moveVector: { x: number; y: number }, aimVector: { x: number; y: number } | null, fire: boolean): { shakeIntensity: number } {
    let requestedShake = 0;

    // Time elapsed in survival
    this.stats.timeSurvived += dt;

    // Aim calculation
    if (aimVector && (aimVector.x !== 0 || aimVector.y !== 0)) {
      this.aimAngle = Math.atan2(aimVector.y, aimVector.x);
    } else if (moveVector.x !== 0 || moveVector.y !== 0) {
      this.aimAngle = Math.atan2(moveVector.y, moveVector.x);
    }
    this.isFiring = fire || this.videoSettings.autoFire;

    // 1. Time Freeze check
    const effectiveDt = this.player.timeFreezeTimer > 0 ? dt * 0.35 : dt;
    if (this.player.timeFreezeTimer > 0) {
      this.player.timeFreezeTimer = Math.max(0, this.player.timeFreezeTimer - dt);
    }

    // 2. Player Movement & Physics
    this.updatePlayer(dt, moveVector);

    // 3. Player Firing & Weapons
    this.updateWeapons(dt);

    // 4. Update Orbital Drones
    this.updateDrones(dt);

    // 5. Update Projectiles
    this.updateProjectiles(effectiveDt);

    // 6. Update Enemies & Spawning
    this.updateWave(effectiveDt);
    const enemyShake = this.updateEnemies(effectiveDt);
    if (enemyShake > requestedShake) requestedShake = enemyShake;

    // 7. Collisions
    const collisionShake = this.handleCollisions();
    if (collisionShake > requestedShake) requestedShake = collisionShake;

    // 8. Update XP Shards & Magnet
    this.updateShards(dt);

    // 9. Update Combo Decay
    this.updateCombo(dt);

    // 10. Update Particles & Floating Text
    this.updateParticlesAndText(dt);

    // Check achievement progress
    this.checkAchievements();

    return { shakeIntensity: requestedShake };
  }

  private updatePlayer(dt: number, moveVector: { x: number; y: number }) {
    const p = this.player;

    // Dash state
    if (p.isDashing) {
      p.dashDuration -= dt;
      if (p.dashDuration <= 0) {
        p.isDashing = false;
      }
    }
    if (p.dashCooldown > 0) {
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    }

    // Shield Recharge
    if (p.shield < p.maxShield) {
      p.shieldRechargeTimer += dt;
      if (p.shieldRechargeTimer >= 3.0) {
        p.shield = Math.min(p.maxShield, p.shield + 18 * dt);
      }
    }

    // Invulnerability timer
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer = Math.max(0, p.invulnerableTimer - dt);
    }

    // Acceleration & Inertia
    const moveLen = Math.hypot(moveVector.x, moveVector.y);
    const accel = p.isDashing ? p.speed * 45 : p.speed * 20;

    if (moveLen > 0.05) {
      const nx = moveVector.x / moveLen;
      const ny = moveVector.y / moveLen;
      p.vx += nx * accel * dt;
      p.vy += ny * accel * dt;
    }

    // Drag / Friction
    const drag = p.isDashing ? 0.96 : 0.88;
    p.vx *= Math.pow(drag, dt * 60);
    p.vy *= Math.pow(drag, dt * 60);

    // Apply movement
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    // Arena Clamping with soft bounce
    const pad = 24;
    if (p.x < pad) {
      p.x = pad;
      p.vx = -p.vx * 0.4;
    } else if (p.x > this.width - pad) {
      p.x = this.width - pad;
      p.vx = -p.vx * 0.4;
    }
    if (p.y < pad) {
      p.y = pad;
      p.vy = -p.vy * 0.4;
    } else if (p.y > this.height - pad) {
      p.y = this.height - pad;
      p.vy = -p.vy * 0.4;
    }

    // Dash particle emission
    if (p.isDashing && Math.random() < 0.6) {
      this.createParticle(p.x, p.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#38bdf8', 4, 0.4);
    }
  }

  public triggerDash(): boolean {
    const p = this.player;
    if (p.dashCooldown <= 0 && !p.isDashing) {
      p.isDashing = true;
      p.dashDuration = 0.22;
      p.dashCooldown = p.maxDashCooldown;
      p.invulnerableTimer = 0.28;

      // Dash burst velocity in current aim or movement direction
      const angle = this.aimAngle;
      p.vx += Math.cos(angle) * (p.speed * 2.2);
      p.vy += Math.sin(angle) * (p.speed * 2.2);

      sound.playDash();

      // Shockwave ring
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#00f0ff',
        alpha: 0.8,
        decay: 3.5,
        shape: 'shockwave',
        radius: 12,
        maxRadius: 40,
      });

      return true;
    }
    return false;
  }

  public triggerSpecial(): boolean {
    const p = this.player;
    if (p.specialMeter < p.maxSpecialMeter) return false;

    p.specialMeter = 0;

    if (p.shipId === 'valkyrie') {
      // EMP Shockwave
      sound.playEMP();
      // Clear all enemy projectiles
      this.projectiles = this.projectiles.filter((proj) => proj.isPlayer);

      // Stun & damage all enemies on screen
      for (const e of this.enemies) {
        e.health -= 60 * p.damageMultiplier;
        e.vx += (e.x - p.x) * 0.15;
        e.vy += (e.y - p.y) * 0.15;
      }

      this.particles.push({
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        size: 5,
        color: '#38bdf8',
        alpha: 1,
        decay: 1.8,
        shape: 'shockwave',
        radius: 10,
        maxRadius: Math.max(this.width, this.height) * 0.6,
      });
      this.spawnFloatText(p.x, p.y - 20, 'EMP DETONATED!', '#38bdf8');
      return true;
    } else if (p.shipId === 'titan') {
      // Plasma Siege Barrage: 24 projectiles in a circle
      sound.playLaser('heavy');
      const count = 24;
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        this.projectiles.push({
          id: `siege_${++this.idCounter}`,
          x: p.x,
          y: p.y,
          vx: Math.cos(theta) * 12,
          vy: Math.sin(theta) * 12,
          damage: 45 * p.damageMultiplier,
          radius: 6,
          color: '#fbbf24',
          isPlayer: true,
          piercing: 2,
          lifeTime: 2.5,
        });
      }
      this.spawnFloatText(p.x, p.y - 20, 'SIEGE BARRAGE!', '#fbbf24');
      return true;
    } else if (p.shipId === 'chronos') {
      // Time-warp
      sound.playEMP();
      p.timeFreezeTimer = 4.0;
      this.spawnFloatText(p.x, p.y - 20, 'TIME WARP ACTIVATED!', '#c084fc');
      return true;
    }

    return false;
  }

  private updateWeapons(dt: number) {
    const p = this.player;
    const baseFireRate = SHIPS[p.shipId]?.stats.fireRate || 8;
    const currentRate = baseFireRate * p.fireRateMultiplier;
    const fireInterval = 1 / currentRate;

    p.fireCooldown -= dt;

    if (this.isFiring && p.fireCooldown <= 0) {
      p.fireCooldown = fireInterval;
      this.firePrimaryWeapons();
    }

    // Micro-missile pods
    if (p.homingCount > 0) {
      p.homingTimer -= dt;
      if (p.homingTimer <= 0) {
        p.homingTimer = 1.6 / p.homingCount;
        this.fireHomingMissiles();
      }
    }
  }

  private firePrimaryWeapons() {
    const p = this.player;
    const cfg = SHIPS[p.shipId] || SHIPS.valkyrie;
    const baseDamage = cfg.stats.damage * p.damageMultiplier;
    const spread = p.spreadCount;
    const spreadAngleStep = 0.12;

    this.stats.shotsFired += spread;
    sound.playLaser(p.shipId === 'titan' ? 'heavy' : 'light');

    for (let i = 0; i < spread; i++) {
      const angleOffset = (i - (spread - 1) / 2) * spreadAngleStep;
      const finalAngle = this.aimAngle + angleOffset;
      const speed = p.shipId === 'titan' ? 14 : 17;

      // Cannon offset
      const noseDist = 20;
      const spawnX = p.x + Math.cos(this.aimAngle) * noseDist;
      const spawnY = p.y + Math.sin(this.aimAngle) * noseDist;

      this.projectiles.push({
        id: `p_${++this.idCounter}`,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(finalAngle) * speed + p.vx * 0.2,
        vy: Math.sin(finalAngle) * speed + p.vy * 0.2,
        damage: baseDamage,
        radius: p.shipId === 'titan' ? 5.5 : 4,
        color: cfg.primaryColor,
        isPlayer: true,
        piercing: p.hasPiercing ? 2 : 0,
        lifeTime: 1.8,
      });

      // Muzzle flash particle
      this.createParticle(spawnX, spawnY, Math.cos(finalAngle) * 3, Math.sin(finalAngle) * 3, cfg.accentColor, 3, 0.15);
    }
  }

  private fireHomingMissiles() {
    const p = this.player;
    if (this.enemies.length === 0) return;

    // Target closest enemy
    let target = this.enemies[0];
    let minDist = Infinity;
    for (const e of this.enemies) {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        target = e;
      }
    }

    const angle = this.aimAngle + (Math.random() - 0.5) * 0.8;
    this.projectiles.push({
      id: `m_${++this.idCounter}`,
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      damage: 32 * p.damageMultiplier,
      radius: 4,
      color: '#f97316',
      isPlayer: true,
      isHoming: true,
      homingTargetId: target.id,
      lifeTime: 3.5,
    });
  }

  private updateDrones(dt: number) {
    const p = this.player;
    // Keep drones synchronized with droneCount upgrade
    while (this.drones.length < p.droneCount) {
      this.drones.push({
        orbitAngle: (this.drones.length * Math.PI * 2) / Math.max(1, p.droneCount),
        distance: 48,
        fireCooldown: Math.random() * 0.5,
      });
    }

    for (const drone of this.drones) {
      drone.orbitAngle += dt * 2.5;
      drone.fireCooldown -= dt;

      // Drone auto-fires at nearest enemy
      if (drone.fireCooldown <= 0 && this.enemies.length > 0) {
        drone.fireCooldown = 0.8;
        const dx = p.x + Math.cos(drone.orbitAngle) * drone.distance;
        const dy = p.y + Math.sin(drone.orbitAngle) * drone.distance;

        let nearest = this.enemies[0];
        let minDist = Infinity;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - dx, e.y - dy);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        }

        if (minDist < 350) {
          const aim = Math.atan2(nearest.y - dy, nearest.x - dx);
          this.projectiles.push({
            id: `drone_${++this.idCounter}`,
            x: dx,
            y: dy,
            vx: Math.cos(aim) * 12,
            vy: Math.sin(aim) * 12,
            damage: 16 * p.damageMultiplier,
            radius: 3,
            color: '#06b6d4',
            isPlayer: true,
            lifeTime: 1.5,
          });
          sound.playLaser('light');
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing logic
      if (p.isHoming && p.homingTargetId) {
        const target = this.enemies.find((e) => e.id === p.homingTargetId);
        if (target) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const desiredAngle = Math.atan2(dy, dx);
          const currentAngle = Math.atan2(p.vy, p.vx);
          let diff = desiredAngle - currentAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          const turnSpeed = 6.0 * dt;
          const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnSpeed);
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(newAngle) * speed;
          p.vy = Math.sin(newAngle) * speed;
        }
      }

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.lifeTime -= dt;

      // Rocket missile exhaust trail
      if (p.isHoming && Math.random() < 0.4) {
        this.createParticle(p.x, p.y, -p.vx * 0.1, -p.vy * 0.1, '#fed7aa', 2.5, 0.3);
      }

      // Despawn if lifetime ended or off-screen
      if (p.lifeTime <= 0 || p.x < -100 || p.x > this.width + 100 || p.y < -100 || p.y > this.height + 100) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private startWave(waveNumber: number) {
    this.stats.wave = waveNumber;
    this.waveSpawnIndex = 0;
    this.waveTimer = 0;
    this.bossSpawnedThisWave = false;
    this.waveQueue = [];

    const isBossWave = this.gameMode === 'BOSS_RUSH' || waveNumber % 5 === 0;

    if (isBossWave) {
      // Spawn Boss + escort fleet
      this.waveQueue.push({ type: 'BOSS', delay: 1.0 });
      for (let i = 0; i < 4 + waveNumber; i++) {
        this.waveQueue.push({ type: 'SWARMER', delay: 2.0 + i * 0.5 });
      }
      this.spawnFloatText(this.width / 2, this.height * 0.35, 'WARNING: TITAN CLASS THREAT DETECTED!', '#ef4444');
    } else {
      // Normal / progressive wave
      const count = 8 + waveNumber * 4;
      for (let i = 0; i < count; i++) {
        let type: EnemyType = 'SCOUT';
        const rand = Math.random();

        if (rand < 0.3) {
          type = 'ASTEROID';
        } else if (rand < 0.6) {
          type = 'SWARMER';
        } else if (waveNumber >= 3 && rand < 0.8) {
          type = 'CRUISER';
        } else if (waveNumber >= 4 && rand < 0.95) {
          type = 'SNIPER';
        }

        this.waveQueue.push({
          type,
          delay: i * Math.max(0.25, 1.2 - waveNumber * 0.08),
        });
      }
    }
  }

  private updateWave(dt: number) {
    this.waveTimer += dt;

    // Spawn queued enemies based on delay
    while (
      this.waveSpawnIndex < this.waveQueue.length &&
      this.waveQueue[this.waveSpawnIndex].delay <= this.waveTimer
    ) {
      this.spawnEnemy(this.waveQueue[this.waveSpawnIndex].type);
      this.waveSpawnIndex++;
    }

    // Check if wave complete
    if (this.waveSpawnIndex >= this.waveQueue.length && this.enemies.length === 0) {
      this.startWave(this.stats.wave + 1);
    }
  }

  private spawnEnemy(type: EnemyType, spawnPos?: { x: number; y: number }, asteroidTier: number = 3) {
    let x = 0;
    let y = 0;

    if (spawnPos) {
      x = spawnPos.x;
      y = spawnPos.y;
    } else {
      // Spawn on edges outside screen
      const side = Math.floor(Math.random() * 4);
      const pad = 40;
      if (side === 0) {
        x = Math.random() * this.width;
        y = -pad;
      } else if (side === 1) {
        x = this.width + pad;
        y = Math.random() * this.height;
      } else if (side === 2) {
        x = Math.random() * this.width;
        y = this.height + pad;
      } else {
        x = -pad;
        y = Math.random() * this.height;
      }
    }

    const waveFactor = 1 + (this.stats.wave - 1) * 0.15;
    const enemy: Enemy = {
      id: `e_${++this.idCounter}`,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: 14,
      health: 20 * waveFactor,
      maxHealth: 20 * waveFactor,
      scoreValue: 100,
      xpValue: 12,
      color: '#f97316',
      fireCooldown: 1.5,
    };

    if (type === 'ASTEROID') {
      const radius = asteroidTier === 3 ? 32 : asteroidTier === 2 ? 20 : 12;
      enemy.radius = radius;
      enemy.health = (asteroidTier === 3 ? 50 : asteroidTier === 2 ? 25 : 12) * waveFactor;
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = 80 * asteroidTier;
      enemy.xpValue = 8 * asteroidTier;

      // Random drift angle
      const driftAngle = Math.random() * Math.PI * 2;
      const driftSpeed = (Math.random() * 1.5 + 0.8) / (asteroidTier * 0.6);
      enemy.vx = Math.cos(driftAngle) * driftSpeed;
      enemy.vy = Math.sin(driftAngle) * driftSpeed;

      // Procedural polygon vertices
      const verts: { x: number; y: number }[] = [];
      const numVerts = 8;
      for (let i = 0; i < numVerts; i++) {
        const theta = (i / numVerts) * Math.PI * 2;
        const r = radius * (0.8 + Math.random() * 0.4);
        verts.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
      }

      enemy.customData = {
        asteroidVertices: verts,
        asteroidTier,
      };
    } else if (type === 'SWARMER') {
      enemy.radius = 11;
      enemy.health = 18 * waveFactor;
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = 120;
      enemy.xpValue = 10;
    } else if (type === 'CRUISER') {
      enemy.radius = 24;
      enemy.health = 80 * waveFactor;
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = 350;
      enemy.xpValue = 35;
      enemy.fireCooldown = 2.0;
    } else if (type === 'SNIPER') {
      enemy.radius = 16;
      enemy.health = 35 * waveFactor;
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = 250;
      enemy.xpValue = 25;
      enemy.fireCooldown = 3.2;
    } else if (type === 'BOSS') {
      enemy.radius = 55;
      enemy.health = 450 * waveFactor;
      enemy.maxHealth = enemy.health;
      enemy.scoreValue = 2500;
      enemy.xpValue = 150;
      enemy.fireCooldown = 1.0;
      enemy.customData = {
        bossPhase: 1,
        bossAttackTimer: 0,
      };
      this.bossSpawnedThisWave = true;
    }

    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number): number {
    const p = this.player;
    let maxShake = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (e.type === 'ASTEROID') {
        // Asteroid drifting & gentle rotation
        e.angle += 0.015;
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;

        // Wrap around arena borders
        if (e.x < -50) e.x = this.width + 50;
        if (e.x > this.width + 50) e.x = -50;
        if (e.y < -50) e.y = this.height + 50;
        if (e.y > this.height + 50) e.y = -50;
      } else if (e.type === 'SWARMER') {
        // Fast direct pursuit
        e.angle = Math.atan2(dy, dx);
        const speed = 4.8;
        e.vx = Math.cos(e.angle) * speed;
        e.vy = Math.sin(e.angle) * speed;
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;
      } else if (e.type === 'SCOUT') {
        // Flanking pursuit
        e.angle = Math.atan2(dy, dx);
        const speed = 3.4;
        e.vx = Math.cos(e.angle) * speed;
        e.vy = Math.sin(e.angle) * speed;
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;

        // Occasional light blaster shot
        if (e.fireCooldown !== undefined) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0 && dist < 400) {
            e.fireCooldown = 2.4 + Math.random() * 0.8;
            this.projectiles.push({
              id: `ep_${++this.idCounter}`,
              x: e.x,
              y: e.y,
              vx: Math.cos(e.angle) * 7,
              vy: Math.sin(e.angle) * 7,
              damage: 12,
              radius: 4,
              color: '#ef4444',
              isPlayer: false,
              lifeTime: 2.5,
            });
            sound.playLaser('enemy');
          }
        }
      } else if (e.type === 'CRUISER') {
        // Stays at mid range (200-300px) and fires spread burst
        e.angle = Math.atan2(dy, dx);
        const desiredDist = 260;
        let speed = 0;
        if (dist > desiredDist + 30) speed = 2.0;
        else if (dist < desiredDist - 30) speed = -1.5;

        e.vx = Math.cos(e.angle) * speed;
        e.vy = Math.sin(e.angle) * speed;
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;

        if (e.fireCooldown !== undefined) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0) {
            e.fireCooldown = 2.5;
            // 3-way spread
            for (let s = -1; s <= 1; s++) {
              const shotAngle = e.angle + s * 0.25;
              this.projectiles.push({
                id: `ep_${++this.idCounter}`,
                x: e.x,
                y: e.y,
                vx: Math.cos(shotAngle) * 6,
                vy: Math.sin(shotAngle) * 6,
                damage: 15,
                radius: 4.5,
                color: '#c084fc',
                isPlayer: false,
                lifeTime: 2.8,
              });
            }
            sound.playLaser('heavy');
          }
        }
      } else if (e.type === 'SNIPER') {
        // Keeps long distance, charges sniper shot
        e.angle = Math.atan2(dy, dx);
        const desiredDist = 380;
        let speed = 0;
        if (dist > desiredDist + 40) speed = 1.8;
        else if (dist < desiredDist - 40) speed = -1.8;

        e.vx = Math.cos(e.angle) * speed;
        e.vy = Math.sin(e.angle) * speed;
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;

        if (e.fireCooldown !== undefined) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0) {
            e.fireCooldown = 3.0;
            this.projectiles.push({
              id: `ep_${++this.idCounter}`,
              x: e.x,
              y: e.y,
              vx: Math.cos(e.angle) * 14,
              vy: Math.sin(e.angle) * 14,
              damage: 24,
              radius: 3.5,
              color: '#34d399',
              isPlayer: false,
              lifeTime: 2.2,
            });
            sound.playLaser('sniper');
          }
        }
      } else if (e.type === 'BOSS') {
        // Boss AI logic
        e.angle += 0.01;
        const targetX = this.width / 2;
        const targetY = this.height * 0.3;
        e.x += (targetX - e.x) * 0.015;
        e.y += (targetY - e.y) * 0.015;

        if (e.fireCooldown !== undefined) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0) {
            e.fireCooldown = 1.2;
            // Radial bullet spray
            const bullets = 10;
            const offset = (this.stats.timeSurvived * 3) % (Math.PI * 2);
            for (let b = 0; b < bullets; b++) {
              const theta = (b / bullets) * Math.PI * 2 + offset;
              this.projectiles.push({
                id: `boss_p_${++this.idCounter}`,
                x: e.x,
                y: e.y,
                vx: Math.cos(theta) * 5,
                vy: Math.sin(theta) * 5,
                damage: 18,
                radius: 5,
                color: '#f43f5e',
                isPlayer: false,
                lifeTime: 3.5,
              });
            }
            sound.playLaser('heavy');
          }
        }
      }
    }

    return maxShake;
  }

  private handleCollisions(): number {
    const p = this.player;
    let shake = 0;

    // 1. Player Projectiles vs Enemies
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (!proj.isPlayer) continue;

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        const dx = e.x - proj.x;
        const dy = e.y - proj.y;
        const maxR = e.radius + proj.radius;

        // Fast bounding box reject
        if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) continue;

        if (dx * dx + dy * dy < maxR * maxR) {
          // HIT!
          this.stats.shotsHit++;
          e.health -= proj.damage;

          // Piercing logic
          if (proj.piercing && proj.piercing > 0) {
            proj.piercing--;
          } else {
            this.projectiles.splice(pi, 1);
          }

          // Impact sparks & floating damage text
          this.createParticle(proj.x, proj.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, proj.color, 3, 0.2);
          this.spawnFloatText(e.x, e.y - 12, `${Math.round(proj.damage)}`, '#ffffff');

          // Check if enemy died
          if (e.health <= 0) {
            this.destroyEnemy(ei);
            shake = Math.max(shake, e.type === 'BOSS' ? 0.8 : 0.25);
          }
          break;
        }
      }
    }

    // 2. Enemy Projectiles vs Player
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (proj.isPlayer) continue;

      const dx = p.x - proj.x;
      const dy = p.y - proj.y;
      const maxR = 18 + proj.radius;

      if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) continue;

      if (dx * dx + dy * dy < maxR * maxR && p.invulnerableTimer <= 0) {
        this.projectiles.splice(pi, 1);
        this.damagePlayer(proj.damage);
        shake = Math.max(shake, 0.4);
      }
    }

    // 3. Enemy Direct Body Rams vs Player
    for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
      const e = this.enemies[ei];
      const dist = Math.hypot(p.x - e.x, p.y - e.y);

      if (dist < 18 + e.radius && p.invulnerableTimer <= 0) {
        // Direct ram damage
        const ramDamage = e.type === 'BOSS' ? 50 : 25;
        this.damagePlayer(ramDamage);
        shake = Math.max(shake, 0.5);

        // Push enemy back
        const angle = Math.atan2(e.y - p.y, e.x - p.x);
        e.vx += Math.cos(angle) * 8;
        e.vy += Math.sin(angle) * 8;
      }
    }

    return shake;
  }

  private destroyEnemy(enemyIndex: number) {
    const e = this.enemies[enemyIndex];
    this.enemies.splice(enemyIndex, 1);
    this.stats.enemiesDefeated++;

    // Combo progression
    this.stats.currentCombo++;
    this.stats.comboTimer = 3.2; // 3.2 seconds window to continue combo
    if (this.stats.currentCombo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.currentCombo;
    }

    // Score with combo multiplier
    const comboMultiplier = Math.min(5.0, 1 + (this.stats.currentCombo - 1) * 0.1);
    const scoreEarned = Math.round(e.scoreValue * comboMultiplier);
    this.stats.score += scoreEarned;

    // Special meter gain
    this.player.specialMeter = Math.min(
      this.player.maxSpecialMeter,
      this.player.specialMeter + (e.type === 'BOSS' ? 40 : 6)
    );

    // Sound effect
    sound.playExplosion(e.type === 'BOSS' ? 'boss' : e.type === 'CRUISER' ? 'large' : 'small');

    // Explosion particles
    const particleCount = this.videoSettings.particleQuality === 'LOW' ? 8 : this.videoSettings.particleQuality === 'MEDIUM' ? 16 : 28;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.createParticle(
        e.x,
        e.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        e.color,
        Math.random() * 4 + 2,
        Math.random() * 0.4 + 0.3
      );
    }

    // Asteroid splitting logic
    if (e.type === 'ASTEROID' && e.customData?.asteroidTier && e.customData.asteroidTier > 1) {
      const nextTier = e.customData.asteroidTier - 1;
      this.spawnEnemy('ASTEROID', { x: e.x + 8, y: e.y + 8 }, nextTier);
      this.spawnEnemy('ASTEROID', { x: e.x - 8, y: e.y - 8 }, nextTier);
    }

    // Spawn XP Shards
    const shardCount = e.type === 'BOSS' ? 12 : e.type === 'CRUISER' ? 4 : 2;
    for (let s = 0; s < shardCount; s++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 14;
      this.shards.push({
        id: `s_${++this.idCounter}`,
        x: e.x + Math.cos(angle) * dist,
        y: e.y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        value: Math.round(e.xpValue / shardCount),
        color: e.type === 'BOSS' ? '#f59e0b' : '#38bdf8',
        radius: e.type === 'BOSS' ? 6 : 4,
      });
    }
  }

  private damagePlayer(amount: number) {
    const p = this.player;
    sound.playPlayerHit();
    p.shieldRechargeTimer = 0;
    p.invulnerableTimer = 0.4;

    if (p.shield > 0) {
      if (p.shield >= amount) {
        p.shield -= amount;
        amount = 0;
      } else {
        amount -= p.shield;
        p.shield = 0;
      }
    }

    if (amount > 0) {
      p.health -= amount;
      this.spawnFloatText(p.x, p.y - 20, `-${Math.round(amount)}`, '#ef4444');
    }

    // Reactive Electro-Pulse upgrade check
    if (this.activeUpgrades['emp_discharge'] && this.activeUpgrades['emp_discharge'] > 0) {
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 160) {
          e.health -= 25 * this.activeUpgrades['emp_discharge'];
          e.vx += (e.x - p.x) * 0.2;
          e.vy += (e.y - p.y) * 0.2;
        }
      }
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        size: 3,
        color: '#a855f7',
        alpha: 0.9,
        decay: 2.5,
        shape: 'shockwave',
        radius: 10,
        maxRadius: 160,
      });
    }

    // Game Over check
    if (p.health <= 0) {
      p.health = 0;
      sound.playGameOver();
      if (this.onGameOverCallback) {
        this.onGameOverCallback();
      }
    }
  }

  private updateShards(dt: number) {
    const p = this.player;

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.hypot(dx, dy);

      // Magnet pull
      if (dist < p.magnetRadius) {
        const pullSpeed = 12 + (1 - dist / p.magnetRadius) * 20;
        s.vx += (dx / dist) * pullSpeed * dt * 60;
        s.vy += (dy / dist) * pullSpeed * dt * 60;
      }

      s.vx *= 0.92;
      s.vy *= 0.92;
      s.x += s.vx * dt * 60;
      s.y += s.vy * dt * 60;

      // Pickup collision
      if (dist < 22) {
        this.shards.splice(i, 1);
        this.stats.crystalsCollected++;
        sound.playCrystalPickup(this.stats.currentCombo);
        this.addXp(s.value);
      }
    }
  }

  private addXp(amount: number) {
    const p = this.player;
    p.xp += amount;

    if (p.xp >= p.xpToNextLevel) {
      p.xp -= p.xpToNextLevel;
      p.level++;
      p.xpToNextLevel = Math.round(p.xpToNextLevel * 1.35 + 25);
      sound.playLevelUp();

      // Trigger Upgrade Selection
      if (this.onLevelUpCallback) {
        const options = this.getRandomUpgradeOptions();
        this.onLevelUpCallback(options);
      }
    }
  }

  public getRandomUpgradeOptions(): UpgradeOption[] {
    const available = ALL_UPGRADES.filter((u) => {
      const current = this.activeUpgrades[u.id] || 0;
      return current < u.maxLevel;
    });

    // Shuffle and pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    return selected.map((u) => ({
      ...u,
      currentLevel: this.activeUpgrades[u.id] || 0,
    }));
  }

  public applyUpgrade(upgradeId: string) {
    const current = this.activeUpgrades[upgradeId] || 0;
    this.activeUpgrades[upgradeId] = current + 1;
    const p = this.player;

    switch (upgradeId) {
      case 'spread_fire':
        p.spreadCount++;
        break;
      case 'fire_rate':
        p.fireRateMultiplier += 0.22;
        break;
      case 'homing_swarm':
        p.homingCount++;
        break;
      case 'orbital_drone':
        p.droneCount++;
        break;
      case 'piercing_rounds':
        p.hasPiercing = true;
        break;
      case 'grav_magnet':
        p.magnetRadius += 60;
        break;
      case 'nanite_repair':
        p.maxHealth += 25;
        p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.35);
        break;
      case 'shield_booster':
        p.maxShield += 30;
        p.shield = p.maxShield;
        break;
      case 'emp_discharge':
        // handled in damagePlayer
        break;
      case 'damage_overdrive':
        p.damageMultiplier += 0.3;
        break;
    }
  }

  private updateCombo(dt: number) {
    if (this.stats.comboTimer > 0) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        // Combo reset
        this.stats.currentCombo = 1;
      }
    }
  }

  private updateParticlesAndText(dt: number) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.alpha -= p.decay * dt;

      if (p.shape === 'shockwave' && p.radius && p.maxRadius) {
        p.radius += (p.maxRadius - p.radius) * 12 * dt;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y += ft.vy * dt * 60;
      ft.alpha -= 1.2 * dt;
      if (ft.alpha <= 0) {
        this.floatTexts.splice(i, 1);
      }
    }
  }

  private createParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    duration: number = 0.3,
    shape: 'circle' | 'spark' | 'ring' | 'shockwave' = 'circle'
  ) {
    if (this.particles.length > 70) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      alpha: 1,
      decay: 1 / duration,
      shape,
    });
  }

  private spawnFloatText(x: number, y: number, text: string, color: string = '#ffffff') {
    if (this.floatTexts.length > 12) {
      this.floatTexts.shift();
    }
    this.floatTexts.push({
      id: `ft_${++this.idCounter}`,
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.2,
    });
  }

  private checkAchievements() {
    for (const ach of this.achievements) {
      if (ach.unlocked) continue;

      let shouldUnlock = false;

      if (ach.id === 'first_kill' && this.stats.enemiesDefeated >= 1) {
        shouldUnlock = true;
      } else if (ach.id === 'combo_10' && this.stats.currentCombo >= 10) {
        shouldUnlock = true;
      } else if (ach.id === 'wave_5' && this.stats.wave >= 5) {
        shouldUnlock = true;
      } else if (ach.id === 'boss_slayer' && this.bossSpawnedThisWave && this.enemies.filter((e) => e.type === 'BOSS').length === 0 && this.stats.wave > 5) {
        shouldUnlock = true;
      } else if (ach.id === 'crystal_collector' && this.stats.crystalsCollected >= 100) {
        shouldUnlock = true;
      } else if (ach.id === 'max_level' && this.player.level >= 10) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        ach.unlocked = true;
        if (this.onAchievementUnlockedCallback) {
          this.onAchievementUnlockedCallback(ach);
        }
      }
    }
  }
}
