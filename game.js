/**
 * ==========================================================================
 * TOWER BLOXX NEO - 游戏核心引擎 (第二阶段：核心机制改进与视觉升级)
 * ==========================================================================
 */

// 全局常量缓存 (避免每帧重复计算)
const TWO_PI = Math.PI * 2;

// ==========================================================================
// 0. 资源预加载系统
// ==========================================================================
class AssetLoader {
  constructor() {
    this.assets = {};
    this.total = 0;
  }
  
  loadAll(onComplete) {
    const images = [
      'crane_hook_frames', 'crane_boom_arm', 'building_spire', 'roof_red_variants', 'roof_yellow_variants',
      'sprite_residents', 'ui_population_icon', 'bg_tree', 'bg_fence', 'bg_cloud_a', 'bg_cloud_b', 'bg_cloud_c',
      'bg_mountains', 'bg_jet_plane', 'bg_propeller_plane', 'bg_flying_whales', 'space_moon', 'space_mars',
      'space_saturn', 'space_neptune', 'space_glow', 'fx_dust_puff', 'fx_sparkle_star', 'fx_debris',
      'fx_speed_lines', 'fx_wind_sway', 'badge_town', 'badge_city', 'badge_metropolis', 'badge_megacity',
      'ui_drop_shadow', 'icon', 'roof_tops_deluxe', 'block_window_unit'
    ];
    this.total = images.length;
    let loadedCount = 0;
    if (this.total === 0) {
      onComplete();
      return;
    }
    
    images.forEach(name => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === this.total) onComplete();
      };
      img.onerror = () => {
        console.warn('Failed to load asset: ' + name);
        loadedCount++;
        if (loadedCount === this.total) onComplete();
      };
      img.src = `assets/${name}.png`;
      this.assets[name] = img;
    });
  }
}

// ==========================================================================
// 方案 1：建筑电焊火花 + 接缝瞬间强光 + 扁平横向冲击波特效系统
// ==========================================================================

// 1. 接触缝隙瞬间高亮锁合光束 (Seam Contact Flash)
class ContactSeamFlash {
  constructor(x, y, width, isPerfect = false, themeRetro = false) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.isPerfect = isPerfect;
    this.themeRetro = themeRetro;
    this.timer = 0;
    this.duration = isPerfect ? 220 : 160;
    this.active = true;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active || this.themeRetro) return;
    const progress = this.timer / this.duration;
    const alpha = Math.sin((1 - progress) * (Math.PI / 2));
    const halfW = (this.w / 2) * (1 + progress * 0.25);

    ctx.save();
    const grad = ctx.createLinearGradient(this.x - halfW, this.y, this.x + halfW, this.y);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.2, this.isPerfect ? `rgba(255, 209, 102, ${alpha * 0.85})` : `rgba(56, 189, 248, ${alpha * 0.75})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.98})`);
    grad.addColorStop(0.8, this.isPerfect ? `rgba(255, 209, 102, ${alpha * 0.85})` : `rgba(56, 189, 248, ${alpha * 0.75})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(this.x - halfW, this.y - 2.5, halfW * 2, 5);
    ctx.restore();
  }
}

// 2. 接触冲击扁平扩散气浪光环 (Impact Shockwave Ring)
class ImpactShockwave {
  constructor(x, y, width, isPerfect = false, themeRetro = false) {
    this.x = x;
    this.y = y;
    this.baseW = width;
    this.isPerfect = isPerfect;
    this.themeRetro = themeRetro;
    this.timer = 0;
    this.duration = isPerfect ? 340 : 240;
    this.active = true;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.timer / this.duration;
    const alpha = Math.max(0, 1 - progress);
    const radiusX = (this.baseW * 0.45) + (this.baseW * (this.isPerfect ? 0.95 : 0.65)) * progress;
    const radiusY = (this.isPerfect ? 6 : 4) + (this.isPerfect ? 15 : 10) * progress;

    ctx.save();
    if (this.themeRetro) {
      ctx.strokeStyle = '#0f380f';
      ctx.lineWidth = Math.max(1, 3 * (1 - progress));
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, radiusX, radiusY, 0, 0, TWO_PI);
      ctx.stroke();
    } else {
      ctx.shadowBlur = this.isPerfect ? 16 * alpha : 8 * alpha;
      ctx.shadowColor = this.isPerfect ? '#ffd166' : '#38bdf8';

      // 外圈光晕冲击环
      ctx.strokeStyle = this.isPerfect
        ? `rgba(255, 209, 102, ${alpha * 0.95})`
        : `rgba(56, 189, 248, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(1.2, (this.isPerfect ? 4.0 : 2.5) * (1 - progress * 0.6));
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, radiusX, radiusY, 0, 0, TWO_PI);
      ctx.stroke();

      // 内圈核心高亮亮线
      if (this.isPerfect && progress < 0.6) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress / 0.6) * 0.9})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, radiusX * 0.75, radiusY * 0.75, 0, 0, TWO_PI);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// 3. 钢结构接缝电焊铆接火花特效 (Welding Sparks & Embers)
class WeldingSparkEmitter {
  constructor(x, y, width, isPerfect = false, themeRetro = false) {
    this.x = x;
    this.y = y;
    this.active = true;
    this.timer = 0;
    this.duration = 450;
    this.sparks = [];
    this.themeRetro = themeRetro;

    const count = isPerfect ? 28 : 16;
    const halfW = width / 2;

    for (let i = 0; i < count; i++) {
      const originType = i % 3; // 0: 左侧角, 1: 右侧角, 2: 中间结合部
      let spawnX = x;
      let dirX = (Math.random() - 0.5) * 4;

      if (originType === 0) {
        spawnX = x - halfW + (Math.random() - 0.5) * 6;
        dirX = -2.5 - Math.random() * 5.0; // 强劲向左喷射
      } else if (originType === 1) {
        spawnX = x + halfW + (Math.random() - 0.5) * 6;
        dirX = 2.5 + Math.random() * 5.0; // 强劲向右喷射
      } else {
        spawnX = x + (Math.random() - 0.5) * (width * 0.6);
        dirX = (Math.random() - 0.5) * 6.0;
      }

      const vy = -1.5 - Math.random() * 4.5;
      const speed = Math.sqrt(dirX * dirX + vy * vy);

      this.sparks.push({
        x: spawnX,
        y: y,
        vx: dirX,
        vy: vy,
        length: Math.max(3, speed * 1.6),
        color: themeRetro
          ? '#0f380f'
          : (isPerfect
              ? (Math.random() > 0.3 ? '#fff7ed' : '#ffd166')
              : (Math.random() > 0.4 ? '#fef08a' : '#f97316')),
        alpha: 1.0,
        decay: Math.random() * 0.028 + 0.022,
        size: Math.random() * 1.5 + 1.2
      });
    }
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      return;
    }
    const dtFactor = Math.min(dt / 16.66, 3.0);
    let alive = 0;

    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (s.alpha <= 0) continue;
      alive++;
      s.x += s.vx * dtFactor;
      s.y += s.vy * dtFactor;
      s.vy += 0.28 * dtFactor; // 重力加速度
      s.vx *= Math.pow(0.96, dtFactor);
      s.alpha -= s.decay * dtFactor;
    }
    if (alive === 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (s.alpha <= 0) continue;

      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;

      // 沿运动方向拉伸的飞溅火花细线 (逼真电焊飞星)
      const angle = Math.atan2(s.vy, s.vx);
      const tailX = s.x - Math.cos(angle) * (s.length * s.alpha);
      const tailY = s.y - Math.sin(angle) * (s.length * s.alpha);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // 火花头部耀眼亮点
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.8, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  }
}

class SpriteDustPuff {
  constructor(x, y, scale) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.frame = 0;
    this.frameTimer = 0;
    this.maxFrames = 6;
    this.frameDuration = 80;
    this.active = true;
  }
  update(dt) {
    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frame++;
      this.frameTimer = 0;
      if (this.frame >= this.maxFrames) {
        this.active = false;
      }
    }
  }
  draw(ctx, loader) {
    if (!this.active) return;
    const img = loader.assets['fx_dust_puff'];
    if (img && img.complete) {
      const fw = 31;
      const fh = 31;
      const sw = fw * this.scale;
      const sh = fh * this.scale;
      ctx.drawImage(img, this.frame * fw, 0, fw, fh, this.x - sw/2, this.y - sh/2, sw, sh);
    }
  }
}

class SparkleStar {
  constructor(x, y, scale) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.frame = 0;
    this.frameTimer = 0;
    this.maxFrames = 4;
    this.frameDuration = 80;
    this.active = true;
  }
  update(dt) {
    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frame++;
      this.frameTimer = 0;
      if (this.frame >= this.maxFrames) {
        this.active = false;
      }
    }
  }
  draw(ctx, loader) {
    if (!this.active) return;
    const img = loader.assets['fx_sparkle_star'];
    if (img && img.complete) {
      const fw = 22;
      const fh = 22;
      const sw = fw * this.scale;
      const sh = fh * this.scale;
      ctx.drawImage(img, this.frame * fw, 0, fw, fh, this.x - sw/2, this.y - sh/2, sw, sh);
    }
  }
}

