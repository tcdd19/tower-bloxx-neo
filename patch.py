import re

with open('game.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add AssetLoader class at the top
loader_code = """
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
      'ui_drop_shadow', 'icon'
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

  getFrame(sheetName, frameIndex, frameWidth, frameHeight) {
    // optional helper
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
"""

text = re.sub(r'(// ==========================================================================\n// 1. 音效合成系统)', lambda m: loader_code + '\n' + m.group(1), text)

# 2. Add properties to TowerBloxxGame constructor
init_add = """
    this.assetsLoaded = false;
    this.loader = new AssetLoader();
    this.spriteEffects = [];
    this.jetX = -100;
    this.propX = this.baseWidth + 100;
"""
text = re.sub(r'(this\.ctx = this\.canvas\.getContext\(\'2d\'\);)', lambda m: m.group(1) + init_add, text)

# 3. Modify startGame to clear sprite effects
text = re.sub(r'(this\.floatingTexts = \[\];)', lambda m: m.group(1) + '\n    this.spriteEffects = [];', text)

# 4. Modify update loop for sprite effects and planes
update_code = """
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
"""
text = re.sub(r'(// 1\. 粒子物理更新)', lambda m: update_code + '\n    ' + m.group(1), text)

# 5. Modify handleBlockLanding to spawn effects
landing_code = """
      if (isPerfect) {
        this.spriteEffects.push(new SparkleStar(landing.x, landingScreenY - landing.h/2, 2.5));
      }
      this.spriteEffects.push(new SpriteDustPuff(landing.x, landingScreenY, 2.5));
"""
text = re.sub(r'(// E4: 居民增加)', lambda m: landing_code + '\n    ' + m.group(1), text)

# 6. Rewrite drawBackground and replace drawSkyscraperSilhouettes
draw_bg_code = """
  drawBackground() {
    const isRetro = this.theme === 'retro';
    if (isRetro) {
      this.ctx.fillStyle = '#9bbc0f';
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
      return;
    }

    const altitude = this.camera.y;
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
"""

text = re.sub(r'  drawSkyscraperSilhouettes\(\) \{.*?(?=  // A5\+D1)', draw_bg_code + '\n', text, flags=re.DOTALL)
text = re.sub(r'    // 1\.5 诺基亚原版高楼背景剪影[^\n]*\n\s*this\.drawSkyscraperSilhouettes\(\);\n', '', text)

# 7. Modify drawParkSilhouettes
draw_park_code = """
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
"""
text = re.sub(r'  drawParkSilhouettes\(\) \{.*?(?=  drawParallaxStarsAndClouds\(\) \{)', draw_park_code + '\n', text, flags=re.DOTALL)

# 8. Modify roof cap in drawTower
roof_code = """
      const isRed = this.tower.length % 2 === 0;
      const variant = this.tower.length % 4;
      const roofName = isRed ? 'roof_red_variants' : 'roof_yellow_variants';
      const roofImg = this.loader.assets[roofName];
      
      if (roofImg && roofImg.complete && !isRetro) {
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

        this.ctx.strokeStyle = isRetro ? '#0f380f' : '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(topX, topY - 20);
        this.ctx.lineTo(topX, topY - 36);
        this.ctx.stroke();

        this.ctx.fillStyle = isRetro ? '#8bac0f' : '#ffd166';
        this.ctx.beginPath();
        this.ctx.moveTo(topX, topY - 36);
        this.ctx.lineTo(topX + 12, topY - 30);
        this.ctx.lineTo(topX, topY - 24);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }
"""
text = re.sub(r'      this\.ctx\.save\(\);\n      // 尖顶红三角.*?this\.ctx\.restore\(\);\n', roof_code, text, flags=re.DOTALL)

# 9. Modify drawCrane
crane_code = """
  drawCrane() {
    const isRetro = this.theme === 'retro';
    
    const trolleyX = this.baseWidth / 2 + Math.sin(this.crane.angle) * 22;
    const currentRopeLen = this.crane.length + this.crane.ropeStretch;
    
    const swingX = trolleyX + Math.sin(this.crane.angle) * currentRopeLen;
    const swingY = this.crane.pivotY + Math.cos(this.crane.angle) * currentRopeLen;

    this.ctx.save();

    if (!isRetro) {
      const boomImg = this.loader.assets['crane_boom_arm'];
      if (boomImg && boomImg.complete) {
        const boomW = 169 * 2.5;
        const boomH = 10 * 2.5;
        this.ctx.drawImage(boomImg, this.baseWidth / 2 - boomW / 2, this.crane.pivotY - 20, boomW, boomH);
      }
    }

    this.ctx.strokeStyle = isRetro ? '#0f380f' : '#1e293b';
    this.ctx.lineWidth = isRetro ? 3.5 : 3;
    this.ctx.beginPath();
    this.ctx.moveTo(trolleyX, this.crane.pivotY - 15);
    this.ctx.lineTo(swingX, swingY);
    this.ctx.stroke();

    if (!isRetro) {
      const hookImg = this.loader.assets['crane_hook_frames'];
      if (hookImg && hookImg.complete) {
        this.ctx.save();
        this.ctx.translate(swingX, swingY);
        const totalFrames = 5;
        let normalizedAngle = (this.crane.angle + this.crane.angleRange) / (2 * this.crane.angleRange);
        normalizedAngle = Math.max(0, Math.min(1, normalizedAngle));
        let frameIndex = Math.floor(normalizedAngle * totalFrames);
        if (frameIndex >= totalFrames) frameIndex = totalFrames - 1;

        const fw = 22;
        const fh = 19;
        const scale = 2.5;
        this.ctx.drawImage(hookImg, frameIndex * fw, 0, fw, fh, -fw*scale/2, -fh*scale/2 + 10, fw*scale, fh*scale);
        this.ctx.restore();
      }
    } else {
      this.ctx.fillStyle = '#0f380f';
      this.ctx.fillRect(swingX - 4, swingY - 2, 8, 6);
    }

    this.ctx.restore();

    if (!this.fallingBlock && this.state === 'PLAYING') {
      const block = this.swingingBlock;
      this.drawScandinavianBlock(swingX, swingY + 25, block.w, block.h, isRetro, 999);
    }
  }
"""
text = re.sub(r'  drawCrane\(\) \{.*?(?=  // 圆角矩形辅助算法)', crane_code + '\n', text, flags=re.DOTALL)

# 10. Add badge in draw
badge_code = """
    this.spriteEffects.forEach(effect => effect.draw(this.ctx, this.loader));

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
"""
text = re.sub(r'    this\.floatingTexts\.forEach\(txt => txt\.draw\(this\.ctx, \'Share Tech Mono\', \'Outfit\'\)\);\n', lambda m: m.group(0) + '\n' + badge_code, text)

# 11. Add loadAll trigger to initGameEngine
init_game_code = """
function initGameEngine() {
  if (!window.gameInstance) {
    window.gameInstance = new TowerBloxxGame();
    window.gameInstance.loader.loadAll(() => {
      window.gameInstance.assetsLoaded = true;
    });
  }
}
"""
text = re.sub(r'function initGameEngine\(\) \{.*?(?=if \(document\.readyState)', init_game_code + '\n', text, flags=re.DOTALL)

# 12. Modify loop to wait for assets
loop_code = """
  loop(timestamp) {
    if (this._pageHidden || !this.assetsLoaded) {
      requestAnimationFrame(this.loop);
      return;
    }
"""
text = re.sub(r'  loop\(timestamp\) \{\n    // D2: 页面隐藏时暂停逻辑\n    if \(this\._pageHidden\) \{\n      requestAnimationFrame\(this\.loop\);\n      return;\n    \}', loop_code, text)


with open('game.js', 'w', encoding='utf-8') as f:
    f.write(text)
