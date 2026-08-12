/**
 * ==========================================================================
 * TOWER BLOXX NEO - 游戏核心引擎 (第二阶段：核心机制改进与视觉升级)
 * ==========================================================================
 */

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

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count = 15, themeRetro = false) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, themeRetro));
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
    
    // 吊车与绳子参数
    this.crane = {
      pivotX: 0,
      pivotY: 65,
      length: 140,
      angle: 0,
      angleRange: Math.PI / 4.5,
      speed: 0.022,
      time: 0
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

    // 算出悬挂绳底端的世界坐标系 (包含摄像机镜头移动偏移的 Y 值)
    const swingX = this.baseWidth / 2 + Math.sin(this.crane.angle) * this.crane.length;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * this.crane.length;
    
    // A2: 修复释放瞬间坐标偏移，需包含吊钩偏移量(+12)与方块高度
    const groundY = this.baseHeight - 120;
    const worldY = groundY - (swingY + 12) - this.swingingBlock.h + this.camera.y;

    this.fallingBlock = {
      x: swingX,
      y: worldY,
      vy: 12, // 匀速下落物理速度
      w: this.swingingBlock.w,
      h: this.swingingBlock.h
    };

    this.dom.tapInstruction.classList.add('hidden');
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
    this.synth.playGameOver();
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

    this.dom.gameOverReasonText.innerText = reason;
    this.dom.finalScoreVal.innerText = `${this.score} (${this.population} 居民)`;
    this.dom.finalHeightVal.innerText = `${this.tower.length} 层`;
    this.dom.maxComboVal.innerText = `x${this.maxCombo}`;

    this.dom.hudOverlay.classList.add('hidden');
    this.dom.gameOverScreen.classList.remove('hidden');
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

    // 5. 吊车摆动更新 (正弦平滑摆动 + dt 缩放)
    this.crane.time += this.crane.speed * dtFactor;
    const swingModifier = Math.max(0.4, 1.2 - this.tower.length * 0.015);
    this.crane.angle = Math.sin(this.crane.time) * this.crane.angleRange * swingModifier;

    // 6. 摄像机纵向平滑过渡
    const dy = this.camera.targetY - this.camera.y;
    this.camera.y += dy * this.camera.ease * dtFactor;

    // 7. 下落方块物理检测
    if (this.fallingBlock) {
      this.fallingBlock.y -= this.fallingBlock.vy * dtFactor; // dtFactor 缩放下落
      
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

    // E4: 居民增加
    const popAdd = Math.floor(Math.random() * 50) + 30;
    this.population += popAdd;
    this.triggerShake(4, 8); // E3: 普通落地微震

    // 压入已固定的楼层列表
    this.tower.push({
      x: previousBlock ? previousBlock.x + blockOffsetX : targetX + blockOffsetX,
      y: landing.y,
      w: landing.w,
      h: landing.h,
      offsetX: blockOffsetX
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

    // 8. 绘制 Combo 漂浮文字
    this.floatingTexts.forEach(txt => txt.draw(this.ctx, 'Share Tech Mono', 'Outfit'));

    this.ctx.restore();
  }

  // 绘制渐进式背景
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
      // 阶段 1：公园黄昏/早晨，明亮黄橙到淡蓝
      const factor = altitude / 500;
      colorTop = this.interpolateColor('#82ccdd', '#60a3bc', factor);      // 天蓝过渡到深蓝
      colorBottom = this.interpolateColor('#fad390', '#f6b93b', factor);   // 温暖黄橙过渡到中度橙
    } else if (altitude < 1200) {
      // 阶段 2：万里晴空，中蓝到天蓝
      const factor = (altitude - 500) / 700;
      colorTop = this.interpolateColor('#60a3bc', '#0c2461', factor);      // 深蓝过渡到幽暗藏蓝
      colorBottom = this.interpolateColor('#f6b93b', '#60a3bc', factor);   // 橙色彻底转成明蓝
    } else if (altitude < 2200) {
      // 阶段 3：平流层，极深蓝到暗黑
      const factor = (altitude - 1200) / 1000;
      colorTop = this.interpolateColor('#0c2461', '#0a0d1a', factor);      // 幽暗藏蓝过渡到太空黑
      colorBottom = this.interpolateColor('#60a3bc', '#0c2461', factor);   // 明蓝过渡到深蓝
    } else {
      // 阶段 4：纯黑深空，偶尔带有紫气星云
      const factor = Math.min(1.0, (altitude - 2200) / 1500);
      colorTop = this.interpolateColor('#0a0d1a', '#020205', factor);
      colorBottom = this.interpolateColor('#0c2461', '#06070c', factor);
    }

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.baseHeight);
    grad.addColorStop(0, colorTop);
    grad.addColorStop(1, colorBottom);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
  }

  // A5+D1: 颜色插值优化（钳位 + 减少 GC 分配）
  interpolateColor(color1, color2, factor) {
    factor = Math.max(0, Math.min(1, factor));
    const r1 = parseInt(color1.slice(1,3), 16), g1 = parseInt(color1.slice(3,5), 16), b1 = parseInt(color1.slice(5,7), 16);
    const r2 = parseInt(color2.slice(1,3), 16), g2 = parseInt(color2.slice(3,5), 16), b2 = parseInt(color2.slice(5,7), 16);
    return `rgb(${Math.round(r1+(r2-r1)*factor)},${Math.round(g1+(g2-g1)*factor)},${Math.round(b1+(b2-b1)*factor)})`;
  }

  // 绘制公园树木剪影 (随镜头推移向屏幕下方滑出)
  drawParkSilhouettes() {
    if (this.theme === 'retro') return;

    // 树木在世界坐标系底部，在 canvas 的屏幕 Y 坐标为 tree.y - camera.y
    const scrollY = this.camera.y;
    // 如果已经滑出屏幕底部 100px 以上，就跳过绘制 (优化)
    if (scrollY > this.baseHeight + 50) return;

    this.ctx.save();
    // 渲染渐隐系数：随着高度升高，公园景象逐渐模糊淡出
    const alpha = Math.max(0, 1.0 - scrollY / 450);
    this.ctx.globalAlpha = alpha;

    this.parkTrees.forEach(tree => {
      const drawY = tree.y + scrollY; // 【镜头向上滚动】：世界物体在屏幕上的 Y 应为 y + camera.y (因为世界Y是向下的，地面向下移)
      
      this.ctx.fillStyle = tree.color;
      this.ctx.beginPath();
      // 绘制松树冷杉针叶塔状图形
      this.ctx.moveTo(tree.x, drawY - tree.h);
      this.ctx.lineTo(tree.x - tree.w / 2, drawY - tree.h * 0.3);
      this.ctx.lineTo(tree.x - tree.w / 4, drawY - tree.h * 0.35);
      this.ctx.lineTo(tree.x - tree.w * 0.7, drawY);
      this.ctx.lineTo(tree.x + tree.w * 0.7, drawY);
      this.ctx.lineTo(tree.x + tree.w / 4, drawY - tree.h * 0.35);
      this.ctx.lineTo(tree.x + tree.w / 2, drawY - tree.h * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      // 树干
      this.ctx.fillStyle = '#3e2723';
      this.ctx.fillRect(tree.x - 4, drawY - 2, 8, 12);
    });

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

      this.drawScandinavianBlock(drawX, drawY, block.w, block.h, isRetro, idx);
    });

    // E1: 给最高层画封顶尖塔/红旗 (屋顶 Roof Cap)
    if (this.tower.length > 0) {
      const topIdx = this.tower.length - 1;
      const topBlock = this.tower[topIdx];
      const topSway = this.towerSway.offset * Math.pow((topIdx + 1) / this.tower.length, 1.5);
      const topX = topBlock.x + topSway;
      const topY = groundY - (topIdx + 1) * topBlock.h + this.camera.y;

      this.ctx.save();
      // 尖顶红三角
      this.ctx.fillStyle = isRetro ? '#0f380f' : '#ff6b6b';
      this.ctx.beginPath();
      this.ctx.moveTo(topX - 14, topY);
      this.ctx.lineTo(topX, topY - 20);
      this.ctx.lineTo(topX + 14, topY);
      this.ctx.closePath();
      this.ctx.fill();

      // 旗杆
      this.ctx.strokeStyle = isRetro ? '#0f380f' : '#2c3e50';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(topX, topY - 20);
      this.ctx.lineTo(topX, topY - 36);
      this.ctx.stroke();

      // 飘扬红旗
      this.ctx.fillStyle = isRetro ? '#8bac0f' : '#ffd166';
      this.ctx.beginPath();
      this.ctx.moveTo(topX, topY - 36);
      this.ctx.lineTo(topX + 12, topY - 30);
      this.ctx.lineTo(topX, topY - 24);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  // 绘制下落中楼层
  drawFallingBlock() {
    if (!this.fallingBlock) return;
    const block = this.fallingBlock;
    const isRetro = this.theme === 'retro';
    
    // 【BUG 修复】：坠落块渲染坐标计算 drawY = 地面 - 坠落物理Y + 相机上升偏移
    // A1: 修复下落方块渲染跳跃（需减去方块自身高度）
    const drawY = this.baseHeight - 120 - block.h - block.y + this.camera.y;

    this.drawScandinavianBlock(block.x, drawY, block.w, block.h, isRetro, 999);
  }

  // 绘制经典的北欧简直风格方形建筑单元
  drawScandinavianBlock(x, y, w, h, isRetro, idx) {
    this.ctx.save();

    if (isRetro) {
      this.ctx.fillStyle = '#8bac0f';
      this.ctx.strokeStyle = '#0f380f';
      this.ctx.lineWidth = 3;
      
      this.ctx.fillRect(x - w / 2, y, w, h);
      this.ctx.strokeRect(x - w / 2, y, w, h);

      // B2: 窗户随楼宽缩放（复古主题）
      const retroWinW = Math.max(10, Math.floor(w * 0.22));
      const retroWinH = Math.max(14, Math.floor(h * 0.45));
      this.ctx.fillStyle = '#0f380f';
      this.ctx.fillRect(x - retroWinW / 2, y + (h - retroWinH) / 2, retroWinW, retroWinH);
      
      // 窗格浅色格子线
      this.ctx.strokeStyle = '#8bac0f';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y + 15);
      this.ctx.lineTo(x, y + 39);
      this.ctx.moveTo(x - 9, y + 27);
      this.ctx.lineTo(x + 9, y + 27);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    // --- 现代北欧经典风格建筑设计 (黄墙，白框，蓝窗，红顶) ---
    // 1. 黄色质感外墙 (带细微层次与描边)
    const baseColor = '#eccc68'; // 经典北欧奶油金黄色
    const shadowColor = '#d3b047';
    
    this.ctx.shadowBlur = idx === 999 ? 12 : 3; // 处于下落状态则高亮发光
    this.ctx.shadowColor = idx === 999 ? '#ffd166' : 'rgba(0,0,0,0.1)';

    this.ctx.fillStyle = baseColor;
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 2.5;

    // 画主外墙矩形 (四角微圆，带欧式质感)
    this.drawRoundedRect(x - w / 2, y, w, h, 4);
    this.ctx.fill();
    this.ctx.stroke();

    // 2. 绘制侧边阴影，使房子更有立体感 (左侧亮，右侧暗)
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = shadowColor;
    this.ctx.fillRect(x + w / 2 - 8, y + 1, 7, h - 2);

    // 3. 北欧红砖瓦斜房檐 (屋顶装饰线)
    // 在每个单元顶端加 6 像素高的红瓦装饰线
    this.ctx.fillStyle = '#ff6b6b'; // 北欧深红色房顶
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 6);
    this.ctx.strokeRect(x - w / 2 - 2, y - 2, w + 4, 6);

    // B2: 窗户随楼宽动态缩放
    const windowW = Math.max(12, Math.floor(w * 0.25));
    const windowH = Math.max(16, Math.floor(h * 0.5));
    const wx = x - windowW / 2;
    const wy = y + (h - windowH) / 2 + 1;

    this.drawSingleWindow(wx, wy, windowW, windowH, idx);

    this.ctx.restore();
  }

  // 辅助函数：绘制单独的白色窗框和蓝色窗户
  drawSingleWindow(x, y, w, h, animationSeed) {
    // 1. 白色外窗框
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    
    // 2. 蓝色玻璃 (如果是夜间/高处且种子随机契合，窗户透出温暖的橘黄色灯光)
    let glassColor = '#70a1ff'; // 经典海蓝色玻璃
    if (this.camera.y > 600 && animationSeed % 4 === 0) {
      glassColor = '#ffd166';   // 亮灯的温馨夜窗
    }
    
    this.ctx.fillStyle = glassColor;
    this.ctx.fillRect(x, y, w, h);

    // 3. 画窗格线 (欧式田字窗格子)
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    // 十字架
    this.ctx.moveTo(x + w / 2, y);
    this.ctx.lineTo(x + w / 2, y + h);
    this.ctx.moveTo(x, y + h / 2);
    this.ctx.lineTo(x + w, y + h / 2);
    this.ctx.stroke();
  }

  // 绘制顶部吊架、机械吊爪系统
  drawCrane() {
    const isRetro = this.theme === 'retro';
    
    // 绳爪连接顶端的世界 X, Y
    const swingX = this.baseWidth / 2 + Math.sin(this.crane.angle) * this.crane.length;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * this.crane.length;

    this.ctx.save();

    // 1. 顶部金属导轨架
    this.ctx.strokeStyle = isRetro ? '#0f380f' : '#2c3e50';
    this.ctx.lineWidth = isRetro ? 5 : 6;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.crane.pivotY - 10);
    this.ctx.lineTo(this.baseWidth, this.crane.pivotY - 10);
    this.ctx.stroke();

    // 绘制桁架交叉格子，看起来更硬朗有重工业机械感
    if (!isRetro) {
      this.ctx.strokeStyle = '#7f8c8d';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      for (let cx = 10; cx < this.baseWidth; cx += 40) {
        this.ctx.moveTo(cx, this.crane.pivotY - 10);
        this.ctx.lineTo(cx + 20, this.crane.pivotY);
        this.ctx.moveTo(cx + 20, this.crane.pivotY - 10);
        this.ctx.lineTo(cx, this.crane.pivotY);
      }
      this.ctx.stroke();
    }

    // 导轨滑轮滑块 (Trolley)
    this.ctx.fillStyle = isRetro ? '#0f380f' : '#34495e';
    this.ctx.fillRect(this.baseWidth / 2 - 20, this.crane.pivotY - 15, 40, 15);

    // B3: 导轨中央金属滑轮 (Pulley Wheel)，解决大角度摆动断连问题
    this.ctx.fillStyle = isRetro ? '#0f380f' : '#7f8c8d';
    this.ctx.beginPath();
    this.ctx.arc(this.baseWidth / 2, this.crane.pivotY, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. 吊绳
    this.ctx.strokeStyle = isRetro ? '#0f380f' : '#7f8c8d';
    this.ctx.lineWidth = isRetro ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.baseWidth / 2, this.crane.pivotY);
    this.ctx.lineTo(swingX, swingY);
    this.ctx.stroke();

    // 3. 【重点视觉】：吊绳底端金属吊钩/机械爪 (Claw)
    if (!isRetro) {
      this.ctx.save();
      this.ctx.translate(swingX, swingY);
      this.ctx.rotate(this.crane.angle); // 机械爪跟随绳子角度摆动

      // 吊爪滑环 (圆圈)
      this.ctx.fillStyle = '#34495e';
      this.ctx.strokeStyle = '#2c3e50';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // 左右两侧对称的钢架爪子弯曲结构
      this.ctx.strokeStyle = '#7f8c8d';
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      
      // 左机械臂
      this.ctx.beginPath();
      this.ctx.moveTo(-4, 0);
      this.ctx.quadraticCurveTo(-18, 10, -22, 28);
      this.ctx.stroke();

      // 右机械臂
      this.ctx.beginPath();
      this.ctx.moveTo(4, 0);
      this.ctx.quadraticCurveTo(18, 10, 22, 28);
      this.ctx.stroke();

      // 爪钩尖端防滑胶垫 (小黑块)
      this.ctx.fillStyle = '#1e252b';
      this.ctx.fillRect(-24, 26, 4, 6);
      this.ctx.fillRect(20, 26, 4, 6);

      this.ctx.restore();
    } else {
      // 复古小挂钩
      this.ctx.fillStyle = '#0f380f';
      this.ctx.beginPath();
      this.ctx.arc(swingX, swingY, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();

    // 4. 绘制挂载中且未下落的方块
    if (!this.fallingBlock && this.state === 'PLAYING') {
      const block = this.swingingBlock;
      // 摆块上方挂扣在吊爪之间
      this.drawScandinavianBlock(swingX, swingY + 12, block.w, block.h, isRetro, 999);
    }
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
    if (this._pageHidden) {
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
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGameEngine);
} else {
  initGameEngine();
}
