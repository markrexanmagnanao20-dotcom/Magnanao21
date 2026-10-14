/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Drone, Enemy, FloatText, Particle, PlayerState, Projectile, XpShard } from '../types/game';
import { SHIPS } from './constants';

export interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

export function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w <= 0 || h <= 0) return;
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private stars: Star[] = [];
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  private globalTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initStars(70);
  }

  public resize(width: number, height: number) {
    this.width = Math.max(100, width);
    this.height = Math.max(100, height);
    this.initStars(70);
  }

  public setShake(intensity: number, duration: number = 0.25) {
    this.shakeIntensity = Math.min(2, Math.max(0, intensity));
    this.shakeTimer = duration;
  }

  private initStars(count: number) {
    this.stars = [];
    const w = this.width || 800;
    const h = this.height || 600;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 1.5 + 0.6,
        speed: Math.random() * 0.4 + 0.1,
        alpha: Math.random() * 0.6 + 0.3,
      });
    }
  }

  public render(
    dt: number,
    player: PlayerState,
    enemies: Enemy[],
    projectiles: Projectile[],
    particles: Particle[],
    shards: XpShard[],
    floatTexts: FloatText[],
    drones: Drone[],
    aimAngle: number,
    settings: { screenShake: boolean },
    isFiring: boolean = false
  ) {
    this.globalTime += Math.max(0, dt || 0);
    const ctx = this.ctx;
    const safeAngle = Number.isFinite(aimAngle) ? aimAngle : 0;

    // Apply screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (settings.screenShake && this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const factor = this.shakeTimer * this.shakeIntensity;
      shakeX = (Math.random() - 0.5) * factor * 14;
      shakeY = (Math.random() - 0.5) * factor * 14;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Clear & Deep Space Backdrop
    this.renderBackdrop(player);

    // 2. Render XP Shards
    this.renderShards(shards);

    // 3. Render Projectiles
    this.renderProjectiles(projectiles);

    // 4. Render Enemies
    this.renderEnemies(enemies);

    // 5. Render Drones
    this.renderDrones(player, drones);

    // 6. Render Player Space Ship
    this.renderPlayer(player, safeAngle, isFiring);

    // 7. Render Particles & Shockwaves
    this.renderParticles(particles);

    // 8. Render Floating Combat Text
    this.renderFloatTexts(floatTexts);

    ctx.restore();
  }

  private renderBackdrop(player: PlayerState) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Solid deep space background (allocation-free & fastest)
    ctx.fillStyle = '#020308';
    ctx.fillRect(-20, -20, w + 40, h + 40);

    // Subtle cosmic glow zone (center nebula)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Render twinkling starfield
    const pvx = Number.isFinite(player.vx) ? player.vx : 0;
    const pvy = Number.isFinite(player.vy) ? player.vy : 0;

    ctx.fillStyle = '#e2e8f0';
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      // Parallax reaction to player velocity
      star.y += star.speed - pvy * 0.04 * star.speed;
      star.x -= pvx * 0.04 * star.speed;

      if (star.y > h) star.y = 0;
      else if (star.y < 0) star.y = h;
      if (star.x > w) star.x = 0;
      else if (star.x < 0) star.x = w;

      const size = star.radius;
      ctx.globalAlpha = star.alpha;
      ctx.fillRect(star.x, star.y, size, size);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderPlayer(player: PlayerState, aimAngle: number, isFiring: boolean) {
    const ctx = this.ctx;
    const px = Number.isFinite(player.x) ? player.x : this.width / 2;
    const py = Number.isFinite(player.y) ? player.y : this.height / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(aimAngle);

    // Banking simulation when strafing
    const pvx = Number.isFinite(player.vx) ? player.vx : 0;
    const pvy = Number.isFinite(player.vy) ? player.vy : 0;
    const forwardX = Math.cos(aimAngle);
    const forwardY = Math.sin(aimAngle);
    const lateralSpeed = -pvx * forwardY + pvy * forwardX;
    const bankFactor = Math.max(0.75, 1 - Math.min(0.25, Math.abs(lateralSpeed) * 0.035));
    ctx.scale(1, bankFactor);

    // Speed & afterburner calculation
    const speed = Math.hypot(pvx, pvy);
    const flameLength = 16 + Math.min(32, speed * 2.8) + (player.isDashing ? 38 : 0);
    const flicker = Math.sin(this.globalTime * 35) * 3;

    // Damage flash when invulnerable
    if (player.invulnerableTimer > 0 && Math.floor(this.globalTime * 20) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    // Render Specific Starship Model
    if (player.shipId === 'titan') {
      this.renderTitanSpaceship(ctx, player, isFiring, flameLength, flicker);
    } else if (player.shipId === 'chronos') {
      this.renderChronosSpaceship(ctx, player, isFiring, flameLength, flicker);
    } else {
      this.renderValkyrieSpaceship(ctx, player, isFiring, flameLength, flicker);
    }

    // Shield Deflector Bubble
    if (player.shield > 0) {
      this.renderShieldDeflector(ctx, player);
    }

    ctx.restore();
  }

  // --- 1. VALKYRIE INTERCEPTOR STARFIGHTER ---
  private renderValkyrieSpaceship(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isFiring: boolean,
    flameLength: number,
    flicker: number
  ) {
    // Dual Afterburner Plumes (Port & Starboard)
    this.renderPlume(ctx, -24, -9, 5, flameLength, '#00f0ff', '#ffffff', flicker);
    this.renderPlume(ctx, -24, 9, 5, flameLength, '#00f0ff', '#ffffff', flicker);

    // Engine Nacelles (Dark composite housings)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-24, -13, 14, 7);
    ctx.strokeRect(-24, -13, 14, 7);
    ctx.fillRect(-24, 6, 14, 7);
    ctx.strokeRect(-24, 6, 14, 7);

    // Thruster nozzles glowing cyan
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(-25, -12, 2.5, 5);
    ctx.fillRect(-25, 7, 2.5, 5);

    // Main Swept Combat Delta Wings
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(2, 16);
    ctx.lineTo(-18, 28); // Starboard wingtip
    ctx.lineTo(-24, 24);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-24, 10);
    ctx.lineTo(-24, -10);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-24, -24);
    ctx.lineTo(-18, -28); // Port wingtip
    ctx.lineTo(2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing Leading Edge Armor Racing Stripes (Cyan Energy Bevels)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(-14, -26);
    ctx.moveTo(8, 8);
    ctx.lineTo(-14, 26);
    ctx.stroke();

    // Wing Navigation Strobe Lights (Blinking)
    const isStrobeOn = Math.sin(this.globalTime * 8) > 0.2;
    // Port wingtip: RED
    ctx.fillStyle = isStrobeOn ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(-18, -27, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Starboard wingtip: CYAN
    ctx.fillStyle = isStrobeOn ? '#06b6d4' : '#164e63';
    ctx.beginPath();
    ctx.arc(-18, 27, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Forward Wingtip Blaster Cannons
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2, -20, 26, 3);
    ctx.fillRect(-2, 17, 26, 3);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(20, -20.5, 4, 4);
    ctx.fillRect(20, 16.5, 4, 4);

    // Muzzle Flashes when firing
    if (isFiring) {
      this.renderMuzzleFlash(ctx, 26, -18.5, '#00f0ff');
      this.renderMuzzleFlash(ctx, 26, 18.5, '#00f0ff');
    }

    // Aerodynamic Central Fuselage & Needle Nose
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(34, 0); // Sharp nose probe
    ctx.lineTo(20, 7);
    ctx.lineTo(4, 9);
    ctx.lineTo(-14, 8);
    ctx.lineTo(-22, 5);
    ctx.lineTo(-22, -5);
    ctx.lineTo(-14, -8);
    ctx.lineTo(4, -9);
    ctx.lineTo(20, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dorsal Spine Panel
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();

    // Cockpit Canopy (Tinted Cyan Glass with Specular Glint)
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(8, 0, 11, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(7, -1.2, 7, 1.6, -0.1, 0, Math.PI);
    ctx.stroke();
  }

  // --- 2. TITAN DREADNOUGHT BATTLECRUISER ---
  private renderTitanSpaceship(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isFiring: boolean,
    flameLength: number,
    flicker: number
  ) {
    // Triple Heavy Amber Exhaust Plumes
    this.renderPlume(ctx, -26, 0, 8, flameLength * 1.15, '#f59e0b', '#fffbeb', flicker);
    this.renderPlume(ctx, -24, -14, 5, flameLength * 0.85, '#f97316', '#fffbeb', flicker);
    this.renderPlume(ctx, -24, 14, 5, flameLength * 0.85, '#f97316', '#fffbeb', flicker);

    // Heavy Engine Housings
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-26, -5, 12, 10);
    ctx.strokeRect(-26, -5, 12, 10);
    ctx.fillRect(-24, -18, 10, 8);
    ctx.strokeRect(-24, -18, 10, 8);
    ctx.fillRect(-24, 10, 10, 8);
    ctx.strokeRect(-24, 10, 10, 8);

    // Heavy Faceted Battle Wedge Armor Hull (Graphite)
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(34, 0); // Reinforced prow ram
    ctx.lineTo(24, 14);
    ctx.lineTo(8, 24);
    ctx.lineTo(-14, 28);
    ctx.lineTo(-24, 20);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-24, -20);
    ctx.lineTo(-14, -28);
    ctx.lineTo(8, -24);
    ctx.lineTo(24, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armor Plate Insets & Bevel Lines
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(4, 16);
    ctx.moveTo(18, 0);
    ctx.lineTo(4, -16);
    ctx.stroke();

    // Twin Forward Railgun Sponsons
    ctx.fillStyle = '#3f3f46';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.4;
    ctx.fillRect(0, -18, 28, 4.5);
    ctx.strokeRect(0, -18, 28, 4.5);
    ctx.fillRect(0, 13.5, 28, 4.5);
    ctx.strokeRect(0, 13.5, 28, 4.5);

    // Magnetic Accelerator Rings
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(10, -19, 3, 6.5);
    ctx.fillRect(18, -19, 3, 6.5);
    ctx.fillRect(10, 12.5, 3, 6.5);
    ctx.fillRect(18, 12.5, 3, 6.5);

    if (isFiring) {
      this.renderMuzzleFlash(ctx, 30, -15.5, '#fbbf24');
      this.renderMuzzleFlash(ctx, 30, 16, '#fbbf24');
    }

    // Central Fusion Core Reactor (Pulsing Amber)
    const corePulse = Math.sin(this.globalTime * 8) * 1.5;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-2, 0, 7 + corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Armored Command Deck Bridge
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.4;
    ctx.fillRect(10, -4, 9, 8);
    ctx.strokeRect(10, -4, 9, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, -2, 2.5, 4);
  }

  // --- 3. CHRONOS PHANTASM QUANTUM FIGHTER ---
  private renderChronosSpaceship(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    isFiring: boolean,
    flameLength: number,
    flicker: number
  ) {
    // Violet Tachyon Ion Exhausts
    this.renderPlume(ctx, -22, -8, 5, flameLength * 1.1, '#c084fc', '#ffffff', flicker);
    this.renderPlume(ctx, -22, 8, 5, flameLength * 1.1, '#c084fc', '#ffffff', flicker);

    // Forward-Swept Inverted Quantum Wings (Predator stance)
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(34, 0); // Razor nose
    ctx.lineTo(16, 8);
    ctx.lineTo(8, 26); // Forward swept wingtip
    ctx.lineTo(-4, 24);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-22, 8);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-14, -12);
    ctx.lineTo(-4, -24);
    ctx.lineTo(8, -26); // Forward swept wingtip
    ctx.lineTo(16, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Quantum Energy Channels
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(4, 20);
    ctx.moveTo(22, 0);
    ctx.lineTo(4, -20);
    ctx.stroke();

    // Wingtip Tachyon Needles
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(8, -26.5, 14, 2);
    ctx.fillRect(8, 24.5, 14, 2);

    if (isFiring) {
      this.renderMuzzleFlash(ctx, 23, -25.5, '#ec4899');
      this.renderMuzzleFlash(ctx, 23, 25.5, '#ec4899');
    }

    // Stealth Cockpit Canopy
    ctx.fillStyle = '#581c87';
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(10, 0, 10, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular Glint
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(9, -1, 6, 1.4, -0.1, 0, Math.PI);
    ctx.stroke();
  }

  // --- FAST, ALLOCATION-FREE AFTERBURNER PLUME ---
  private renderPlume(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    length: number,
    plasmaColor: string,
    coreColor: string,
    flicker: number
  ) {
    const safeLen = Math.max(4, (Number.isFinite(length) ? length : 16) + (Number.isFinite(flicker) ? flicker : 0));
    const safeW = Math.max(2, Number.isFinite(width) ? width : 4);

    // Outer plasma flame envelope
    ctx.fillStyle = plasmaColor;
    ctx.beginPath();
    ctx.moveTo(x, y - safeW);
    ctx.lineTo(x - safeLen, y);
    ctx.lineTo(x, y + safeW);
    ctx.closePath();
    ctx.fill();

    // Inner white-hot high-pressure core
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.moveTo(x, y - safeW * 0.45);
    ctx.lineTo(x - safeLen * 0.45, y);
    ctx.lineTo(x, y + safeW * 0.45);
    ctx.closePath();
    ctx.fill();
  }

  // --- WEAPON MUZZLE FLASH ---
  private renderMuzzleFlash(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }

  // --- SHIELD DEFLECTOR ENVELOPE ---
  private renderShieldDeflector(ctx: CanvasRenderingContext2D, player: PlayerState) {
    const shieldRatio = Math.max(0, Math.min(1, player.shield / player.maxShield));
    const pulse = Math.sin(this.globalTime * 8) * 1.5;
    const radius = 34 + pulse;

    ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 + shieldRatio * 0.5})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(0, 240, 255, ${0.07 * shieldRatio})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDrones(player: PlayerState, drones: Drone[]) {
    const ctx = this.ctx;
    const px = player.x;
    const py = player.y;

    for (const drone of drones) {
      const dx = px + Math.cos(drone.orbitAngle) * drone.distance;
      const dy = py + Math.sin(drone.orbitAngle) * drone.distance;

      ctx.save();
      ctx.translate(dx, dy);

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderEnemies(enemies: Enemy[]) {
    const ctx = this.ctx;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const ex = Number.isFinite(enemy.x) ? enemy.x : 0;
      const ey = Number.isFinite(enemy.y) ? enemy.y : 0;
      const angle = Number.isFinite(enemy.angle) ? enemy.angle : 0;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle);

      if (enemy.type === 'ASTEROID') {
        // Jagged rocky polygon
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;

        ctx.beginPath();
        const verts = enemy.customData?.asteroidVertices || [];
        if (verts.length > 0) {
          ctx.moveTo(verts[0].x, verts[0].y);
          for (let v = 1; v < verts.length; v++) {
            ctx.lineTo(verts[v].x, verts[v].y);
          }
          ctx.closePath();
        } else {
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(enemy.radius * 0.3, -enemy.radius * 0.2, enemy.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'SWARMER') {
        // Fast crimson dart fighter
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.2, 0);
        ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
        ctx.lineTo(-enemy.radius * 0.4, 0);
        ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.type === 'SCOUT') {
        // Pirate Interceptor Scout
        const enemyFlicker = Math.sin(this.globalTime * 20 + i) * 2;
        this.renderPlume(ctx, -enemy.radius * 0.7, 0, 3, 9, '#f97316', '#fef08a', enemyFlicker);

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.3, 0);
        ctx.lineTo(-enemy.radius * 0.4, enemy.radius);
        ctx.lineTo(-enemy.radius, enemy.radius * 0.6);
        ctx.lineTo(-enemy.radius * 0.6, 0);
        ctx.lineTo(-enemy.radius, -enemy.radius * 0.6);
        ctx.lineTo(-enemy.radius * 0.4, -enemy.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.ellipse(2, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'CRUISER') {
        // Heavy multi-wing cruiser
        const enemyFlicker = Math.sin(this.globalTime * 20 + i) * 2;
        this.renderPlume(ctx, -enemy.radius * 0.8, -7, 4, 12, '#a855f7', '#f5d0fe', enemyFlicker);
        this.renderPlume(ctx, -enemy.radius * 0.8, 7, 4, 12, '#a855f7', '#f5d0fe', enemyFlicker);

        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.2;

        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.4, 0);
        ctx.lineTo(enemy.radius * 0.4, enemy.radius);
        ctx.lineTo(-enemy.radius, enemy.radius * 1.1);
        ctx.lineTo(-enemy.radius * 0.7, 0);
        ctx.lineTo(-enemy.radius, -enemy.radius * 1.1);
        ctx.lineTo(enemy.radius * 0.4, -enemy.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'SNIPER') {
        // Long needle rail craft
        ctx.fillStyle = '#065f46';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.6, 0);
        ctx.lineTo(-enemy.radius, enemy.radius * 0.6);
        ctx.lineTo(-enemy.radius * 0.5, 0);
        ctx.lineTo(-enemy.radius, -enemy.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.6, 0);
        ctx.lineTo(enemy.radius * 6, 0);
        ctx.stroke();
      } else if (enemy.type === 'BOSS') {
        // Cosmic Dreadnought Boss Titan
        const radius = enemy.radius;
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 4;

        ctx.beginPath();
        for (let s = 0; s < 8; s++) {
          const theta = (s / 8) * Math.PI * 2;
          const r = s % 2 === 0 ? radius : radius * 0.75;
          const px = Math.cos(theta) * r;
          const py = Math.sin(theta) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const corePulse = Math.sin(this.globalTime * 8) * 3;
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(0, 0, 16 + corePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Health bar above enemy
      if (enemy.health < enemy.maxHealth || enemy.type === 'BOSS') {
        const barWidth = enemy.type === 'BOSS' ? 70 : 28;
        const barHeight = enemy.type === 'BOSS' ? 6 : 3;
        const healthPercent = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(-barWidth / 2, -enemy.radius - 12, barWidth, barHeight);

        ctx.fillStyle = enemy.type === 'BOSS' ? '#e11d48' : '#22c55e';
        ctx.fillRect(-barWidth / 2, -enemy.radius - 12, barWidth * healthPercent, barHeight);
      }

      ctx.restore();
    }
  }

  private renderProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;

    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      const px = Number.isFinite(p.x) ? p.x : 0;
      const py = Number.isFinite(p.y) ? p.y : 0;
      const angle = Math.atan2(p.vy || 0, p.vx || 0);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);

      if (p.isHoming) {
        // Rocket missile
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-6, -2, 12, 4);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-6, -2);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-6, 2);
        ctx.fill();
      } else {
        // Plasma bullet
        ctx.fillStyle = p.color || '#00f0ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 2, p.radius * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 0.9, p.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderShards(shards: XpShard[]) {
    const ctx = this.ctx;
    const spin = this.globalTime * 3;

    for (let i = 0; i < shards.length; i++) {
      const s = shards[i];
      const sx = Number.isFinite(s.x) ? s.x : 0;
      const sy = Number.isFinite(s.y) ? s.y : 0;
      const r = s.radius || 4;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(spin);

      ctx.fillStyle = s.color || '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r * 1.4);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderParticles(particles: Particle[]) {
    const ctx = this.ctx;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const px = Number.isFinite(p.x) ? p.x : 0;
      const py = Number.isFinite(p.y) ? p.y : 0;
      const alpha = Math.max(0, Math.min(1, Number.isFinite(p.alpha) ? p.alpha : 1));

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.shape === 'shockwave' || p.shape === 'ring') {
        ctx.strokeStyle = p.color || '#38bdf8';
        ctx.lineWidth = p.shape === 'shockwave' ? 3.5 : 2;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, p.radius || 10), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'spark') {
        const angle = Math.atan2(p.vy || 0, p.vx || 0);
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = p.color || '#ffffff';
        ctx.fillRect(-p.size * 2, -p.size * 0.5, p.size * 3, p.size);
      } else {
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, p.size || 2), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }

  private renderFloatTexts(floatTexts: FloatText[]) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';

    for (let i = 0; i < floatTexts.length; i++) {
      const ft = floatTexts[i];
      const fx = Number.isFinite(ft.x) ? ft.x : 0;
      const fy = Number.isFinite(ft.y) ? ft.y : 0;
      const alpha = Math.max(0, Math.min(1, Number.isFinite(ft.alpha) ? ft.alpha : 1));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 3;
      ctx.fillText(ft.text, fx, fy);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }
}