// 楼层 Combo 连击金光加固特效
class GoldReinforceEffect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.w = width;
    this.h = height;
    this.timer = 0;
    this.duration = 550; // 550ms
    this.active = true;
    this.sparks = [];
    for (let i = 0; i < 18; i++) {
      this.sparks.push({
        x: (Math.random() - 0.5) * (width * 1.1),
        y: (Math.random() - 0.5) * (height * 1.2),
        vy: -1.2 - Math.random() * 2.2,
        size: 2 + Math.random() * 4,
        alpha: 1.0
      });
    }
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
    }
    const dtFactor = Math.min(dt / 16.66, 3.0);
    this.sparks.forEach(s => {
      s.y += s.vy * dtFactor;
      s.alpha -= 0.022 * dtFactor;
    });
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.timer / this.duration;
    const alpha = Math.sin(progress * Math.PI); // 平滑渐隐

    ctx.save();
    // 1. 全面加固金光轮廓辉光
    ctx.shadowBlur = 24 * alpha;
    ctx.shadowColor = '#fbbf24';
    
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.95})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(this.x - this.w / 2 - 3, this.y - this.h * 1.5, this.w + 6, this.h * 2.5);

    // 2. 楼层扫过金光扫描束
    const sweepY = (this.y - this.h * 1.5) + (this.h * 2.5) * progress;
    const gradSweep = ctx.createLinearGradient(this.x - this.w/2, sweepY, this.x + this.w/2, sweepY);
    gradSweep.addColorStop(0, 'rgba(255, 215, 0, 0)');
    gradSweep.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.95})`);
    gradSweep.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradSweep;
    ctx.fillRect(this.x - this.w / 2 - 12, sweepY - 8, this.w + 24, 16);

    // 3. 升腾加固金光粒子
    this.sparks.forEach(s => {
      if (s.alpha <= 0) return;
      ctx.fillStyle = `rgba(255, 235, 120, ${Math.max(0, s.alpha * alpha)})`;
      ctx.beginPath();
      ctx.arc(this.x + s.x, this.y + s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}

// 居民降落伞入住特效类 (从空中飘落降落至新建造楼层窗户)
class ResidentParachute {
  constructor(startX, startY, targetBlockIndex, offsetX = 0) {
    this.x = startX;
    this.y = startY;
    this.targetBlockIndex = targetBlockIndex; // 绑定的目标楼层索引
    this.offsetX = offsetX;                   // 房顶中心的左右分布微调 (-12px ~ +12px)
    this.vy = 2.0 + Math.random() * 0.8;
    this.time = Math.random() * 10;
    this.state = 'FLOATING'; // FLOATING -> LANDED
    this.active = true;
    this.cheerTimer = 0;
  }

  update(dt, game) {
    if (!this.active) return;
    this.time += dt * 0.003;
    const dtFactor = Math.min(dt / 16.66, 3.0);

    // 获取绑定的目标楼层实时坐标 (100% 精准追踪镜头与楼体摇摆)
    const groundY = game.baseHeight - 120;
    let targetX = game.baseWidth / 2 + this.offsetX;
    let targetWorldY = (this.targetBlockIndex + 1) * game.blockHeight;

    if (game.tower && game.tower[this.targetBlockIndex]) {
      const block = game.tower[this.targetBlockIndex];
      const swayFactor = Math.pow((this.targetBlockIndex + 1) / Math.max(1, game.tower.length), 1.5);
      targetX = block.x + game.towerSway.offset * swayFactor + this.offsetX;
      targetWorldY = (this.targetBlockIndex + 1) * block.h;
    }

    const currentTargetScreenY = groundY - targetWorldY + game.camera.y - 4;

    if (this.state === 'FLOATING') {
      this.y += this.vy * dtFactor;
      // 向房子正中间平滑集中靠拢
      this.x += (targetX - this.x) * 0.08 * dtFactor;

      if (this.y >= currentTargetScreenY) {
        this.y = currentTargetScreenY;
        this.x = targetX;
        this.state = 'LANDED';
        this.cheerTimer = 0;
        if (game) {
          game.population += 15;
          if (game.dom && game.dom.populationVal) {
            game.dom.populationVal.textContent = game.population;
          }
        }
      }
    } else if (this.state === 'LANDED') {
      // 降落后完美粘附在房子顶面窗户，随镜头与楼体完全联动！
      this.x = targetX;
      this.y = currentTargetScreenY;

      this.cheerTimer += dt;
      if (this.cheerTimer > 650) {
        this.active = false;
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'FLOATING') {
      const sway = Math.sin(this.time * 3) * 0.15;
      ctx.rotate(sway);

      // 彩虹半圆立体降落伞
      const chuteGrad = ctx.createLinearGradient(-16, -26, 16, -26);
      chuteGrad.addColorStop(0, '#ef4444');
      chuteGrad.addColorStop(0.33, '#f59e0b');
      chuteGrad.addColorStop(0.66, '#10b981');
      chuteGrad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = chuteGrad;
      ctx.beginPath();
      ctx.arc(0, -18, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 降落伞 4 根高强度白色悬挂绳索
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-14, -18); ctx.lineTo(-2, -4);
      ctx.moveTo(-5, -18);  ctx.lineTo(-1, -4);
      ctx.moveTo(5, -18);   ctx.lineTo(1, -4);
      ctx.moveTo(14, -18);  ctx.lineTo(2, -4);
      ctx.stroke();

      // 100% 矢量超高清 Cute Chibi 小居民 (圆头 + 蓝衫 + 挥舞双臂)
      // 头部
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -4, 5, 0, Math.PI * 2);
      ctx.fill();
      // 眼睛
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-2, -5, 1.5, 2);
      ctx.fillRect(1, -5, 1.5, 2);

      // 上衣
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-4, 1, 8, 7);

      // 裤子
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, 8, 3, 4);
      ctx.fillRect(1, 8, 3, 4);

      // 挥舞双臂 (手握降落伞绳索)
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, 2); ctx.lineTo(-7, -2);
      ctx.moveTo(4, 2);  ctx.lineTo(7, -2);
      ctx.stroke();

    } else if (this.state === 'LANDED') {
      // 成功降落窗户欢呼 (矢量光晕 + 举双臂欢呼)
      const glowGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      glowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // 欢呼小人
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, -6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-4, -1, 8, 7);

      // 举高手臂 V 字欢呼姿态
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(-8, -9);
      ctx.moveTo(4, 0);  ctx.lineTo(8, -9);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ==========================================================================
// 1. 音效合成系统 (Web Audio API)
// ==========================================================================
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext 初始化跳过:", e);
    }
  }

  playDrop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("音频播放跳过:", e);
    }
  }

  playLand() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.setValueAtTime(220, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playPerfect(comboCount = 1) {
    if (!this.enabled || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    // C4: 连击越高音调越高，最多升 300Hz
    const pitchShift = Math.min((comboCount || 1) * 30, 300);
    const notes = [523.25 + pitchShift, 659.25 + pitchShift, 783.99 + pitchShift, 1046.50 + pitchShift];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  playFail() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.65);
    });
  }
}

// ==========================================================================
// 2. 触觉震动系统 (Vibration API)
// ==========================================================================
class HapticsController {
  constructor() {
    this.enabled = true;
  }

  vibrate(pattern) {
    if (!this.enabled || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("震动 API 触发失败:", e);
    }
  }

  vibrateLand() {
    this.vibrate(40);
  }

  vibratePerfect() {
    this.vibrate([35, 30, 45]);
  }

  vibrateFail() {
    this.vibrate(250);
  }
}

// ==========================================================================
// 3. 漂浮文字与 Combo 特效系统
// ==========================================================================
class FloatingText {
  constructor(x, y, text, color, isBig = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.isBig = isBig;
    this.vy = -1.2; // 漂浮上升速度
    this.life = 60; // 帧生命值
    this.alpha = 1.0;
    this.scale = isBig ? 1.5 : 1.0;
  }

  update() {
    this.y += this.vy;
    this.life--;
    this.alpha = Math.max(0, this.life / 60);
    // 漂浮文字轻微缩放呼吸
    if (this.isBig) {
      this.scale = 1.5 + Math.sin(this.life * 0.1) * 0.15;
    }
  }

  draw(ctx, fontMono, fontDisplay) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (this.isBig) {
      ctx.font = `800 ${Math.floor(20 * this.scale)}px ${fontDisplay}`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
    } else {
      ctx.font = `bold ${Math.floor(14 * this.scale)}px ${fontMono}`;
    }

    // 绘制文字描边
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = this.isBig ? 4 : 3;
    ctx.strokeText(this.text, this.x, this.y);

    // 绘制文字本体
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ==========================================================================
// 4. 粒子特效系统
// ==========================================================================
class Particle {
  constructor(x, y, color, themeRetro = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.themeRetro = themeRetro;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.2;
    
    this.alpha = 1;
    this.decay = Math.random() * 0.025 + 0.02;
    this.size = Math.random() * (themeRetro ? 3 : 6) + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.06;
    this.alpha -= this.decay;
  }

  // 性能优化：不再每粒子 save/restore，由 ParticleSystem 批量管理
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    
    if (this.themeRetro) {
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// 落地冲击横向烟尘粒子
class SmokeParticle {
  constructor(x, y, color, dirX, themeRetro = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.themeRetro = themeRetro;
    this.vx = dirX * (Math.random() * 4.5 + 2.5);
    this.vy = -Math.random() * 1.5;
    this.alpha = 0.8;
    this.decay = Math.random() * 0.04 + 0.025;
    this.size = Math.random() * 5 + 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.90;
    this.alpha -= this.decay;
    this.size += 0.25;
  }

  // 性能优化：不再每粒子 save/restore
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    if (this.themeRetro) {
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, TWO_PI);
      ctx.fill();
    }
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count = 15, themeRetro = false) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, themeRetro));
    }
  }

  emitDust(x, y, color = '#d2dae2', themeRetro = false) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new SmokeParticle(x, y, color, -1, themeRetro));
      this.particles.push(new SmokeParticle(x, y, color, 1, themeRetro));
    }
  }

  // 性能优化：O(n) 交换压缩替代 O(n²) splice 逐个删除
  update() {
    let writeIdx = 0;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update();
      if (this.particles[i].alpha > 0) {
        this.particles[writeIdx++] = this.particles[i];
      }
    }
    this.particles.length = writeIdx;
  }

  // 性能优化：单次 save/restore 批量绘制所有粒子
  draw(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ==========================================================================
// 5. 游戏主控制类
// ==========================================================================
class TowerBloxxGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.assetsLoaded = true;
    this.loader = new AssetLoader();
    this.spriteEffects = [];
    this.jetX = -100;
    this.propX = 480 + 100;

    // 初始化外设/粒子/漂浮文字
    this.synth = new SoundSynth();
    this.haptics = new HapticsController();
    this.particles = new ParticleSystem();
    this.floatingTexts = [];
    
    // 游戏运行状态
    this.state = 'MENU';
    this.theme = 'modern';
    
    // 核心数值
    this.score = 0;
    this.population = 0; // E4: 居民人口数
    let savedHighScore = 0;
    try {
      savedHighScore = parseInt(localStorage.getItem('tb_high_score') || '0', 10);
    } catch (e) {
      console.warn("无法读取 localStorage:", e);
    }
    this.highScore = savedHighScore;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = 3;

    // 方块参数 (北欧住宅比例：宽85，高55)
    this.blockWidth = 85;  
    this.blockHeight = 55;  
    this.tower = [];
    
    // 吊车与绳子参数 (包含反冲、拉伸、爪子张合与人控摆动)
    this.crane = {
      pivotX: 0,
      pivotY: 65,
      length: 140,
      angle: 0,
      angleRange: Math.PI / 4.5,
      speed: 0.022,
      time: 0,
      ropeStretch: 0,  // 脱钩绳索弹起 & 载重伸缩
      clawSpread: 0    // 爪子张合动态
    };
    
    // 当前悬浮方块
    this.swingingBlock = {
      w: this.blockWidth,
      h: this.blockHeight
    };
    
    // 下落方块
    this.fallingBlock = null;
    
    // 摄像机 (纵向位置)
    this.camera = {
      y: 0,
      targetY: 0,
      ease: 0.08
    };
    
    // 楼体摇晃物理数据
    this.towerSway = {
      amplitude: 0,
      frequency: 0.012,
      offset: 0,
      time: 0,
      instability: 0
    };

    // E2: 楼体崩塌碎片数组
    this.collapseBlocks = [];

    // E3: 屏幕震动
    this.screenShake = { intensity: 0, duration: 0 };

    // 性能优化：渐变/颜色缓存
    this._gradientCache = {};

    // 屏幕自适应
    this.dpr = window.devicePixelRatio || 1;
    this.baseWidth = 480;
    this.baseHeight = 850;
    
    // Parallax 背景星空/云朵
    this.stars = [];
    this.clouds = [];
    // 渐进背景树木位置
    this.parkTrees = [];
    
    // 绑定 DOM
    this.dom = {
      startMenu: document.getElementById('start-menu'),
      settingsMenu: document.getElementById('settings-menu'),
      gameOverScreen: document.getElementById('game-over-screen'),
      hudOverlay: document.getElementById('hud-overlay'),
      tapInstruction: document.getElementById('tap-instruction'),
      scoreVal: document.getElementById('score-val'),
      heightVal: document.getElementById('height-val'),
      comboVal: document.getElementById('combo-val'),
      comboText: document.getElementById('combo-text'),
      heartsContainer: document.getElementById('hearts-container'),
      highScoreVal: document.getElementById('high-score-val'),
      finalScoreVal: document.getElementById('final-score-val'),
      finalHeightVal: document.getElementById('final-height-val'),
      maxComboVal: document.getElementById('max-combo-val'),
      gameOverReasonText: document.getElementById('game-over-reason-text'),
      toggleSound: document.getElementById('toggle-sound'),
      toggleVibrate: document.getElementById('toggle-vibrate'),
      btnStart: document.getElementById('btn-start-game'),
      btnSettings: document.getElementById('btn-open-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnRestart: document.getElementById('btn-restart-game'),
      btnReturnHome: document.getElementById('btn-return-home'),
      btnThemeModern: document.getElementById('btn-theme-modern'),
      btnThemeRetro: document.getElementById('btn-theme-retro'),
      // C1/E4: 新增 DOM 引用
      pauseMenu: document.getElementById('pause-menu'),
      btnResumeGame: document.getElementById('btn-resume-game'),
      btnPauseHome: document.getElementById('btn-pause-home'),
      populationVal: document.getElementById('population-val'),
      victoryMenu: document.getElementById('victory-menu'),
      victoryScoreVal: document.getElementById('victory-score-val'),
      victoryPopVal: document.getElementById('victory-pop-val'),
      victoryComboVal: document.getElementById('victory-combo-val')
    };

    this.initEvents();
    this.resizeCanvas();
    this.initParallaxElements();
    this.updateHighScoreDisplay();
    
    // 运行主循环
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ==========================================================================
  // 事件与自适应绑定
  // ==========================================================================
  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('load', () => this.resizeCanvas());

    const bindBtn = (btn, fn) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        fn();
      });
    };

    bindBtn(this.dom.btnStart, () => this.startGame());
    bindBtn(this.dom.btnSettings, () => this.openSettings());
    bindBtn(this.dom.btnCloseSettings, () => this.closeSettings());
    bindBtn(this.dom.btnRestart, () => this.startGame());
    bindBtn(this.dom.btnReturnHome, () => this.goHome());

    bindBtn(this.dom.btnThemeModern, () => this.setTheme('modern'));
    bindBtn(this.dom.btnThemeRetro, () => this.setTheme('retro'));

    bindBtn(this.dom.btnResumeGame, () => this.resumeGame());
    bindBtn(this.dom.btnPauseHome, () => this.goHome());

    // D2: 页面不可见时暂停循环，节省电池
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._pageHidden = true;
      } else {
        this._pageHidden = false;
        this.lastTime = performance.now();
      }
    });

    if (this.dom.toggleSound) {
      this.dom.toggleSound.addEventListener('change', (e) => {
        this.synth.enabled = e.target.checked;
      });
    }
    if (this.dom.toggleVibrate) {
      this.dom.toggleVibrate.addEventListener('change', (e) => {
        this.haptics.enabled = e.target.checked;
      });
    }

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowDown', 'Enter', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.triggerDrop();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }
    });

    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) {
      wrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, input, label, .hud-item, .switch, .menu-overlay')) return;
        if (this.state === 'PLAYING') {
          e.preventDefault();
          this.triggerDrop();
        }
      }, { passive: false });

      wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('button, input, label, .hud-item, .switch, .menu-overlay')) return;
        if (this.state === 'PLAYING') {
          this.triggerDrop();
        }
      });
    }
  }

  // ==========================================================================
  // 背景视差元素初始化
  // ==========================================================================
  initParallaxElements() {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.baseWidth,
        y: Math.random() * this.baseHeight,
        size: Math.random() * 1.5 + 0.6,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        alpha: Math.random()
      });
    }

    this.clouds = [
      { x: 40, y: 150, scale: 0.8, speed: 0.12 },
      { x: 260, y: 320, scale: 1.2, speed: 0.06 },
      { x: 120, y: 550, scale: 0.7, speed: 0.18 }
    ];

    this.parkTrees = [];
    const groundY = this.baseHeight - 120;
    for (let i = 0; i < 8; i++) {
      this.parkTrees.push({
        x: i * 65 + Math.random() * 20 - 10,
        y: groundY,
        w: Math.random() * 20 + 25,
        h: Math.random() * 40 + 50,
        color: i % 2 === 0 ? '#1b4d3e' : '#2d6a4f'
      });
    }
  }

  // ==========================================================================
  // 核心运行控制
  // ==========================================================================
  showElement(el, displayType = 'flex') {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = displayType;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  hideElement(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }

  startGame() {
    console.log("🚀 [GameEngine] startGame triggered!");
    try {
      try {
        if (this.synth) this.synth.init();
      } catch (e) {
        console.warn("音频防护:", e);
      }
      
      this.score = 0;
      this.population = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.lives = 3;
      this.tower = [];
      this.fallingBlock = null;
      this.collapseBlocks = [];
      if (this.particles && this.particles.clear) this.particles.clear();
      this.floatingTexts = [];
      this.spriteEffects = [];
      
      this.swingingBlock = {
        w: this.blockWidth || 85,
        h: this.blockHeight || 55
      };
      if (this.crane) this.crane.speed = 0.022;
      
      this.camera.y = 0;
      this.camera.targetY = 0;

      this.towerSway = {
        amplitude: 0,
        frequency: 0.012,
        offset: 0,
        time: 0,
        instability: 0
      };

      this.state = 'PLAYING';
      
      this.hideElement(this.dom.startMenu);
      this.hideElement(this.dom.settingsMenu);
      this.hideElement(this.dom.gameOverScreen);
      this.hideElement(this.dom.pauseMenu);
      this.hideElement(this.dom.victoryMenu);
      
      // 强效保证 startMenu 被完全隐藏，绝不遮挡游戏画板
      if (this.dom && this.dom.startMenu) {
        this.dom.startMenu.classList.add('hidden');
        this.dom.startMenu.style.display = 'none';
        this.dom.startMenu.style.opacity = '0';
        this.dom.startMenu.style.pointerEvents = 'none';
      }

      this.showElement(this.dom.hudOverlay, 'flex');
      this.showElement(this.dom.tapInstruction, 'block');
      
      this.updateHUD();
    } catch (err) {
      console.error("❌ startGame 异常防爆:", err);
      if (this.dom && this.dom.startMenu) {
        this.dom.startMenu.style.display = 'none';
        this.dom.startMenu.style.pointerEvents = 'none';
      }
    }
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.showElement(this.dom.pauseMenu, 'flex');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.hideElement(this.dom.pauseMenu);
  }

  openSettings() {
    this.hideElement(this.dom.startMenu);
    this.showElement(this.dom.settingsMenu, 'flex');
  }

  closeSettings() {
    this.hideElement(this.dom.settingsMenu);
    this.showElement(this.dom.startMenu, 'flex');
  }

  goHome() {
    this.state = 'MENU';
    this.hideElement(this.dom.gameOverScreen);
    this.hideElement(this.dom.pauseMenu);
    this.hideElement(this.dom.victoryMenu);
    this.hideElement(this.dom.hudOverlay);
    this.hideElement(this.dom.tapInstruction);
    this.showElement(this.dom.startMenu, 'flex');
    this.updateHighScoreDisplay();
  }

  showStartMenu() {
    this.goHome();
  }

  setTheme(themeName) {
    this.theme = themeName;
    if (themeName === 'retro') {
      document.body.classList.add('theme-retro');
      this.dom.btnThemeRetro.classList.add('active');
      this.dom.btnThemeModern.classList.remove('active');
    } else {
      document.body.classList.remove('theme-retro');
      this.dom.btnThemeRetro.classList.remove('active');
      this.dom.btnThemeModern.classList.add('active');
    }
  }

  updateHighScoreDisplay() {
    this.dom.highScoreVal.innerText = this.highScore;
  }

  triggerDrop() {
    if (this.state !== 'PLAYING' || this.fallingBlock) return;

    this.synth.playDrop();

    // 机械动作：脱钩瞬间绳索向上剧烈反冲弹回，爪子瞬间张开
    this.crane.ropeStretch = -12;
    this.crane.clawSpread = 14;

    const currentRopeLen = this.crane.length + this.crane.ropeStretch;
    const trolleyX = this.baseWidth / 2 + Math.sin(this.crane.angle) * 16;
    const swingX = trolleyX + Math.sin(this.crane.angle) * currentRopeLen;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * currentRopeLen;
    
    const groundY = this.baseHeight - 120;
    const worldY = groundY - (swingY + 58) - this.swingingBlock.h + this.camera.y;

    // 释放顶部机械蒸汽
    const isRetro = this.theme === 'retro';
    this.particles.emitDust(trolleyX, this.crane.pivotY, isRetro ? '#0f380f' : '#ffffff', isRetro);

    // 重力下落物理：初始下落速度较小，带加速度、抛体惯性与脱钩倾斜角
    this.fallingBlock = {
      x: swingX,
      y: worldY,
      vy: 3,                                            // 初始下落较软
      gravity: 0.85,                                     // 重力加速度 (越落下落越快!)
      vx: Math.sin(this.crane.angle) * 3.2,              // 水平脱钩惯性
      angle: this.crane.angle,                           // 继承吊车脱钩时的倾角
      vAngle: Math.sin(this.crane.angle) * -0.04,        // 姿态空中微摇
      w: this.swingingBlock.w,
      h: this.swingingBlock.h
    };

    this.hideElement(this.dom.tapInstruction);
  }

  loseLife(reason) {
    this.lives--;
    this.combo = 0;
    this.synth.playFail();
    this.haptics.vibrateFail();
    this.triggerShake(10); // E3: 扣血震屏
    this.updateHUD();

    if (this.lives <= 0) {
      this.triggerGameOver(reason);
    }
  }

  triggerGameOver(reason) {
    this.state = 'GAMEOVER';
    try {
      this.synth.playGameOver();
    } catch (e) {
      console.warn("音效播放跳过:", e);
    }
    this.triggerShake(16, 20); // E3: 游戏结束大地震屏

    // E2: 生成楼体坍塌物理碎片
    const groundY = this.baseHeight - 120;
    this.collapseBlocks = this.tower.map((b, idx) => ({
      x: b.x + this.towerSway.offset * Math.pow((idx + 1) / Math.max(1, this.tower.length), 1.5),
      y: groundY - (idx + 1) * b.h + this.camera.y,
      w: b.w,
      h: b.h,
      vx: (Math.random() - 0.5) * 8 + (idx % 2 === 0 ? -3 : 3),
      vy: -Math.random() * 4 - 2,
      rot: 0,
      vRot: (Math.random() - 0.5) * 0.15
    }));
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('tb_high_score', this.highScore);
      } catch (e) {
        console.warn("无法写入 localStorage:", e);
      }
    }

    if (this.dom.gameOverReasonText) this.dom.gameOverReasonText.innerText = reason;
    if (this.dom.finalScoreVal) this.dom.finalScoreVal.innerText = `${this.score} (${this.population} 居民)`;
    if (this.dom.finalHeightVal) this.dom.finalHeightVal.innerText = `${this.tower.length} 层`;
    if (this.dom.maxComboVal) this.dom.maxComboVal.innerText = `x${this.maxCombo}`;

    this.hideElement(this.dom.hudOverlay);
    this.hideElement(this.dom.tapInstruction);
    this.showElement(this.dom.gameOverScreen, 'flex');
  }

  // 50 层摩天大楼完美封顶胜利结算
  triggerVictory() {
    this.state = 'VICTORY';
    this.synth.playPerfect(10);
    this.haptics.vibratePerfect();

    // 触发 50 颗粒全屏祝贺烟花与星光粒子
    const topY = this.baseHeight - 120 - this.tower.length * this.blockHeight + this.camera.y;
    for (let i = 0; i < 30; i++) {
      const fx = this.baseWidth / 2 + (Math.random() - 0.5) * 220;
      const fy = topY - Math.random() * 150;
      this.particles.emit(fx, fy, '#ffd166', 20, false);
      this.particles.emit(fx, fy, '#38bdf8', 20, false);
      this.spriteEffects.push(new SparkleStar(fx, fy, 2.5));
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('tower_bloxx_highscore', this.highScore);
      } catch (e) {}
    }

    if (this.dom.victoryMenu) {
      if (this.dom.victoryScoreVal) this.dom.victoryScoreVal.textContent = this.score;
      if (this.dom.victoryPopVal) this.dom.victoryPopVal.textContent = `${this.population} 人`;
      if (this.dom.victoryComboVal) this.dom.victoryComboVal.textContent = `x${this.maxCombo}`;
      this.showElement(this.dom.victoryMenu, 'flex');
    }
  }

  // 无缝里程碑炫彩大绝招庆典 (不阻碍玩家无限盖楼!)
  triggerMilestoneCelebration(floorCount) {
    try {
      this.synth.playPerfect(12);
    } catch (e) {}
    this.haptics.vibratePerfect();

    // 奖励 500 居民与 2000 分
    this.population += 500;
    this.score += 2000;
    this.updateHUD();

    // 全屏发射 40 颗粒五彩星光与闪耀粒子
    const topY = this.baseHeight - 120 - this.tower.length * this.blockHeight + this.camera.y;
    for (let i = 0; i < 40; i++) {
      const fx = this.baseWidth / 2 + (Math.random() - 0.5) * 260;
      const fy = topY - Math.random() * 180;
      this.particles.emit(fx, fy, '#ffd166', 25, false);
      this.particles.emit(fx, fy, '#38bdf8', 25, false);
      this.particles.emit(fx, fy, '#4ade80', 25, false);
      this.spriteEffects.push(new SparkleStar(fx, fy, 3.0));
    }

    // 悬浮醒目金光里程碑通知
    this.floatingTexts.push(new FloatingText(
      this.baseWidth / 2,
      topY - 60,
      `✨ ${floorCount}F 摩天里程碑达成! (+500居民) ✨`,
      '#ffd166'
    ));

    // 楼体金光加固震屏
    this.triggerShake(8, 15);
  }

  // E3: 触发屏幕震动
  triggerShake(intensity, duration = 12) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
  }

  updateHUD() {
    this.dom.scoreVal.innerText = this.score;
    this.dom.heightVal.innerText = this.tower.length;
    this.dom.comboVal.innerText = `x${this.combo}`;
    if (this.dom.populationVal) this.dom.populationVal.innerText = this.population;
    
    if (this.combo > 0) {
      this.dom.comboText.style.animation = 'pulse 0.15s alternate 2';
    } else {
      this.dom.comboText.style.animation = 'none';
    }

    const hearts = this.dom.heartsContainer.querySelectorAll('.heart');
    hearts.forEach((heart, index) => {
      if (index < this.lives) {
        heart.classList.add('active');
      } else {
        heart.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // 物理帧循环更新
  // ==========================================================================
  update(dt) {
    // A4: 帧率无关物理缩放因子
    const dtFactor = Math.min(dt / 16.666, 3.0);

    // 楼体方块自由落体翻滚物理更新 (包括放偏失误与砸毁楼层，翻滚坠出屏幕下边缘销毁)
    if (this.collapseBlocks.length > 0) {
      for (let i = this.collapseBlocks.length - 1; i >= 0; i--) {
        const b = this.collapseBlocks[i];
        b.x += b.vx * dtFactor;
        b.y += b.vy * dtFactor;
        b.vy += 0.45 * dtFactor; // 真实重力加速度
        b.rot += (b.vRot || b.vr || 0.15) * dtFactor;

        // 翻滚坠出屏幕下方 200px 后安全销毁
        if (b.y > this.baseHeight + 200) {
          this.collapseBlocks.splice(i, 1);
        }
      }
    }

    // 1. 粒子物理更新
    this.particles.update();
    for (let i = this.spriteEffects.length - 1; i >= 0; i--) {
      this.spriteEffects[i].update(dt, this);
      if (!this.spriteEffects[i].active) {
        this.spriteEffects.splice(i, 1);
      }
    }
    this.jetX += 1.5 * dtFactor;
    if (this.jetX > this.baseWidth + 200) this.jetX = -200;
    this.propX -= 1.0 * dtFactor;
    if (this.propX < -200) this.propX = this.baseWidth + 200;

    // 2. 漂浮文本更新
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 3. 星星云朵视差流动 (性能优化：for 循环替代 forEach)
    const starLen = this.stars.length;
    for (let i = 0; i < starLen; i++) {
      const star = this.stars[i];
      star.alpha += star.twinkleSpeed * dtFactor;
      if (star.alpha > 1 || star.alpha < 0) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }
    }

    const cloudLen = this.clouds.length;
    for (let i = 0; i < cloudLen; i++) {
      const cloud = this.clouds[i];
      cloud.x += cloud.speed * dtFactor;
      if (cloud.x > this.baseWidth + 100) {
        cloud.x = -150;
      }
    }

    if (this.state !== 'PLAYING') return;

    // 4. 楼体晃动物理
    this.updateTowerSway(dtFactor);

    // 5. 吊车人控微摇与绳索物理衰减
    this.crane.time += this.crane.speed * dtFactor;
    // 绳索脱钩弹起反冲衰减
    this.crane.ropeStretch *= Math.pow(0.82, dtFactor);
    // 爪子张开动态归位
    const targetClaw = (this.fallingBlock || this.state !== 'PLAYING') ? 10 : 0;
    this.crane.clawSpread += (targetClaw - this.crane.clawSpread) * 0.15 * dtFactor;

    // 融入人工控操游隙与气流微摆 (双重谐波)
    const organicWobble = Math.sin(this.crane.time * 2.4) * 0.035;
    const swingModifier = Math.max(0.4, 1.2 - this.tower.length * 0.015);
    this.crane.angle = (Math.sin(this.crane.time) * this.crane.angleRange + organicWobble) * swingModifier;

    // 6. 摄像机纵向平滑过渡
    const dy = this.camera.targetY - this.camera.y;
    this.camera.y += dy * this.camera.ease * dtFactor;

    // 7. 下落方块重力物理检测
    if (this.fallingBlock) {
      const block = this.fallingBlock;
      block.vy += block.gravity * dtFactor;            // 重力加速度让小房子越落越快！
      block.y -= block.vy * dtFactor;                  // 纵向下落
      block.x += block.vx * dtFactor;                  // 水平微小惯性平移
      block.angle += block.vAngle * dtFactor;          // 空中姿态微摆
      block.angle *= Math.pow(0.92, dtFactor);         // 空气阻力矫正下落姿态

      let targetY = 0;
      if (this.tower.length > 0) {
        targetY = this.tower[this.tower.length - 1].y + this.blockHeight;
      }

      if (this.fallingBlock.y <= targetY) {
        this.fallingBlock.y = targetY;
        this.handleBlockLanding();
      }
    }
  }

  // 物理计算：楼顶左右摇摆幅度
  updateTowerSway(dtFactor = 1.0) {
    if (this.tower.length === 0) {
      this.towerSway.amplitude = 0;
      this.towerSway.offset = 0;
      return;
    }

    this.towerSway.time += this.towerSway.frequency * dtFactor;
    
    // 累积对齐误差生成晃动量
    let baseAmp = this.towerSway.instability * 0.9;
    
    // 风力晃动：楼层越高风越大
    const heightFactor = Math.max(0, (this.tower.length - 3) * 0.75);
    baseAmp += heightFactor;
    
    this.towerSway.amplitude = Math.min(100, baseAmp); // 最大偏移 100 像素

    // 计算实时正弦摇摆偏移
    this.towerSway.offset = this.towerSway.amplitude * Math.sin(this.towerSway.time);
  }

  // 方块落地物理结算
  handleBlockLanding() {
    const landing = this.fallingBlock;
    this.fallingBlock = null;

    let targetX = this.baseWidth / 2;
    let previousBlock = null;

    // 获取当前楼顶的晃动判定位置
    if (this.tower.length > 0) {
      previousBlock = this.tower[this.tower.length - 1];
      // 楼顶摆动比例是 1.0 (最后一层)
      const topSway = this.towerSway.offset;
      targetX = previousBlock.x + topSway;
    }

    const dx = landing.x - targetX;

    // 掉落判定限制 (第一层地基绝对安全，允许随意摆放)
    if (this.tower.length > 0) {
      const maxOffset = landing.w * 0.65;
      if (Math.abs(dx) >= maxOffset) {
        const groundY = this.baseHeight - 120;
        const landingScreenY = groundY - landing.y + this.camera.y;

        // 没对准放偏：直接翻滚脱落，一路疾速坠落出屏幕最底端！
        this.collapseBlocks.push({
          x: landing.x,
          y: landingScreenY,
          w: landing.w,
          h: landing.h,
          vx: dx > 0 ? 6.0 : -6.0,
          vy: Math.max(3.5, (landing.vy || 4) * 0.6), // 继承下落速度并继续加速下坠
          rot: landing.angle || 0,
          vr: dx > 0 ? 0.18 : -0.18
        });

        this.loseLife("方块完全没有对准，直接从高空坠落到底！");
        this.triggerShake(10, 14);
        this.floatingTexts.push(new FloatingText(landing.x, landingScreenY - 20, "MISSED!", '#ef4444', true));
        return;
      }
    }

    const isPerfect = Math.abs(dx) < 6;
    let blockOffsetX = dx;
    let scoreAdd = 50;

    const groundY = this.baseHeight - 120;
    const landingScreenY = groundY - landing.y + this.camera.y;

    if (isPerfect) {
      // 完美吸附
      blockOffsetX = 0;
      landing.x = targetX;
      
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      
      // A3: Perfect 落地奖励——衰减楼体不稳定性
      this.towerSway.instability = Math.max(0, this.towerSway.instability * 0.5 - 5);
      
      // Combo 得分加成：基准 100 分 + 连击奖励 (100 * Combo)
      const comboBonus = 100 * this.combo;
      scoreAdd = 100 + comboBonus;
      this.score += scoreAdd;
      
      this.synth.playPerfect(this.combo);
      this.haptics.vibratePerfect();
      
      // 添加酷炫的漂浮文字 Combo 效果和加成得分展示
      const textX = landing.x;
      const textY = landingScreenY - 20;
      this.floatingTexts.push(new FloatingText(textX, textY, `PERFECT!`, '#ffd166', true));
      this.floatingTexts.push(new FloatingText(textX, textY + 22, `COMBO x${this.combo} (+${scoreAdd})`, '#00f0ff', false));

      const particleColor = this.theme === 'retro' ? '#0f380f' : '#ffd166';
      this.particles.emit(landing.x, landingScreenY, particleColor, 25, this.theme === 'retro');
    } else {
      this.combo = 0;
      this.score += scoreAdd;
      
      this.synth.playLand();
      this.haptics.vibrateLand();

      // 对齐偏差叠加给重心晃动参数 (地基第一层不增加倾斜度)
      if (this.tower.length > 0) {
        const offsetRatio = Math.abs(dx) / landing.w;
        this.towerSway.instability += offsetRatio * 16;
      }

      // 漂浮普通得分文本
      const textX = landing.x;
      const textY = landingScreenY - 15;
      this.floatingTexts.push(new FloatingText(textX, textY, `OK! +${scoreAdd}`, '#ffffff', false));

      const particleColor = this.theme === 'retro' ? '#306230' : '#d2dae2';
      this.particles.emit(landing.x, landingScreenY, particleColor, 10, this.theme === 'retro');

      // 没放稳严重偏移判定 (重心不稳直接滑脱，沿楼体侧面一路翻滚坠落到屏幕最底端)
      if (this.tower.length > 0 && Math.abs(dx) > landing.w * 0.45) {
        const groundY = this.baseHeight - 120;
        const landingScreenY = groundY - landing.y + this.camera.y;

        // 本次没放稳的楼块直接翻滚滑落，一路坠落至屏幕最下方
        this.collapseBlocks.push({
          x: landing.x,
          y: landingScreenY,
          w: landing.w,
          h: landing.h,
          vx: dx > 0 ? 6.5 : -6.5,
          vy: 2.0,
          rot: landing.angle || 0,
          vr: dx > 0 ? 0.22 : -0.22
        });

        this.loseLife("房子没放稳失去平衡，从楼顶翻滚坠落了！");
        this.triggerShake(12, 18);
        this.particles.emit(landing.x, landingScreenY, '#ef4444', 25, this.theme === 'retro');
        this.particles.emitDust(landing.x, landingScreenY, '#64748b', this.theme === 'retro');
        this.floatingTexts.push(new FloatingText(landing.x, landingScreenY - 20, "UNSTABLE!", '#ef4444', true));
        return;
      }
    }

    // 触发方案 1 建筑撞击特效：接缝瞬间高光 + 电焊飞溅火花 + 横向扁平冲击波光环 (彻底替代旧版灰色爆炸烟雾)
    const isRetro = this.theme === 'retro';
    this.spriteEffects.push(new ContactSeamFlash(landing.x, landingScreenY, landing.w, isPerfect, isRetro));
    this.spriteEffects.push(new ImpactShockwave(landing.x, landingScreenY, landing.w, isPerfect, isRetro));
    this.spriteEffects.push(new WeldingSparkEmitter(landing.x, landingScreenY, landing.w, isPerfect, isRetro));

    if (isPerfect || this.combo > 0) {
      this.spriteEffects.push(new SparkleStar(landing.x, landingScreenY - landing.h/2, 2.5));
      this.spriteEffects.push(new GoldReinforceEffect(landing.x, landingScreenY, landing.w, landing.h));
    }

    // 触发居民降落伞入住动画 (3 ~ 5 名小居民随机自然分布在屋顶范畴内，绝不出界，呈现热气腾腾的生活气息!)
    const targetBlockIndex = this.tower.length;
    const resCount = isPerfect ? 5 : 3;
    const maxRoofOffset = landing.w * 0.36; // 80px * 0.36 = +/-28.8px 限制在屋顶安全范畴内
    for (let r = 0; r < resCount; r++) {
      const spreadRatio = resCount > 1 ? (r / (resCount - 1) - 0.5) : 0;
      const offsetX = spreadRatio * (maxRoofOffset * 1.6) + (Math.random() - 0.5) * 8;
      const startX = landing.x + offsetX + (Math.random() - 0.5) * 10;
      const startY = landingScreenY - 150 - Math.random() * 30;
      this.spriteEffects.push(new ResidentParachute(startX, startY, targetBlockIndex, offsetX));
    }

    // E4: 居民增加
    const popAdd = (isPerfect ? 80 : 40) + Math.floor(Math.random() * 20);
    this.population += popAdd;
    this.triggerShake(isPerfect ? 6 : 4, 10); // 落地打压震屏

    // 压入已固定的楼层列表
    this.tower.push({
      x: previousBlock ? previousBlock.x + blockOffsetX : targetX + blockOffsetX,
      y: landing.y,
      w: landing.w,
      h: landing.h,
      offsetX: blockOffsetX,
      landingAngle: landing.angle || (dx / landing.w * 0.25)
    });

    this.updateHUD();

    // 保持大气标准的 80px 宽度 (不再随高度缩窄挤压，保证舒展爽快盖楼体验)
    this.swingingBlock.w = this.blockWidth;

    // 摆动速度随高度轻微加快 (提供平滑递进的挑战感)
    this.crane.speed = 0.022 + Math.min(0.04, this.tower.length * 0.001);

    // 【镜头上升逻辑】：让摄像机平滑追踪最顶层的 Y 轴高度，留出空间盖新房子
    if (this.tower.length * this.blockHeight > 200) {
      this.camera.targetY = this.tower.length * this.blockHeight - 200;
    }

    // 【里程碑炫彩大绝招庆典】在 30F、50F、100F、150F... 无缝触发高能里程碑庆祝 (不锁死退出，玩家可无限高盖楼！!)
    if (this.tower.length === 30 || this.tower.length === 50 || (this.tower.length > 50 && this.tower.length % 50 === 0)) {
      this.triggerMilestoneCelebration(this.tower.length);
    }
  }

  // ==========================================================================
  // 画布绘制流程
  // ==========================================================================
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    const responsiveScale = this.dpr * (this.scaleFactor || 1);
    this.ctx.scale(responsiveScale, responsiveScale);

    // E3: 应用屏幕震动偏移
    if (this.screenShake.duration > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
      const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
      this.ctx.translate(shakeX, shakeY);
      this.screenShake.duration--;
    }

    // 1. 渐进式背景 (Sunset Park -> Day Sky -> Stratosphere -> Outer Space)
    this.drawBackground();

    // 2. 渲染云朵与星星 (带摄像机视差)
    this.drawParallaxStarsAndClouds();

    // 3. 渲染底座公园树木剪影 (渐进式)
    this.drawParkSilhouettes();

    // 4. 绘制叠好的黄色北欧楼体
    this.drawTower();

    // 4.5 绘制没放稳/滑脱翻滚坠落到底端的方块
    this.drawCollapseBlocks();

    // 5. 绘制坠落中的黄色楼层
    this.drawFallingBlock();

    // 6. 绘制顶部吊车系统与悬挂楼层
    this.drawCrane();

    // 7. 绘制粒子
    this.particles.draw(this.ctx);

    // 绘制基于 Sprite 的特效 (性能优化：for 循环)
    for (let i = 0; i < this.spriteEffects.length; i++) {
      this.spriteEffects[i].draw(this.ctx, this.loader);
    }

    // 8. 绘制 Combo 漂浮文字 (性能优化：for 循环)
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(this.ctx, 'Share Tech Mono', 'Outfit');
    }

    // 9. 绘制左下角原版风格楼层进度与居民数仪表盘
    this.drawBottomLeftHUD();

    // 9. 游戏结束成就徽章
    if (this.state === 'GAMEOVER') {
      let badgeName = 'badge_town';
      if (this.tower.length >= 35) badgeName = 'badge_megacity';
      else if (this.tower.length >= 20) badgeName = 'badge_metropolis';
      else if (this.tower.length >= 10) badgeName = 'badge_city';

      const badgeImg = this.loader.assets[badgeName];
      if (badgeImg && badgeImg.complete) {
        const bw = badgeImg.width * 2.5;
        const bh = badgeImg.height * 2.5;
        const bx = this.baseWidth / 2 - bw / 2;
        const by = this.baseHeight / 5;
        this.ctx.drawImage(badgeImg, bx, by, bw, bh);
      }
    }

    this.ctx.restore();
  }

  drawBackground() {
    const isRetro = this.theme === 'retro';
    if (isRetro) {
      this.ctx.fillStyle = '#9bbc0f';
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
      return;
    }

    const altitude = this.camera.y;

    // 6 大高度层级自然环境插值 (Park Ground -> Mid Air -> Stratosphere -> Near Orbit -> Deep Space -> Cosmic Nebula)
    let colorTop, colorBottom;

    if (altitude < 400) {
      const factor = altitude / 400;
      colorTop = this.interpolateColor('#82ccdd', '#60a3bc', factor);
      colorBottom = this.interpolateColor('#fad390', '#f6b93b', factor);
    } else if (altitude < 1000) {
      const factor = (altitude - 400) / 600;
      colorTop = this.interpolateColor('#60a3bc', '#1e3a8a', factor);
      colorBottom = this.interpolateColor('#f6b93b', '#60a3bc', factor);
    } else if (altitude < 1800) {
      const factor = (altitude - 1000) / 800;
      colorTop = this.interpolateColor('#1e3a8a', '#0f172a', factor);
      colorBottom = this.interpolateColor('#60a3bc', '#1e1b4b', factor);
    } else if (altitude < 3000) {
      const factor = (altitude - 1800) / 1200;
      colorTop = this.interpolateColor('#0f172a', '#03071e', factor);
      colorBottom = this.interpolateColor('#1e1b4b', '#0f172a', factor);
    } else {
      const factor = Math.min(1.0, (altitude - 3000) / 1500);
      colorTop = this.interpolateColor('#03071e', '#18002e', factor);
      colorBottom = this.interpolateColor('#0f172a', '#05020a', factor);
    }

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.baseHeight);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    this.ctx.save();
    
    // 【Zone 8: 6500+ 银河系外与漩涡星系 (Spiral Galaxy)】
    if (altitude > 5500) {
      const galY = this.baseHeight - 7500 + altitude * 0.92;
      this.drawHDVectorSpiralGalaxy(360, galY, 65);
    }

    // 【Zone 7: 4500 ~ 6500 深空引力透镜黑洞与外星人 UFO】
    if (altitude > 4200) {
      const bhY = this.baseHeight - 6200 + altitude * 0.9;
      this.drawHDVectorBlackHole(95, bhY, 42);

      const ufoY = this.baseHeight - 5100 + altitude * 0.9;
      this.drawHDVectorUFO(320, ufoY);
    }

    // 【Zone 6: 3000 ~ 4800 太阳耀斑与深空发光神鲸】
    if (altitude > 2600) {
      const sunY = this.baseHeight - 4400 + altitude * 0.88;
      this.drawHDVectorSun(380, sunY, 48);

      const whaleY = this.baseHeight - 3600 + altitude * 0.88;
      this.drawHDVectorSpaceWhale(this.baseWidth / 2, whaleY);
    }

    // 【Zone 5: 1800 ~ 3500 高空行星】超高清矢量海王星与 3D 光环土星
    if (altitude > 1600) {
      const nepY = this.baseHeight - 4000 + altitude * 0.85;
      this.drawHDVectorNeptune(350, nepY, 28);

      const satY = this.baseHeight - 3000 + altitude * 0.85;
      this.drawHDVectorSaturn(110, satY, 32);
    }

    // 【Zone 4: 1000 ~ 2400 近地轨道】超高清矢量月球与火星
    if (altitude > 800) {
      const marsY = this.baseHeight - 2400 + altitude * 0.8;
      this.drawHDVectorMars(390, marsY, 26);

      const moonY = this.baseHeight - 1700 + altitude * 0.8;
      this.drawHDVectorMoon(85, moonY, 38);
    }

    // 【Zone 2: 300 ~ 1200 城市高空区】超高清矢量喷气客机与复古双翼飞机
    if (altitude > 400 && altitude < 1400) {
      const jetY = this.baseHeight - 850 + altitude * 0.45;
      this.drawHDVectorJet(this.jetX, jetY);
    }

    if (altitude > 150 && altitude < 900) {
      const propY = this.baseHeight - 520 + altitude * 0.45;
      this.drawHDVectorBiplane(this.propX, propY);
    }

    // 【Zone 1: 0 ~ 300 地表远景天际线】远景 HD 2.5D 现代摩天大楼剪影
    if (altitude < 1200) {
      const skylineY = this.baseHeight - 120 + altitude * 0.25;
      
      this.ctx.save();
      // 后排暗蓝大楼群剪影
      this.ctx.fillStyle = '#012a4a';
      for (let bx = -20; bx < this.baseWidth + 40; bx += 45) {
        const bH = 65 + Math.sin(bx * 0.05) * 35;
        this.ctx.fillRect(bx, skylineY - bH, 40, bH + 120);
        
        // 大楼窗户发光点阵
        this.ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
        for (let wy = skylineY - bH + 8; wy < skylineY - 10; wy += 14) {
          this.ctx.fillRect(bx + 8, wy, 8, 5);
          this.ctx.fillRect(bx + 24, wy, 8, 5);
        }
        this.ctx.fillStyle = '#012a4a';
      }

      // 前排深蓝大楼群剪影
      this.ctx.fillStyle = '#014f86';
      for (let bx = 10; bx < this.baseWidth + 40; bx += 55) {
        const bH = 48 + Math.cos(bx * 0.08) * 28;
        this.ctx.fillRect(bx, skylineY - bH, 48, bH + 120);
      }
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // 100% 超高清矢量绘图组件集 (替代原本老旧像素图片)
  drawHDVectorMoon(x, y, radius) {
    this.ctx.save();
    // 大气微光 halo
    const haloGrad = this.ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.6);
    haloGrad.addColorStop(0, 'rgba(186, 230, 253, 0.4)');
    haloGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    this.ctx.fillStyle = haloGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
    this.ctx.fill();

    // 月球灰白渐变主面
    const moonGrad = this.ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
    moonGrad.addColorStop(0, '#f8fafc');
    moonGrad.addColorStop(0.6, '#cbd5e1');
    moonGrad.addColorStop(1, '#64748b');
    this.ctx.fillStyle = moonGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 灰白色环形山陨石坑 (Craters)
    this.ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    const craters = [
      { cx: -0.3, cy: -0.2, r: 0.22 },
      { cx: 0.2, cy: 0.3, r: 0.18 },
      { cx: 0.35, cy: -0.25, r: 0.14 },
      { cx: -0.1, cy: 0.4, r: 0.16 }
    ];
    craters.forEach(c => {
      const cx = x + c.cx * radius;
      const cy = y + c.cy * radius;
      const cr = c.r * radius;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  drawHDVectorMars(x, y, radius) {
    this.ctx.save();
    // 赤红火星大气暗红微光
    const haloGrad = this.ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.5);
    haloGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
    haloGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    this.ctx.fillStyle = haloGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 火星赤红沙丘球体
    const marsGrad = this.ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
    marsGrad.addColorStop(0, '#fca5a5');
    marsGrad.addColorStop(0.5, '#ef4444');
    marsGrad.addColorStop(1, '#991b1b');
    this.ctx.fillStyle = marsGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 北极白色极帽 (Polar Ice Cap)
    this.ctx.fillStyle = 'rgba(254, 242, 242, 0.85)';
    this.ctx.beginPath();
    this.ctx.arc(x, y - radius * 0.7, radius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawHDVectorSaturn(x, y, radius) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(-0.35);

    // 1. 环后侧半圈
    this.ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
    this.ctx.lineWidth = 14;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2.2, radius * 0.55, 0, Math.PI, Math.PI * 2);
    this.ctx.stroke();

    // 2. 土星金黄条纹球体
    const saturnGrad = this.ctx.createLinearGradient(0, -radius, 0, radius);
    saturnGrad.addColorStop(0, '#fef08a');
    saturnGrad.addColorStop(0.4, '#f59e0b');
    saturnGrad.addColorStop(0.7, '#d97706');
    saturnGrad.addColorStop(1, '#78350f');
    this.ctx.fillStyle = saturnGrad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. 环前侧半圈
    this.ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    this.ctx.lineWidth = 14;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2.2, radius * 0.55, 0, 0, Math.PI);
    this.ctx.stroke();

    // 4. 细分绚丽光环外边线
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2.4, radius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawHDVectorNeptune(x, y, radius) {
    this.ctx.save();
    // 冰蓝光晕
    const haloGrad = this.ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.5);
    haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    this.ctx.fillStyle = haloGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 海王星冰蓝球体
    const nepGrad = this.ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
    nepGrad.addColorStop(0, '#7dd3fc');
    nepGrad.addColorStop(0.5, '#0284c7');
    nepGrad.addColorStop(1, '#0369a1');
    this.ctx.fillStyle = nepGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 甲烷云带 (White Methane Bands)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - radius * 0.2, radius * 0.85, radius * 0.2, 0.1, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawHDVectorJet(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // 引擎双重白色凝结水汽尾迹 (Twin Vapor Contrails)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -4); this.ctx.lineTo(-140, -6);
    this.ctx.moveTo(-10, 4);  this.ctx.lineTo(-140, 6);
    this.ctx.stroke();

    // 银白超音速客机机身
    const fuselageGrad = this.ctx.createLinearGradient(0, -6, 0, 6);
    fuselageGrad.addColorStop(0, '#ffffff');
    fuselageGrad.addColorStop(0.5, '#e2e8f0');
    fuselageGrad.addColorStop(1, '#94a3b8');
    this.ctx.fillStyle = fuselageGrad;
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;

    // 机头与机身 Path
    this.ctx.beginPath();
    this.ctx.moveTo(35, 0); // 机尖
    this.ctx.bezierCurveTo(20, -5, -20, -5, -30, -4);
    this.ctx.lineTo(-30, 4);
    this.ctx.bezierCurveTo(-20, 5, 20, 5, 35, 0);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 后掠大后掠机翼 (Delta Wings)
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.beginPath();
    this.ctx.moveTo(5, -4);
    this.ctx.lineTo(-18, -26);
    this.ctx.lineTo(-24, -4);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(5, 4);
    this.ctx.lineTo(-18, 26);
    this.ctx.lineTo(-24, 4);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 尾翼 (Tail Fin)
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(-22, -4);
    this.ctx.lineTo(-32, -16);
    this.ctx.lineTo(-30, -4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawHDVectorBiplane(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(-1, 1); // 水平翻转：使机头朝向左侧 (匹配 propX 减小的飞行方向)，横幅向右拖尾！

    // 拖尾醒目彩旗 (Trailing Celebration Banner)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(-25, 0);
    this.ctx.lineTo(-40, 0);
    this.ctx.stroke();

    // 欢庆横幅
    const bannerGrad = this.ctx.createLinearGradient(-110, -10, -40, 10);
    bannerGrad.addColorStop(0, '#f59e0b');
    bannerGrad.addColorStop(1, '#ef4444');
    this.ctx.fillStyle = bannerGrad;
    this.ctx.fillRect(-110, -10, 70, 20);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 9px sans-serif';
    this.ctx.fillText('TOWER BLOXX', -105, 4);

    // 复古黄色双翼机机身
    this.ctx.fillStyle = '#facc15';
    this.ctx.strokeStyle = '#713f12';
    this.ctx.lineWidth = 1.2;

    this.ctx.fillRect(-22, -5, 40, 10);
    
    // 上下双层翅膀 (Biplane Wings)
    this.ctx.fillStyle = '#eab308';
    this.ctx.fillRect(-8, -18, 20, 5);
    this.ctx.fillRect(-8, 13, 20, 5);

    // 旋转螺旋桨虚化光盘 (Rotating Propeller Blur)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    this.ctx.beginPath();
    this.ctx.ellipse(20, 0, 3, 16, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawHDVectorSpaceWhale(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // 星空巨鲸流光紫气 (Celestial Glow Halo)
    const whaleGrad = this.ctx.createRadialGradient(0, 0, 20, 0, 0, 70);
    whaleGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    whaleGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    this.ctx.fillStyle = whaleGrad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 70, 0, Math.PI * 2);
    this.ctx.fill();

    // 巨鲸紫罗兰流线型身躯 (Flying Space Whale Body)
    const bodyGrad = this.ctx.createLinearGradient(-60, 0, 60, 0);
    bodyGrad.addColorStop(0, '#3b0764');
    bodyGrad.addColorStop(0.5, '#7e22ce');
    bodyGrad.addColorStop(1, '#a855f7');
    this.ctx.fillStyle = bodyGrad;
    this.ctx.strokeStyle = '#e9d5ff';
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.moveTo(60, 0);
    this.ctx.bezierCurveTo(40, -25, -20, -25, -50, -5);
    this.ctx.bezierCurveTo(-70, -20, -85, -15, -95, 0);
    this.ctx.bezierCurveTo(-85, 15, -70, 20, -50, 5);
    this.ctx.bezierCurveTo(-20, 25, 40, 25, 60, 0);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 鲸腹星光嵌点 (Constellation Stars on Body)
    this.ctx.fillStyle = '#ffffff';
    const starsOnWhale = [{x: 25, y: -4}, {x: 0, y: 6}, {x: -25, y: -2}, {x: -45, y: 3}];
    starsOnWhale.forEach(st => {
      this.ctx.beginPath();
      this.ctx.arc(st.x, st.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  drawHDVectorSun(x, y, radius) {
    this.ctx.save();
    // 太阳强光日冕与耀斑光晕
    const sunHalo = this.ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 2.2);
    sunHalo.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    sunHalo.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
    sunHalo.addColorStop(1, 'rgba(245, 158, 11, 0)');
    this.ctx.fillStyle = sunHalo;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    this.ctx.fill();

    // 太阳核心球体 (耀眼金红渐变)
    const sunGrad = this.ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, radius * 0.1, x, y, radius);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.3, '#fef08a');
    sunGrad.addColorStop(0.7, '#f59e0b');
    sunGrad.addColorStop(1, '#ea580c');
    this.ctx.fillStyle = sunGrad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 太阳四散射线光芒 (Sunbeam Corona Rays)
    this.ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
    this.ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + Math.cos(a) * (radius * 1.1), y + Math.sin(a) * (radius * 1.1));
      this.ctx.lineTo(x + Math.cos(a) * (radius * 1.8), y + Math.sin(a) * (radius * 1.8));
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawHDVectorUFO(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // 霓虹绿吸取光束 (Alien Abduction Tractor Beam)
    const beamGrad = this.ctx.createLinearGradient(0, 0, 0, 120);
    beamGrad.addColorStop(0, 'rgba(74, 222, 128, 0.45)');
    beamGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
    this.ctx.fillStyle = beamGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(-12, 6);
    this.ctx.lineTo(-45, 120);
    this.ctx.lineTo(45, 120);
    this.ctx.lineTo(12, 6);
    this.ctx.closePath();
    this.ctx.fill();

    // 银白银色飞碟主体 (Saucer Body)
    const saucerGrad = this.ctx.createLinearGradient(-35, 0, 35, 0);
    saucerGrad.addColorStop(0, '#94a3b8');
    saucerGrad.addColorStop(0.5, '#f8fafc');
    saucerGrad.addColorStop(1, '#64748b');
    this.ctx.fillStyle = saucerGrad;
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 1.2;

    this.ctx.beginPath();
    this.ctx.ellipse(0, 4, 38, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // 飞碟透明玻璃驾驶舱 (Glass Cockpit Dome)
    const domeGrad = this.ctx.createRadialGradient(0, -6, 2, 0, -6, 16);
    domeGrad.addColorStop(0, 'rgba(186, 230, 253, 0.9)');
    domeGrad.addColorStop(1, 'rgba(14, 165, 233, 0.6)');
    this.ctx.fillStyle = domeGrad;
    this.ctx.beginPath();
    this.ctx.arc(0, -2, 16, Math.PI, 0);
    this.ctx.fill();
    this.ctx.stroke();

    // 驾驶舱内的绿皮萌趣外星人 (Cute Green Alien Pilot)
    this.ctx.fillStyle = '#4ade80';
    this.ctx.beginPath();
    this.ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
    this.ctx.fill();
    // 硕大黑色大眼
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(-2, -7, 1.5, 0, Math.PI * 2);
    this.ctx.arc(2, -7, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 飞碟四周霓虹发光警示灯点阵 (Pulsing Lights)
    [-24, -12, 0, 12, 24].forEach((lx, i) => {
      this.ctx.fillStyle = i % 2 === 0 ? '#4ade80' : '#f59e0b';
      this.ctx.beginPath();
      this.ctx.arc(lx, 6, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  drawHDVectorBlackHole(x, y, radius) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // 1. 引力透镜吸积盘 (Superheated Accretion Disk)
    this.ctx.rotate(0.4);
    const diskGrad = this.ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, radius * 2.6);
    diskGrad.addColorStop(0, '#ffffff');
    diskGrad.addColorStop(0.3, '#ffedd5');
    diskGrad.addColorStop(0.6, '#f97316');
    diskGrad.addColorStop(0.85, '#06b6d4');
    diskGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    this.ctx.fillStyle = diskGrad;

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2.6, radius * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. 绝对黑洞视界 (Event Horizon Black Core)
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // 3. 纯白光子球环 (Photon Sphere Ring)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 1, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawHDVectorSpiralGalaxy(x, y, radius) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(0.2);

    // 旋涡星系紫色紫罗兰光晕
    const galGrad = this.ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 2.0);
    galGrad.addColorStop(0, '#ffffff');
    galGrad.addColorStop(0.3, '#c084fc');
    galGrad.addColorStop(0.7, '#38bdf8');
    galGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    this.ctx.fillStyle = galGrad;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2.0, radius * 0.8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 双重旋臂 (Spiral Arms)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 3;
    for (let arm = 0; arm < 2; arm++) {
      this.ctx.beginPath();
      const startAngle = arm * Math.PI;
      for (let a = 0; a < Math.PI * 2.5; a += 0.1) {
        const r = (a / (Math.PI * 2.5)) * radius * 1.8;
        const gx = Math.cos(startAngle + a) * r;
        const gy = Math.sin(startAngle + a) * r * 0.4;
        if (a === 0) this.ctx.moveTo(gx, gy);
        else this.ctx.lineTo(gx, gy);
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawSpriteWithParallax(name, worldX, worldY, parallaxFactor, scale) {
    const scrollY = this.camera.y;
    const groundY = this.baseHeight - 120;
    const drawY = groundY - worldY + scrollY * (1 - parallaxFactor); 
    
    if (drawY < -200 || drawY > this.baseHeight + 200) return;

    const img = this.loader.assets[name];
    if (img && img.complete) {
      this.ctx.drawImage(img, worldX - (img.width * scale)/2, drawY, img.width * scale, img.height * scale);
    }
  }

  // 极速预解析 RGB 缓存（彻底避免每帧字符串 Substring 消耗，超级提升 60FPS 渲染性能）
  parseHexColor(hex) {
    if (!this._colorCache) this._colorCache = {};
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return [128, 128, 128];
    if (!this._colorCache[hex]) {
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      this._colorCache[hex] = [r, g, b];
    }
    return this._colorCache[hex];
  }

  interpolateColor(color1, color2, factor) {
    factor = factor < 0 ? 0 : (factor > 1 ? 1 : factor);
    const c1 = this.parseHexColor(color1);
    const c2 = this.parseHexColor(color2);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
    return `rgb(${r},${g},${b})`;
  }

  // 绘制左下角原版风格楼层目标进度与居民数仪表盘
  drawBottomLeftHUD() {
    if (this.state !== 'PLAYING') return;

    this.ctx.save();
    
    const panelX = 14;
    const panelY = this.baseHeight - 210;
    const panelW = 90;
    const panelH = 185;

    // 1. 半透明毛玻璃暗色容器底座
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.5;
    this.drawRoundedRect(panelX, panelY, panelW, panelH, 10);
    this.ctx.fill();
    this.ctx.stroke();

    let targetFloors = 50;
    if (this.tower.length >= 50) targetFloors = Math.ceil((this.tower.length + 1) / 50) * 50;

    // 2. 顶端“楼层”标识
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`TARGET ${targetFloors}F`, panelX + panelW / 2, panelY + 16);

    // 3. 立体高度进度条槽
    const meterX = panelX + 16;
    const meterY = panelY + 26;
    const meterW = 12;
    const meterH = 110;

    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    this.drawRoundedRect(meterX, meterY, meterW, meterH, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // 充能发光刻度条
    const progress = Math.min(1.0, (this.tower.length % 50) / 50 || (this.tower.length > 0 ? 1.0 : 0));
    const fillH = meterH * progress;
    if (fillH > 0) {
      const fillGrad = this.ctx.createLinearGradient(0, meterY + meterH, 0, meterY);
      fillGrad.addColorStop(0, '#38bdf8');
      fillGrad.addColorStop(0.7, '#ffd166');
      fillGrad.addColorStop(1, '#ef4444');

      this.ctx.fillStyle = fillGrad;
      this.drawRoundedRect(meterX + 1.5, meterY + meterH - fillH + 1.5, meterW - 3, Math.max(3, fillH - 3), 4);
      this.ctx.fill();
    }

    // 右侧数值标签
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${this.tower.length}`, panelX + 36, panelY + 50);

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText(`/${targetFloors} 层`, panelX + 36, panelY + 66);

    // 4. 底部居民人数小图标 + 人数数值
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(panelX + 8, panelY + 145);
    this.ctx.lineTo(panelX + panelW - 8, panelY + 145);
    this.ctx.stroke();

    // 人员图标 (使用解压出的 ui_population_icon 或矢量小人)
    const popImg = this.loader.assets['ui_population_icon'];
    if (popImg && popImg.complete) {
      this.ctx.drawImage(popImg, panelX + 12, panelY + 152, 10, 24);
    } else {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(panelX + 16, panelY + 158, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#ffd166';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${this.population}`, panelX + 28, panelY + 168);

    this.ctx.restore();
  }

  // 100% 超高清矢量北欧公园地表元素绘制 (剔除旧版低分辨率贴图)
  drawParkSilhouettes() {
    if (this.theme === 'retro') return;

    const scrollY = this.camera.y;
    if (scrollY > this.baseHeight + 100) return;

    this.ctx.save();
    const alpha = Math.max(0, 1.0 - scrollY / 450);
    this.ctx.globalAlpha = alpha;

    const groundY = this.baseHeight - 120;
    const drawY = groundY + scrollY;

    // 1. HD 现代金属公园护栏
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, drawY - 18);
    this.ctx.lineTo(this.baseWidth, drawY - 18);
    this.ctx.moveTo(0, drawY - 6);
    this.ctx.lineTo(this.baseWidth, drawY - 6);
    for (let x = 10; x < this.baseWidth; x += 18) {
      this.ctx.moveTo(x, drawY - 24);
      this.ctx.lineTo(x, drawY);
    }
    this.ctx.stroke();

    // 2. HD 矢量多重北欧冷空松树 (清晰精致层叠，性能优化：for 循环)
    const treeLen = this.parkTrees.length;
    for (let i = 0; i < treeLen; i++) {
      const tree = this.parkTrees[i];
      const tx = tree.x;
      const ty = drawY;

      // 树干
      this.ctx.fillStyle = '#331800';
      this.ctx.fillRect(tx - 3, ty - 45, 6, 45);

      // 树冠层叠渐变绿 (超高清矢量松树)
      const treeGrad = this.ctx.createLinearGradient(tx - 25, ty - 85, tx + 25, ty - 20);
      treeGrad.addColorStop(0, '#52b788');
      treeGrad.addColorStop(0.5, '#2d6a4f');
      treeGrad.addColorStop(1, '#1b4332');
      this.ctx.fillStyle = treeGrad;

      this.ctx.beginPath();
      // 上中下三层锥形树冠
      this.ctx.moveTo(tx, ty - 90); this.ctx.lineTo(tx - 15, ty - 65); this.ctx.lineTo(tx + 15, ty - 65); this.ctx.closePath(); this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty - 75); this.ctx.lineTo(tx - 22, ty - 45); this.ctx.lineTo(tx + 22, ty - 45); this.ctx.closePath(); this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty - 55); this.ctx.lineTo(tx - 28, ty - 25); this.ctx.lineTo(tx + 28, ty - 25); this.ctx.closePath(); this.ctx.fill();
    }

    // 3. HD 暖黄街灯 (英伦风灯光晕)
    for (let lx = 60; lx < this.baseWidth; lx += 180) {
      // 街灯杆
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(lx - 2, drawY - 55, 4, 55);
      
      // 灯罩
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(lx, drawY - 55, 6, 0, Math.PI * 2);
      this.ctx.fill();

      // 暖黄色光晕
      const haloGrad = this.ctx.createRadialGradient(lx, drawY - 55, 1, lx, drawY - 55, 25);
      haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      haloGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      this.ctx.fillStyle = haloGrad;
      this.ctx.beginPath();
      this.ctx.arc(lx, drawY - 55, 25, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawParallaxStarsAndClouds() {
    const isRetro = this.theme === 'retro';
    if (isRetro) return;

    const altitude = this.camera.y;

    // 星星在高度达到平流层之后，亮度逐渐调到最亮
    const starAlphaMultiplier = Math.min(1.0, altitude / 700);

    if (starAlphaMultiplier > 0.05) {
      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      const starLen = this.stars.length;
      for (let i = 0; i < starLen; i++) {
        const star = this.stars[i];
        // 星星产生 0.12 倍的微小纵向视差
        const startYWorld = star.y + this.camera.y * 0.12;
        let drawY = ((startYWorld % this.baseHeight) + this.baseHeight) % this.baseHeight;
        
        this.ctx.globalAlpha = star.alpha * starAlphaMultiplier;
        this.ctx.beginPath();
        this.ctx.arc(star.x, drawY, star.size, 0, TWO_PI);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 云朵云气视差 (在较低层和天空层显示，到太空后渐隐)
    const cloudAlphaMultiplier = Math.max(0.0, 1.0 - (altitude - 600) / 1200);

    if (cloudAlphaMultiplier > 0.02) {
      const cloudLen = this.clouds.length;
      for (let i = 0; i < cloudLen; i++) {
        const cloud = this.clouds[i];
        const cloudYWorld = cloud.y + this.camera.y * 0.4; // 视差拉伸系数 0.4
        let drawY = ((cloudYWorld % (this.baseHeight + 100)) + (this.baseHeight + 100)) % (this.baseHeight + 100) - 50;

        this.ctx.save();
        this.ctx.globalAlpha = 0.28 * cloudAlphaMultiplier;
        this.ctx.fillStyle = '#ffffff';
        
        this.ctx.beginPath();
        const cx = cloud.x;
        const cy = drawY;
        const r = 24 * cloud.scale;
        this.ctx.arc(cx, cy, r, 0, TWO_PI);
        this.ctx.arc(cx + r*1.2, cy - r*0.2, r*0.8, 0, TWO_PI);
        this.ctx.arc(cx - r*1.0, cy + r*0.1, r*0.7, 0, TWO_PI);
        this.ctx.arc(cx + r*0.5, cy + r*0.2, r*0.9, 0, TWO_PI);
        this.ctx.fill();
        
        this.ctx.restore();
      }
    }
  }

  // 绘制大楼塔
  drawTower() {
    const isRetro = this.theme === 'retro';
    const groundY = this.baseHeight - 120;

    // 地基平台 (地表) 渲染
    this.ctx.save();
    this.ctx.fillStyle = isRetro ? '#0f380f' : '#27ae60';
    
    const groundDrawY = groundY + this.camera.y;
    this.ctx.fillRect(0, groundDrawY, this.baseWidth, 120);

    if (!isRetro) {
      this.ctx.fillStyle = '#3e2723';
      this.ctx.fillRect(0, groundDrawY + 6, this.baseWidth, 114);
    }
    this.ctx.restore();

    // 遍历绘制每一层北欧风格楼房 (性能优化：for 循环)
    const towerLen = this.tower.length;
    for (let idx = 0; idx < towerLen; idx++) {
      const block = this.tower[idx];
      const swayFactor = Math.pow((idx + 1) / towerLen, 1.5);
      const currentBlockSway = this.towerSway.offset * swayFactor;

      const drawX = block.x + currentBlockSway;
      const drawY = groundY - (idx + 1) * block.h + this.camera.y;

      // 超出屏幕下边或上边的楼层视口裁剪，直接跳过 (极速 60FPS 性能!)
      if (drawY > this.baseHeight + 100 || drawY < -100) continue;

      const blockAngle = block.landingAngle || (this.towerSway.offset * 0.005);
      this.drawScandinavianBlock(drawX, drawY, block.w, block.h, isRetro, idx, blockAngle);
    }

    // 🌟 【高能连击金光护罩 (Golden Energy Field)】连击 >= 3 时，全塔两侧环绕流金脉冲柱！
    if (this.combo >= 3 && this.tower.length > 0 && !isRetro) {
      this.ctx.save();
      const topIdx = this.tower.length - 1;
      const topBlock = this.tower[topIdx];
      const topY = groundY - (topIdx + 1) * topBlock.h + this.camera.y;
      const towerH = this.tower.length * this.blockHeight;

      const auraGrad = this.ctx.createLinearGradient(0, topY, 0, topY + towerH);
      auraGrad.addColorStop(0, 'rgba(255, 209, 102, 0.7)');
      auraGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.35)');
      auraGrad.addColorStop(1, 'rgba(255, 209, 102, 0)');

      this.ctx.strokeStyle = auraGrad;
      this.ctx.lineWidth = 3.5;
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#ffd166';

      // 左侧发光能量柱
      this.ctx.beginPath();
      this.ctx.moveTo(topBlock.x - topBlock.w / 2 - 6, topY - 10);
      this.ctx.lineTo(topBlock.x - topBlock.w / 2 - 6, topY + towerH);
      this.ctx.stroke();

      // 右侧发光能量柱
      this.ctx.beginPath();
      this.ctx.moveTo(topBlock.x + topBlock.w / 2 + 6, topY - 10);
      this.ctx.lineTo(topBlock.x + topBlock.w / 2 + 6, topY + towerH);
      this.ctx.stroke();

      this.ctx.restore();
    }

    // E1: 仅在游戏结束 (GAMEOVER) 楼房封顶时，给最高层画封顶屋顶盖 (Roof Cap)
    if (this.state === 'GAMEOVER' && this.tower.length > 0) {
      const topIdx = this.tower.length - 1;
      const topBlock = this.tower[topIdx];
      const topSway = this.towerSway.offset * Math.pow((topIdx + 1) / this.tower.length, 1.5);
      const topX = topBlock.x + topSway;
      const topY = groundY - (topIdx + 1) * topBlock.h + this.camera.y;

      const deluxeRoofImg = this.loader.assets['roof_tops_deluxe'];
      if (deluxeRoofImg && deluxeRoofImg.complete && !isRetro) {
        // 4 种颜色的 Deluxe 3D 金字塔/俯视屋顶 (蓝、红、绿、黄)
        const frameIdx = topIdx % 4;
        const fw = 28;
        const fh = 28;
        const scale = (topBlock.w * 0.9) / fw;
        const roofDrawW = fw * scale;
        const roofDrawH = fh * scale;
        this.ctx.drawImage(
          deluxeRoofImg,
          frameIdx * fw, 0, fw, fh,
          topX - roofDrawW / 2, topY - roofDrawH * 0.75,
          roofDrawW, roofDrawH
        );
      } else {
        const isRed = this.tower.length % 2 === 0;
        const variant = this.tower.length % 4;
        const roofName = isRed ? 'roof_red_variants' : 'roof_yellow_variants';
        const roofImg = this.loader.assets[roofName];
        
        if (roofImg && roofImg.complete && !isRetro && this.tower.length > 2) {
          const fw = isRed ? 22 : 25;
          const fh = isRed ? 22 : 25;
          const scale = topBlock.w / fw; 
          this.ctx.drawImage(roofImg, variant * fw, 0, fw, fh, topX - topBlock.w/2, topY - fh * scale, fw * scale, fh * scale);
        } else {
          this.ctx.save();
          this.ctx.fillStyle = isRetro ? '#0f380f' : '#ff6b6b';
          this.ctx.beginPath();
          this.ctx.moveTo(topX - 14, topY);
          this.ctx.lineTo(topX, topY - 20);
          this.ctx.lineTo(topX + 14, topY);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.restore();
        }
      }
    }
  }

  // 绘制下落中楼层 (真实物理下落：包含目标楼顶投影、速度风噪拖尾、下落倾角)
  drawFallingBlock() {
    if (!this.fallingBlock) return;
    const block = this.fallingBlock;
    const isRetro = this.theme === 'retro';
    const groundY = this.baseHeight - 120;
    
    const drawY = this.baseHeight - 120 - block.h - block.y + this.camera.y;

    // 1. 绘制目标楼顶的接触预判动态阴影 (Target Roof Impact Shadow)
    let targetY = 0;
    if (this.tower.length > 0) {
      targetY = this.tower[this.tower.length - 1].y + this.blockHeight;
    }
    const targetScreenY = groundY - targetY + this.camera.y;
    const distToTarget = Math.max(0, block.y - targetY);
    const maxDist = 350;
    const shadowFactor = Math.max(0, 1 - distToTarget / maxDist);

    if (shadowFactor > 0.05) {
      this.ctx.save();
      const shadowW = block.w * (0.5 + shadowFactor * 0.5);
      const shadowH = 8 * shadowFactor;
      this.ctx.fillStyle = isRetro ? 'rgba(15, 56, 15, 0.4)' : 'rgba(0, 0, 0, 0.35)';
      this.ctx.beginPath();
      this.ctx.ellipse(block.x, targetScreenY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 2. 绘制下落高速风噪拖尾线 (High-speed Motion Blur Trail)
    if (!isRetro && block.vy > 6) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i += 2) {
        const lx = block.x + (i * block.w * 0.35);
        const trailLen = Math.min(35, block.vy * 2.2);
        this.ctx.beginPath();
        this.ctx.moveTo(lx, drawY + block.h / 2);
        this.ctx.lineTo(lx, drawY + block.h / 2 - trailLen);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // 3. 带有脱钩倾斜角与姿态下落的小房子
    this.ctx.save();
    this.ctx.translate(block.x, drawY + block.h / 2);
    this.ctx.rotate(block.angle || 0);
    this.drawScandinavianBlock(0, -block.h / 2, block.w, block.h, isRetro, 999, 0);
    this.ctx.restore();
  }

  // 绘制没放稳/失稳坠落到底端的物理方块 (支持实时翻滚、重力下坠全过程渲染)
  drawCollapseBlocks() {
    if (!this.collapseBlocks || this.collapseBlocks.length === 0) return;
    const isRetro = this.theme === 'retro';
    for (let i = 0; i < this.collapseBlocks.length; i++) {
      const block = this.collapseBlocks[i];
      this.ctx.save();
      this.ctx.translate(block.x, block.y);
      this.ctx.rotate(block.rot || 0);
      this.drawScandinavianBlock(0, 0, block.w, block.h, isRetro, 999, block.rot || 0);
      this.ctx.restore();
    }
  }

  // 绘制诺基亚原版 2.5D 伪立体建筑单元 (走心与精致渲染)
  // viewAngle: 当前视角偏转角 (负 = 看到左侧面, 正 = 看到右侧面)
  drawScandinavianBlock(x, y, w, h, isRetro, idx, viewAngle) {
    this.ctx.save();

    // 动态透视参数：根据视角偏转角计算侧面可见宽度与顶面偏移
    const angle = viewAngle || 0;
    const maxSideW = 14;    // 最大侧面宽度
    const maxDepthY = 10;   // 最大顶面向上偏移

    // 侧面宽度随角度线性变化 (角度越大侧面越宽)
    const sideW = Math.abs(Math.sin(angle)) * maxSideW;
    const depthDir = angle >= 0 ? 1 : -1;
    const depthX = sideW * depthDir;
    const depthY = Math.abs(Math.sin(angle)) * maxDepthY + 4; // 保底 4px 深度

    // 方块左右边界
    const lx = x - w / 2;
    const rx = x + w / 2;

    // ======= 复古模式 =======
    if (isRetro) {
      if (sideW > 0.5) {
        this.ctx.fillStyle = '#306230';
        this.ctx.strokeStyle = '#0f380f';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        if (depthDir > 0) {
          this.ctx.moveTo(rx, y); this.ctx.lineTo(rx + sideW, y - depthY);
          this.ctx.lineTo(rx + sideW, y + h - depthY); this.ctx.lineTo(rx, y + h);
        } else {
          this.ctx.moveTo(lx, y); this.ctx.lineTo(lx - sideW, y - depthY);
          this.ctx.lineTo(lx - sideW, y + h - depthY); this.ctx.lineTo(lx, y + h);
        }
        this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
      }
      this.ctx.fillStyle = '#9bbc0f';
      this.ctx.strokeStyle = '#0f380f';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(lx, y);
      this.ctx.lineTo(lx + depthX, y - depthY);
      this.ctx.lineTo(rx + depthX, y - depthY);
      this.ctx.lineTo(rx, y);
      this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
      
      this.ctx.fillStyle = '#8bac0f';
      this.ctx.fillRect(lx, y, w, h);
      this.ctx.strokeRect(lx, y, w, h);

      const rWinW = Math.max(8, Math.floor(w * 0.18));
      const rWinH = Math.max(12, Math.floor(h * 0.4));
      this.ctx.fillStyle = '#0f380f';
      this.ctx.fillRect(x - rWinW - 3, y + (h - rWinH) / 2, rWinW, rWinH);
      this.ctx.fillRect(x + 3, y + (h - rWinH) / 2, rWinW, rWinH);
      this.ctx.restore();
      return;
    }

    // ======= 走心高质感诺基亚 2.5D 配色 =======
    const frontBase = '#00a896';    // 主墙体靓丽湖青
    const topColor = '#48cae4';     // 顶面受光高亮
    const sideColor = '#014f86';    // 侧面深邃蓝色
    const outlineColor = '#03045e'; // 经典深蓝包边

    this.ctx.strokeStyle = outlineColor;
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    // 下落发光
    if (idx === 999) {
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = '#00f0ff';
    }

    // ======= 1. 侧面 (背光深蓝) =======
    if (sideW > 0.5) {
      const gradSide = this.ctx.createLinearGradient(
        depthDir > 0 ? rx : lx - sideW, y,
        depthDir > 0 ? rx + sideW : lx, y + h
      );
      gradSide.addColorStop(0, '#014f86');
      gradSide.addColorStop(1, '#012a4a');
      this.ctx.fillStyle = gradSide;

      this.ctx.beginPath();
      if (depthDir > 0) {
        this.ctx.moveTo(rx, y);
        this.ctx.lineTo(rx + sideW, y - depthY);
        this.ctx.lineTo(rx + sideW, y + h - depthY);
        this.ctx.lineTo(rx, y + h);
      } else {
        this.ctx.moveTo(lx, y);
        this.ctx.lineTo(lx - sideW, y - depthY);
        this.ctx.lineTo(lx - sideW, y + h - depthY);
        this.ctx.lineTo(lx, y + h);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }

    // ======= 2. 顶面 (受光亮面) =======
    const gradTop = this.ctx.createLinearGradient(lx, y - depthY, rx, y);
    gradTop.addColorStop(0, '#90e0ef');
    gradTop.addColorStop(1, topColor);
    this.ctx.fillStyle = gradTop;

    this.ctx.beginPath();
    this.ctx.moveTo(lx, y);
    this.ctx.lineTo(lx + depthX, y - depthY);
    this.ctx.lineTo(rx + depthX, y - depthY);
    this.ctx.lineTo(rx, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 顶面精致细香槟金边 (合并为单次 beginPath + stroke)
    this.ctx.strokeStyle = '#ffd166';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(lx, y);
    this.ctx.lineTo(lx + depthX, y - depthY);
    this.ctx.moveTo(rx, y);
    this.ctx.lineTo(rx + depthX, y - depthY);
    this.ctx.moveTo(lx + depthX, y - depthY);
    this.ctx.lineTo(rx + depthX, y - depthY);
    this.ctx.stroke();

    // ======= 3. 正面墙体 (带渐变 + 建筑线纹 + 金属铆钉) =======
    this.ctx.shadowBlur = 0;
    const gradFront = this.ctx.createLinearGradient(lx, y, lx, y + h);
    gradFront.addColorStop(0, '#028090');
    gradFront.addColorStop(0.4, frontBase);
    gradFront.addColorStop(1, '#05668d');
    this.ctx.fillStyle = gradFront;
    this.ctx.fillRect(lx, y, w, h);
    this.ctx.strokeRect(lx, y, w, h);

    // 外墙水平建材缝隙分割线 (精细纹理)
    this.ctx.strokeStyle = 'rgba(3, 4, 94, 0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(lx + 2, y + h * 0.33);
    this.ctx.lineTo(rx - 2, y + h * 0.33);
    this.ctx.moveTo(lx + 2, y + h * 0.66);
    this.ctx.lineTo(rx - 2, y + h * 0.66);
    this.ctx.stroke();

    // 正面顶精细香槟金护栏饰条 (纤细 3.5px)
    const gradRoof = this.ctx.createLinearGradient(lx, y, rx, y);
    gradRoof.addColorStop(0, '#fff3b0');
    gradRoof.addColorStop(0.3, '#ffd166');
    gradRoof.addColorStop(0.7, '#e2b050');
    gradRoof.addColorStop(1, '#ddb892');
    this.ctx.fillStyle = gradRoof;
    this.ctx.strokeStyle = outlineColor;
    this.ctx.lineWidth = 1.2;
    this.ctx.fillRect(lx, y - 1, w, 3.5);
    this.ctx.strokeRect(lx, y - 1, w, 3.5);

    // 护栏上的金属加固铆钉 (Corner rivets)
    this.ctx.fillStyle = '#03045e';
    this.ctx.fillRect(lx + 1, y, 1.5, 1.5);
    this.ctx.fillRect(rx - 2.5, y, 1.5, 1.5);

    // 饰条下方暗部阴影
    this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this.ctx.fillRect(lx, y + 3, w, 1.5);

    // ======= 4. 走心双窗户 =======
    const windowW = Math.max(10, Math.floor(w * 0.22));
    const windowH = Math.max(14, Math.floor(h * 0.44));
    const wy = y + (h - windowH) / 2 + 3;
    this.drawSingleWindow(x - windowW - 4, wy, windowW, windowH, idx);
    this.drawSingleWindow(x + 4, wy, windowW, windowH, idx + 1);

    this.ctx.restore();
  }

  // 辅助函数：走心窗户绘制 (白色立体框 + 窗台底座 + 玻璃高光 + 斜向光泽，性能优化：由父级统一管理 save/restore)
  drawSingleWindow(x, y, w, h, animationSeed) {
    // 1. 窗户下方的黑蓝色窗台 ledge
    this.ctx.fillStyle = '#012a4a';
    this.ctx.fillRect(x - 2, y + h + 1, w + 4, 3);

    // 2. 3D 白色外窗框
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    this.ctx.strokeStyle = '#03045e';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

    // 3. 玻璃颜料与灯光
    let isLit = this.camera.y > 500 && animationSeed % 3 === 0;
    const glassGrad = this.ctx.createLinearGradient(x, y, x, y + h);
    if (isLit) {
      glassGrad.addColorStop(0, '#fef08a');
      glassGrad.addColorStop(1, '#f59e0b');
    } else {
      glassGrad.addColorStop(0, '#93c5fd');
      glassGrad.addColorStop(1, '#2563eb');
    }
    this.ctx.fillStyle = glassGrad;
    this.ctx.fillRect(x, y, w, h);

    // 4. 玻璃对角线高光 Sheen Slash (极具光泽感)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + w * 0.45, y);
    this.ctx.lineTo(x + w * 0.15, y + h);
    this.ctx.lineTo(x, y + h);
    this.ctx.closePath();
    this.ctx.fill();

    // 5. 田字窗格框架
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + w / 2, y);
    this.ctx.lineTo(x + w / 2, y + h);
    this.ctx.moveTo(x, y + h / 2);
    this.ctx.lineTo(x + w, y + h / 2);
    this.ctx.stroke();
  }

  // 绘制吊架、主钢索、加长 4 角动态吊索与超高清重工业金属吊钩
  drawCrane() {
    const isRetro = this.theme === 'retro';
    
    const trolleyX = this.baseWidth / 2 + Math.sin(this.crane.angle) * 22;
    const currentRopeLen = this.crane.length + this.crane.ropeStretch;
    
    const swingX = trolleyX + Math.sin(this.crane.angle) * currentRopeLen;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * currentRopeLen;

    this.ctx.save();

    // 1. HD 2.5D 重工业钢结构桁架塔吊臂 (100% 矢量重绘替代老图)
    if (!isRetro) {
      const boomY = this.crane.pivotY - 22;
      const boomW = this.baseWidth * 0.94;
      const boomX = (this.baseWidth - boomW) / 2;
      const boomH = 16;

      // 吊臂主梁体 (暗色重工业钢构渐变)
      const boomGrad = this.ctx.createLinearGradient(boomX, boomY, boomX, boomY + boomH);
      boomGrad.addColorStop(0, '#475569');
      boomGrad.addColorStop(0.5, '#1e293b');
      boomGrad.addColorStop(1, '#0f172a');
      this.ctx.fillStyle = boomGrad;
      this.ctx.strokeStyle = '#020617';
      this.ctx.lineWidth = 1.5;
      this.drawRoundedRect(boomX, boomY, boomW, boomH, 3);
      this.ctx.fill();
      this.ctx.stroke();

      // 顶部黄黑醒目工业警示条纹 (Industrial Safety Stripes)
      const stripeW = 10;
      this.ctx.save();
      this.ctx.beginPath();
      this.drawRoundedRect(boomX + 1, boomY + 1, boomW - 2, boomH - 2, 2);
      this.ctx.clip();
      for (let sx = boomX - 20; sx < boomX + boomW + 20; sx += stripeW * 2) {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.moveTo(sx, boomY);
        this.ctx.lineTo(sx + stripeW, boomY);
        this.ctx.lineTo(sx + stripeW - 5, boomY + 4);
        this.ctx.lineTo(sx - 5, boomY + 4);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();

      // 钢结构 K 形斜撑格构 (HD Lattice Struts)
      this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      for (let lx = boomX + 12; lx < boomX + boomW - 12; lx += 22) {
        this.ctx.moveTo(lx, boomY + 4);
        this.ctx.lineTo(lx + 11, boomY + boomH - 4);
        this.ctx.lineTo(lx + 22, boomY + 4);
      }
      this.ctx.stroke();

      // 吊臂两端红色高空航空障碍警示灯 (Aviation Warning Light)
      [boomX + 6, boomX + boomW - 6].forEach(lx => {
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(lx, boomY - 2, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        const lightHalo = this.ctx.createRadialGradient(lx, boomY - 2, 1, lx, boomY - 2, 10);
        lightHalo.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
        lightHalo.addColorStop(1, 'rgba(239, 68, 68, 0)');
        this.ctx.fillStyle = lightHalo;
        this.ctx.beginPath();
        this.ctx.arc(lx, boomY - 2, 10, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    // 2. 主悬挂高强度重工业钢索 (4.0px 加粗粗缆绳 + 1.2px 钢芯高光，完美匹配吊钩)
    this.ctx.strokeStyle = isRetro ? '#0f380f' : '#0f172a';
    this.ctx.lineWidth = isRetro ? 4.5 : 4.0;
    this.ctx.beginPath();
    this.ctx.moveTo(trolleyX, this.crane.pivotY - 15);
    this.ctx.lineTo(swingX, swingY - 18);
    this.ctx.stroke();

    if (!isRetro) {
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(trolleyX, this.crane.pivotY - 15);
      this.ctx.lineTo(swingX, swingY - 18);
      this.ctx.stroke();
    }

    this.ctx.restore();

    // 3. 绘制悬挂中的 2.5D 小房子 (下移至 swingY + 58，提供逼真的 40px 加长吊绳空间)
    if (!this.fallingBlock && this.state === 'PLAYING') {
      const block = this.swingingBlock;
      const houseY = swingY + 58;
      this.drawScandinavianBlock(swingX, houseY, block.w, block.h, isRetro, 999, this.crane.angle);

      // 4. 【精准 4 角工业吊索 + 动态物理弯曲张力动画】
      if (!isRetro) {
        const angle = this.crane.angle || 0;
        const maxSideW = 14;
        const maxDepthY = 10;
        const sideW = Math.abs(Math.sin(angle)) * maxSideW;
        const depthDir = angle >= 0 ? 1 : -1;
        const depthX = sideW * depthDir;
        const depthY = Math.abs(Math.sin(angle)) * maxDepthY + 4;

        const lx = swingX - block.w / 2;
        const rx = swingX + block.w / 2;
        const yTop = houseY;

        // 钩爪内嘴精准起点 (与 drawHDMetallicHook 的爪口坐标 (0, 18) 100% 重合匹配)
        const hookTipX = swingX;
        const hookTipY = swingY + 18;

        // 动态物理惯性弧度参数 (随摆动速度弹性弯曲)
        const swingVel = Math.cos(this.crane.time || 0) * 12;
        const flexX = swingVel * 0.15;

        this.ctx.save();
        this.ctx.lineCap = 'round';

        const corners = [
          { x: lx, y: yTop },                          // 前左角
          { x: rx, y: yTop },                          // 前右角
          { x: lx + depthX, y: yTop - depthY },        // 后左角 (3D 透视)
          { x: rx + depthX, y: yTop - depthY }         // 后右角 (3D 透视)
        ];

        // 绘制 4 根加长高强度编织钢丝吊索
        corners.forEach(c => {
          const midX = (hookTipX + c.x) / 2 + flexX;
          const midY = (hookTipY + c.y) / 2;

          // 钢丝暗色主干线
          this.ctx.strokeStyle = '#1e293b';
          this.ctx.lineWidth = 1.8;
          this.ctx.beginPath();
          this.ctx.moveTo(hookTipX, hookTipY);
          this.ctx.quadraticCurveTo(midX, midY, c.x, c.y);
          this.ctx.stroke();

          // 钢丝金属光泽高光线 (提升工业质感)
          this.ctx.strokeStyle = '#94a3b8';
          this.ctx.lineWidth = 0.8;
          this.ctx.beginPath();
          this.ctx.moveTo(hookTipX, hookTipY);
          this.ctx.quadraticCurveTo(midX, midY, c.x, c.y);
          this.ctx.stroke();
        });

        this.ctx.restore();
      }
    }

    // 5. 置顶绘制【超高清矢量金属吊钩】 (精准咬合在 4 根吊绳交汇处)
    if (!isRetro) {
      this.drawHDMetallicHook(swingX, swingY, this.crane.angle);
    } else {
      this.ctx.fillStyle = '#0f380f';
      this.ctx.fillRect(swingX - 4, swingY + 14, 8, 6);
    }
  }

  // 辅助函数：超高清矢量重绘重工业金属吊钩 (带黄铜轴承、铸钢弧线与金属高光)
  drawHDMetallicHook(x, y, angle) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle * 0.3); // 吊钩跟随摆角微倾
    this.ctx.scale(0.82, 0.82);   // 精细缩放 18%，使其更加紧凑干练，与加粗钢绳完美比例配对！

    // 1. 顶部连接滑轮套件 (Dark Steel Pulley Block)
    const blockGrad = this.ctx.createLinearGradient(-10, -22, 10, 0);
    blockGrad.addColorStop(0, '#475569');
    blockGrad.addColorStop(0.5, '#1e293b');
    blockGrad.addColorStop(1, '#0f172a');
    this.ctx.fillStyle = blockGrad;
    this.ctx.strokeStyle = '#020617';
    this.ctx.lineWidth = 1.5;
    
    // 滑轮方盒框
    this.ctx.beginPath();
    this.drawRoundedRect(-9, -22, 18, 18, 3);
    this.ctx.fill();
    this.ctx.stroke();

    // 黄铜主轴承铆钉 (Brass Bearing Rivet)
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.strokeStyle = '#78350f';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, -13, 4.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#fef08a';
    this.ctx.beginPath();
    this.ctx.arc(-1.5, -14.5, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. 锻钢吊钩弧形钩爪主体 (Forged Heavy Steel Hook Shank & Mouth)
    const hookGrad = this.ctx.createLinearGradient(-14, -4, 14, 28);
    hookGrad.addColorStop(0, '#64748b');
    hookGrad.addColorStop(0.3, '#334155');
    hookGrad.addColorStop(0.7, '#1e293b');
    hookGrad.addColorStop(1, '#0f172a');

    this.ctx.fillStyle = hookGrad;
    this.ctx.strokeStyle = '#020617';
    this.ctx.lineWidth = 1.8;
    this.ctx.lineJoin = 'round';

    // 绘制标准重工业 G 形吊钩 Path
    this.ctx.beginPath();
    this.ctx.moveTo(-4, -4);
    this.ctx.lineTo(-4, 4);
    // 钩弧外侧
    this.ctx.bezierCurveTo(-14, 6, -14, 24, 0, 26);
    this.ctx.bezierCurveTo(12, 28, 15, 14, 7, 8);
    // 钩爪内侧嘴 (爪口中点精准位于 (0, 18))
    this.ctx.bezierCurveTo(4, 12, 4, 18, -1, 18);
    this.ctx.bezierCurveTo(-7, 18, -6, 8, 4, -4);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 3. 吊钩金属高光划痕 (Steel Specular Highlight)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.bezierCurveTo(-11, 8, -11, 20, -2, 24);
    this.ctx.stroke();

    // 4. 安全防脱锁扣 (Spring Safety Latch)
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(3, 2);
    this.ctx.lineTo(-2, 16);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // 圆角矩形辅助算法
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // 画布缩放自适应尺寸计算
  resizeCanvas() {
    const parent = this.canvas.parentElement;
    let parentWidth = parent ? parent.clientWidth : 0;
    let parentHeight = parent ? parent.clientHeight : 0;

    // 如果因为样式文件未完成加载，导致获取的 clientWidth 或 clientHeight 为 0
    if (parentWidth === 0 || parentHeight === 0) {
      parentWidth = Math.min(window.innerWidth, 480);
      parentHeight = Math.min(window.innerHeight, 850);
      setTimeout(() => this.resizeCanvas(), 500);
    }

    // 计算逻辑 480 宽度到实际设备容器屏幕宽度的自适应比例 Factor
    this.scaleFactor = parentWidth / this.baseWidth;

    this.canvas.width = parentWidth * this.dpr;
    this.canvas.height = parentHeight * this.dpr;

    this.canvas.style.width = `${parentWidth}px`;
    this.canvas.style.height = `${parentHeight}px`;
    
    this.ctx.imageSmoothingEnabled = true; // 开启抗锯齿，使窗户和白线极其平滑
  }

  // 主循环
  loop(timestamp) {
    // D2: 页面隐藏时暂停逻辑
    if (this._pageHidden || !this.assetsLoaded) {
      requestAnimationFrame(this.loop);
      return;
    }

    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}

// 启动挂载 (兼顾 DOMContentLoaded 与 readyState 已就绪的情况)
function initGameEngine() {
  if (!window.gameInstance) {
    window.gameInstance = new TowerBloxxGame();
    window.gameInstance.assetsLoaded = true;
    if (window.gameInstance.loader) {
      window.gameInstance.loader.loadAll(() => {
        window.gameInstance.assetsLoaded = true;
      });
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGameEngine);
} else {
  initGameEngine();
}

// --------------------------------------------------------------------------
// 全局直连按钮点击防死锁回调 (保证无论任何环境/引擎状态，点击按钮 100% 毫秒级关弹窗)
// --------------------------------------------------------------------------
window.startGameDirectly = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const startMenu = document.getElementById('start-menu');
  if (startMenu) {
    startMenu.classList.add('hidden');
    startMenu.style.display = 'none';
    startMenu.style.opacity = '0';
    startMenu.style.pointerEvents = 'none';
    startMenu.style.visibility = 'hidden';
  }
  const gameOver = document.getElementById('game-over-screen');
  if (gameOver) {
    gameOver.classList.add('hidden');
    gameOver.style.display = 'none';
  }
  const victory = document.getElementById('victory-menu');
  if (victory) {
    victory.classList.add('hidden');
    victory.style.display = 'none';
  }
  const hudOverlay = document.getElementById('hud-overlay');
  if (hudOverlay) {
    hudOverlay.classList.remove('hidden');
    hudOverlay.style.display = 'flex';
    hudOverlay.style.opacity = '1';
  }
  const tapHint = document.getElementById('tap-instruction');
  if (tapHint) {
    tapHint.classList.remove('hidden');
    tapHint.style.display = 'block';
  }
  if (!window.gameInstance) {
    window.gameInstance = new TowerBloxxGame();
  }
  window.gameInstance.startGame();
};

window.openSettingsDirectly = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const startMenu = document.getElementById('start-menu');
  if (startMenu) startMenu.style.display = 'none';
  const settingsMenu = document.getElementById('settings-menu');
  if (settingsMenu) {
    settingsMenu.classList.remove('hidden');
    settingsMenu.style.display = 'flex';
    settingsMenu.style.opacity = '1';
  }
  if (window.gameInstance) window.gameInstance.openSettings();
};

window.closeSettingsDirectly = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const settingsMenu = document.getElementById('settings-menu');
  if (settingsMenu) settingsMenu.style.display = 'none';
  const startMenu = document.getElementById('start-menu');
  if (startMenu) {
    startMenu.classList.remove('hidden');
    startMenu.style.display = 'flex';
    startMenu.style.opacity = '1';
  }
  if (window.gameInstance) window.gameInstance.closeSettings();
};

window.goHomeDirectly = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  ['game-over-screen', 'pause-menu', 'victory-menu', 'settings-menu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const startMenu = document.getElementById('start-menu');
  if (startMenu) {
    startMenu.classList.remove('hidden');
    startMenu.style.display = 'flex';
    startMenu.style.opacity = '1';
    startMenu.style.pointerEvents = 'auto';
    startMenu.style.visibility = 'visible';
  }
  if (window.gameInstance) window.gameInstance.goHome();
};
