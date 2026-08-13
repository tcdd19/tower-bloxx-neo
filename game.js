/**
 * ==========================================================================
 * TOWER BLOXX NEO - 游戏核心引擎 (第二阶段：核心机制改进与视觉升级)
 * ==========================================================================
 */

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

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    
    if (this.themeRetro) {
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    if (this.themeRetro) {
      ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
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
    
    this.assetsLoaded = false;
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
      populationVal: document.getElementById('population-val')
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
      let handled = false;
      const handler = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (handled) return;
        handled = true;
        setTimeout(() => { handled = false; }, 300);
        fn();
      };
      btn.addEventListener('click', handler);
      btn.addEventListener('touchend', handler);
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
  }

  hideElement(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  startGame() {
    try {
      this.synth.init();
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
    this.particles.clear();
    this.floatingTexts = [];
    this.spriteEffects = [];
    
    this.swingingBlock = {
      w: this.blockWidth,
      h: this.blockHeight
    };
    this.crane.speed = 0.022;
    
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
    
    this.showElement(this.dom.hudOverlay, 'flex');
    this.showElement(this.dom.tapInstruction, 'block');
    
    this.updateHUD();
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
    this.hideElement(this.dom.hudOverlay);
    this.hideElement(this.dom.tapInstruction);
    this.showElement(this.dom.startMenu, 'flex');
    this.updateHighScoreDisplay();
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
    const worldY = groundY - (swingY + 12) - this.swingingBlock.h + this.camera.y;

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

    // E2: GAMEOVER 楼体坍塌物理更新
    if (this.state === 'GAMEOVER' && this.collapseBlocks.length > 0) {
      this.collapseBlocks.forEach(b => {
        b.x += b.vx * dtFactor;
        b.y += b.vy * dtFactor;
        b.vy += 0.4 * dtFactor; // 重力加速度
        b.rot += b.vRot * dtFactor;
      });
    }

    // 1. 粒子物理更新
    this.particles.update();
    for (let i = this.spriteEffects.length - 1; i >= 0; i--) {
      this.spriteEffects[i].update(dt);
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

    // 3. 星星云朵视差流动
    this.stars.forEach(star => {
      star.alpha += star.twinkleSpeed * dtFactor;
      if (star.alpha > 1 || star.alpha < 0) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }
    });

    this.clouds.forEach(cloud => {
      cloud.x += cloud.speed * dtFactor;
      if (cloud.x > this.baseWidth + 100) {
        cloud.x = -150;
      }
    });

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
      const maxOffset = landing.w * 0.8;
      if (Math.abs(dx) >= maxOffset) {
        this.loseLife("方块没有对准，直接从楼顶坠落了！");
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

      // 歪楼扣血判定 (第一层地基不扣血)
      if (this.tower.length > 0 && Math.abs(dx) > landing.w * 0.55) {
        this.loseLife("房子歪的太厉害，楼体剧烈颤动！");
      }
    }

    if (isPerfect || this.combo > 0) {
      this.spriteEffects.push(new SparkleStar(landing.x, landingScreenY - landing.h/2, 2.5));
      this.spriteEffects.push(new GoldReinforceEffect(landing.x, landingScreenY, landing.w, landing.h));
    }
    this.spriteEffects.push(new SpriteDustPuff(landing.x, landingScreenY, 2.5));

    // E4: 居民增加
    const popAdd = Math.floor(Math.random() * 50) + 30;
    this.population += popAdd;
    this.triggerShake(5, 10); // 落地打压震屏
    
    // 触发烟尘效果
    const dustColor = this.theme === 'retro' ? '#0f380f' : '#cbd5e1';
    this.particles.emitDust(landing.x, landingScreenY, dustColor, this.theme === 'retro');

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

    // 随高度轻微变窄
    const minWidth = 40;
    const newWidth = Math.max(minWidth, this.blockWidth - this.tower.length * 1.2);
    this.swingingBlock.w = newWidth;

    // 摆动速度随高度轻微加快
    this.crane.speed = 0.022 + Math.min(0.04, this.tower.length * 0.001);

    // 【镜头上升逻辑】：让摄像机平滑追踪最顶层的 Y 轴高度，留出空间盖新房子
    if (this.tower.length * this.blockHeight > 200) {
      this.camera.targetY = this.tower.length * this.blockHeight - 200;
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

    // 5. 绘制坠落中的黄色楼层
    this.drawFallingBlock();

    // 6. 绘制顶部吊车系统与悬挂楼层
    this.drawCrane();

    // 7. 绘制粒子
    this.particles.draw(this.ctx);

    // 绘制基于 Sprite 的特效
    this.spriteEffects.forEach(effect => effect.draw(this.ctx, this.loader));

    // 8. 绘制 Combo 漂浮文字
    this.floatingTexts.forEach(txt => txt.draw(this.ctx, 'Share Tech Mono', 'Outfit'));

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

    // 我们通过高度插值四个高度段的背景颜色组合
    let colorTop, colorBottom;

    if (altitude < 500) {
      const factor = altitude / 500;
      colorTop = this.interpolateColor('#82ccdd', '#60a3bc', factor);
      colorBottom = this.interpolateColor('#fad390', '#f6b93b', factor);
    } else if (altitude < 1200) {
      const factor = (altitude - 500) / 700;
      colorTop = this.interpolateColor('#60a3bc', '#0c2461', factor);
      colorBottom = this.interpolateColor('#f6b93b', '#60a3bc', factor);
    } else if (altitude < 2200) {
      const factor = (altitude - 1200) / 1000;
      colorTop = this.interpolateColor('#0c2461', '#0a0d1a', factor);
      colorBottom = this.interpolateColor('#60a3bc', '#0c2461', factor);
    } else {
      const factor = Math.min(1.0, (altitude - 2200) / 1500);
      colorTop = this.interpolateColor('#0a0d1a', '#020205', factor);
      colorBottom = this.interpolateColor('#0c2461', '#06070c', factor);
    }

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.baseHeight);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    this.ctx.save();
    
    this.drawSpriteWithParallax('bg_flying_whales', this.baseWidth / 2, 4000, 0.05, 2.0);
    this.drawSpriteWithParallax('space_neptune', 350, 4500, 0.1, 2.0);
    this.drawSpriteWithParallax('space_saturn', 100, 3500, 0.1, 2.0);
    this.drawSpriteWithParallax('space_mars', 400, 2500, 0.1, 2.0);
    this.drawSpriteWithParallax('space_moon', 80, 1800, 0.1, 2.0);

    this.drawSpriteWithParallax('bg_cloud_c', 150, 600, 0.2, 2.5);
    this.drawSpriteWithParallax('bg_cloud_b', 350, 800, 0.25, 2.5);
    this.drawSpriteWithParallax('bg_cloud_a', 100, 1000, 0.3, 2.5);
    
    if (altitude > 400 && altitude < 1200) {
      const jetY = this.baseHeight - 800 + altitude * 0.4;
      const img = this.loader.assets['bg_jet_plane'];
      if (img && img.complete) {
        this.ctx.drawImage(img, this.jetX, jetY, 45 * 2.5, 14 * 2.5);
      }
    }

    if (altitude > 200 && altitude < 800) {
      const propY = this.baseHeight - 500 + altitude * 0.4;
      const img = this.loader.assets['bg_propeller_plane'];
      if (img && img.complete) {
        this.ctx.drawImage(img, this.propX, propY, 103 * 2.5, 9 * 2.5);
      }
    }

    if (altitude < 1000) {
      const mntImg = this.loader.assets['bg_mountains'];
      if (mntImg && mntImg.complete) {
        const mntW = 59 * 3;
        const mntH = 12 * 3;
        const mntY = this.baseHeight - 120 - mntH + altitude * 0.3;
        for (let x = -50; x < this.baseWidth + 50; x += mntW) {
          this.ctx.drawImage(mntImg, x, mntY, mntW, mntH);
        }
      }
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

  // A5+D1: 颜色插值优化（钳位 + 减少 GC 分配）
  interpolateColor(color1, color2, factor) {
    factor = Math.max(0, Math.min(1, factor));
    const r1 = parseInt(color1.slice(1,3), 16), g1 = parseInt(color1.slice(3,5), 16), b1 = parseInt(color1.slice(5,7), 16);
    const r2 = parseInt(color2.slice(1,3), 16), g2 = parseInt(color2.slice(3,5), 16), b2 = parseInt(color2.slice(5,7), 16);
    return `rgb(${Math.round(r1+(r2-r1)*factor)},${Math.round(g1+(g2-g1)*factor)},${Math.round(b1+(b2-b1)*factor)})`;
  }

  drawParkSilhouettes() {
    if (this.theme === 'retro') return;

    const scrollY = this.camera.y;
    if (scrollY > this.baseHeight + 50) return;

    this.ctx.save();
    const alpha = Math.max(0, 1.0 - scrollY / 450);
    this.ctx.globalAlpha = alpha;

    const groundY = this.baseHeight - 120;
    const drawY = groundY + scrollY; 

    const fenceImg = this.loader.assets['bg_fence'];
    if (fenceImg && fenceImg.complete) {
      const fW = 33 * 2.5;
      const fH = 34 * 2.5;
      for (let x = 0; x < this.baseWidth; x += fW) {
        this.ctx.drawImage(fenceImg, x, drawY - fH, fW, fH);
      }
    }

    const treeImg = this.loader.assets['bg_tree'];
    if (treeImg && treeImg.complete) {
      const tW = 51 * 2.5;
      const tH = 48 * 2.5;
      this.parkTrees.forEach(tree => {
        this.ctx.drawImage(treeImg, tree.x - tW/2, drawY - tH + 5, tW, tH);
      });
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
      this.stars.forEach(star => {
        // 星星产生 0.12 倍的微小纵向视差
        const startYWorld = star.y + this.camera.y * 0.12;
        let drawY = ((startYWorld % this.baseHeight) + this.baseHeight) % this.baseHeight;
        
        this.ctx.globalAlpha = star.alpha * starAlphaMultiplier;
        this.ctx.beginPath();
        this.ctx.arc(star.x, drawY, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.restore();
    }

    // 云朵云气视差 (在较低层和天空层显示，到太空后渐隐)
    const cloudAlphaMultiplier = Math.max(0.0, 1.0 - (altitude - 600) / 1200);

    if (cloudAlphaMultiplier > 0.02) {
      this.clouds.forEach(cloud => {
        const cloudYWorld = cloud.y + this.camera.y * 0.4; // 视差拉伸系数 0.4
        let drawY = ((cloudYWorld % (this.baseHeight + 100)) + (this.baseHeight + 100)) % (this.baseHeight + 100) - 50;

        this.ctx.save();
        this.ctx.globalAlpha = 0.28 * cloudAlphaMultiplier;
        this.ctx.fillStyle = '#ffffff';
        
        this.ctx.beginPath();
        const cx = cloud.x;
        const cy = drawY;
        const r = 24 * cloud.scale;
        this.ctx.arc(cx, cy, r, 0, Math.PI*2);
        this.ctx.arc(cx + r*1.2, cy - r*0.2, r*0.8, 0, Math.PI*2);
        this.ctx.arc(cx - r*1.0, cy + r*0.1, r*0.7, 0, Math.PI*2);
        this.ctx.arc(cx + r*0.5, cy + r*0.2, r*0.9, 0, Math.PI*2);
        this.ctx.fill();
        
        this.ctx.restore();
      });
    }
  }

  // 绘制大楼塔
  drawTower() {
    const isRetro = this.theme === 'retro';
    const groundY = this.baseHeight - 120;

    // E2: 游戏结束倒塌状态渲染
    if (this.state === 'GAMEOVER' && this.collapseBlocks.length > 0) {
      this.collapseBlocks.forEach((block, idx) => {
        this.ctx.save();
        this.ctx.translate(block.x, block.y);
        this.ctx.rotate(block.rot);
        this.drawScandinavianBlock(0, 0, block.w, block.h, isRetro, idx);
        this.ctx.restore();
      });
      return;
    }

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

    // 遍历绘制每一层北欧风格楼房
    this.tower.forEach((block, idx) => {
      const swayFactor = Math.pow((idx + 1) / this.tower.length, 1.5);
      const currentBlockSway = this.towerSway.offset * swayFactor;

      const drawX = block.x + currentBlockSway;
      const drawY = groundY - (idx + 1) * block.h + this.camera.y;

      if (drawY > this.baseHeight + 100) return;

      const blockAngle = block.landingAngle || (this.towerSway.offset * 0.005);
      this.drawScandinavianBlock(drawX, drawY, block.w, block.h, isRetro, idx, blockAngle);
    });

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
    const roofColor = '#ffb703';    // 温暖金黄房檐饰条

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

    // 顶面金黄边缘饰条
    this.ctx.fillStyle = roofColor;
    this.ctx.beginPath();
    if (depthDir >= 0) {
      this.ctx.moveTo(lx, y);
      this.ctx.lineTo(lx + depthX, y - depthY);
      this.ctx.lineTo(lx + depthX + 6, y - depthY);
      this.ctx.lineTo(lx + 6, y);
    } else {
      this.ctx.moveTo(rx, y);
      this.ctx.lineTo(rx + depthX, y - depthY);
      this.ctx.lineTo(rx + depthX - 6, y - depthY);
      this.ctx.lineTo(rx - 6, y);
    }
    this.ctx.closePath();
    this.ctx.fill();

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

    // 正面顶黄色护栏饰条 (带金黄渐变 + 金属压边)
    const gradRoof = this.ctx.createLinearGradient(lx, y, rx, y);
    gradRoof.addColorStop(0, '#ffe5ec');
    gradRoof.addColorStop(0.2, '#ffd166');
    gradRoof.addColorStop(0.8, '#ffb703');
    gradRoof.addColorStop(1, '#fb8500');
    this.ctx.fillStyle = gradRoof;
    this.ctx.strokeStyle = outlineColor;
    this.ctx.lineWidth = 1.5;
    this.ctx.fillRect(lx, y - 1, w, 5);
    this.ctx.strokeRect(lx, y - 1, w, 5);

    // 护栏上的金属加固铆钉 (Corner rivets)
    this.ctx.fillStyle = '#03045e';
    this.ctx.fillRect(lx + 1, y + 1, 2, 2);
    this.ctx.fillRect(rx - 3, y + 1, 2, 2);

    // 饰条下方暗部阴影
    this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
    this.ctx.fillRect(lx, y + 5, w, 2);

    // ======= 4. 走心双窗户 =======
    const windowW = Math.max(10, Math.floor(w * 0.22));
    const windowH = Math.max(14, Math.floor(h * 0.44));
    const wy = y + (h - windowH) / 2 + 3;
    this.drawSingleWindow(x - windowW - 4, wy, windowW, windowH, idx);
    this.drawSingleWindow(x + 4, wy, windowW, windowH, idx + 1);

    this.ctx.restore();
  }

  // 辅助函数：走心窗户绘制 (白色立体框 + 窗台底座 + 玻璃高光 + 斜向光泽)
  drawSingleWindow(x, y, w, h, animationSeed) {
    this.ctx.save();

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

    this.ctx.restore();
  }

  // 绘制吊架、钢索与置顶吊钩 (置前渲染，吊钩抓握在房子前面)
  drawCrane() {
    const isRetro = this.theme === 'retro';
    
    const trolleyX = this.baseWidth / 2 + Math.sin(this.crane.angle) * 22;
    const currentRopeLen = this.crane.length + this.crane.ropeStretch;
    
    const swingX = trolleyX + Math.sin(this.crane.angle) * currentRopeLen;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * currentRopeLen;

    this.ctx.save();

    // 1. 吊车桁架臂
    if (!isRetro) {
      const boomImg = this.loader.assets['crane_boom_arm'];
      if (boomImg && boomImg.complete) {
        const boomW = 169 * 2.5;
        const boomH = 10 * 2.5;
        this.ctx.drawImage(boomImg, this.baseWidth / 2 - boomW / 2, this.crane.pivotY - 20, boomW, boomH);
      }
    }

    // 2. 钢索
    this.ctx.strokeStyle = isRetro ? '#0f380f' : '#1e293b';
    this.ctx.lineWidth = isRetro ? 3.5 : 3;
    this.ctx.beginPath();
    this.ctx.moveTo(trolleyX, this.crane.pivotY - 15);
    this.ctx.lineTo(swingX, swingY + 10);
    this.ctx.stroke();

    this.ctx.restore();

    // 3. 【置前顺序 1】：先绘制悬挂中的小房子
    if (!this.fallingBlock && this.state === 'PLAYING') {
      const block = this.swingingBlock;
      this.drawScandinavianBlock(swingX, swingY + 25, block.w, block.h, isRetro, 999, this.crane.angle);
    }

    // 4. 【置前顺序 2】：后绘制吊钩 (将吊钩渲染在小房子前面，吊钩扣在小房子前护栏上！)
    this.ctx.save();
    if (!isRetro) {
      const hookImg = this.loader.assets['crane_hook_frames'];
      if (hookImg && hookImg.complete) {
        this.ctx.save();
        this.ctx.translate(swingX, swingY + 12);
        const totalFrames = 5;
        let normalizedAngle = (this.crane.angle + this.crane.angleRange) / (2 * this.crane.angleRange);
        normalizedAngle = Math.max(0, Math.min(1, normalizedAngle));
        let frameIndex = Math.floor(normalizedAngle * totalFrames);
        if (frameIndex >= totalFrames) frameIndex = totalFrames - 1;

        const fw = 22;
        const fh = 19;
        const scale = 2.5;
        // 吊钩位于小房子前面，紧紧抓扣在屋顶黄色饰条上
        this.ctx.drawImage(hookImg, frameIndex * fw, 0, fw, fh, -fw*scale/2, -fh*scale/2 + 2, fw*scale, fh*scale);
        this.ctx.restore();
      }
    } else {
      this.ctx.fillStyle = '#0f380f';
      this.ctx.fillRect(swingX - 4, swingY + 10, 8, 6);
    }
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
    window.gameInstance.loader.loadAll(() => {
      window.gameInstance.assetsLoaded = true;
    });
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGameEngine);
} else {
  initGameEngine();
}
