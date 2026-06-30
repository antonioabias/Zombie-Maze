import {
  TW, TH, WALL_H, COLS, ROWS,
  PLAYER_SPD, WANDER_SPD, CHASE_SPD,
  SIGHT_R, CHASE_MEMORY, HERD_RADIUS, ZOMBIE_SOUND_CD,
  LEVEL_CONFIG, state
} from './config.js';
import { MAZES } from './mazes.js';
import {
  drawGrassTile, drawDirtTile, drawHedgeWall, drawBrokenHedgeOpening,
  drawTree, drawBush, drawFlower, drawStump, drawRock
} from './draw-helpers.js';

export class MazeScene extends Phaser.Scene {
  constructor(){ super({ key: 'MazeScene' }); }

  preload(){
    this.load.image('grass',  'assets/tiles/grass.png');
    this.load.image('dirt',   'assets/tiles/dirt.png');
    this.load.image('hedge',  'assets/tiles/hedge.png');
    this.load.image('hedge-V', 'assets/tiles/hedge-V.png');
    this.load.image('heart',  'assets/ui/heart.png');
    this.load.image('tree', 'assets/tiles/tree.png');

    // Player sprites (using zombie run sheets temporarily)
    this.load.spritesheet('player_lr',   'assets/sprites/Zombie-run.png',      { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('player_up',   'assets/sprites/Zombie-run-up.png',   { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('player_down', 'assets/sprites/Zombie-run-down.png', { frameWidth: 256, frameHeight: 256 });

    // Zombie spritesheets
    this.load.spritesheet('zombie_lr',        'assets/sprites/Zombie-walk.png',      { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('zombie_lr_run',    'assets/sprites/Zombie-run.png',       { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('zombie_up',        'assets/sprites/Zombie-walk-up.png',   { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('zombie_up_run',    'assets/sprites/Zombie-run-up.png',    { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('zombie_down',      'assets/sprites/Zombie-walk-down.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('zombie_down_run',  'assets/sprites/Zombie-run-down.png',  { frameWidth: 256, frameHeight: 256 });

    this.load.audio('bgmusic',     'assets/music/backgroundmusic.mp3');
    this.load.audio('zombieSound', 'assets/music/zombie.mp3');

    const bar = this.add.graphics();
    this.load.on('progress', v => {
      bar.clear();
      bar.fillStyle(0x000000, 0.7); bar.fillRect(0, 0, this.scale.width, this.scale.height);
      bar.fillStyle(0x5dde3a);
      bar.fillRect(this.scale.width/2-160, this.scale.height/2-14, 320*v, 28);
    });
    this.load.on('complete', () => bar.destroy());
    this.load.on('loaderror', (file) => {
      console.warn('Failed to load:', file.key, file.src);
    });
  }

  create(){
    this.maze          = MAZES[state.currentLevel];
    this.gameOver      = false;
    this.transitioning = false;
    state.herdAlerted  = false;
    state.invincible   = false;

    // Spatial wall grid for O(1) collision
    this.wallGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    this.floorCells = [];
    this.startX = TW/2;
    this.startY = TH/2;
    this.exitCol = -1;
    this.exitRow = -1;

    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        const cell = this.maze[r][c];
        if(cell === 1) this.wallGrid[r][c] = true;
        else if(cell === 0 || cell === 'S'){
          this.floorCells.push({ x: c*TW + TW/2, y: r*TH + TH/2 });
          if(cell === 'S'){ this.startX = c*TW + TW/2; this.startY = r*TH + TH/2; }
        } else if(cell === 'E'){
          this.exitCol = c; this.exitRow = r;
          this.floorCells.push({ x: c*TW + TW/2, y: r*TH + TH/2 });
        }
      }
    }

    this.hasPlayerSheet = this.textures.exists('player_lr');
    this.hasZombieSheet = this.textures.exists('zombie_lr');
    this.hasBGM         = this.cache.audio.exists('bgmusic');
    this.hasZSound      = this.cache.audio.exists('zombieSound');

    this._createAnims();
    this._buildWorld();
    this._spawnPlayer();
    this._setupAudio();
    this._spawnZombies();
    this._setupCamera();
    this._setupInput();

    this.fogRevealRadius = SIGHT_R;
    this._buildFog();

    document.getElementById('level-display').textContent = `Level ${state.currentLevel + 1}`;
    this.updateLivesUI();
  }

  _createAnims(){
    const defs = [
      // Player
      { key: 'player_walk_lr',   sheet: 'player_lr',        s: 0, e: 24, fps: 10 },
      { key: 'player_walk_up',   sheet: 'player_up',        s: 0, e: 24, fps: 10 },
      { key: 'player_walk_down', sheet: 'player_down',      s: 0, e: 24, fps: 10 },
      // Zombie walk
      { key: 'z_walk_lr',        sheet: 'zombie_lr',        s: 0, e: 24, fps: 8  },
      { key: 'z_walk_up',        sheet: 'zombie_up',        s: 0, e: 24, fps: 8  },
      { key: 'z_walk_down',      sheet: 'zombie_down',      s: 0, e: 24, fps: 8  },
      // Zombie run
      { key: 'z_run_lr',         sheet: 'zombie_lr_run',    s: 0, e: 24, fps: 14 },
      { key: 'z_run_up',         sheet: 'zombie_up_run',    s: 0, e: 24, fps: 14 },
      { key: 'z_run_down',       sheet: 'zombie_down_run',  s: 0, e: 24, fps: 14 },
    ];
    defs.forEach(d => {
      if(!this.anims.exists(d.key)){
        this.anims.create({
          key: d.key,
          frames: this.anims.generateFrameNumbers(d.sheet, { start: d.s, end: d.e }),
          frameRate: d.fps,
          repeat: -1
        });
      }
    });
  }

  // ── World rendering ───────────────────────────────────────
  _buildWorld(){
    const totalW = COLS * TW;
    const totalH = ROWS * TH;
    const worldH = totalH + TH * 2;

    const bgGfx    = this.add.graphics().setDepth(0);
    const floorGfx = this.add.graphics().setDepth(1);
    const wallGfx  = this.add.graphics().setDepth(5);
    const decorGfx = this.add.graphics().setDepth(6);

    const hasGrass = this.textures.exists('grass');
    const hasDirt  = this.textures.exists('dirt');
    const hasHedge = this.textures.exists('hedge');

    // Border grass
    const borderRows = 3;
    for(let r = -borderRows; r < ROWS + borderRows; r++){
      for(let c = -borderRows; c < COLS + borderRows; c++){
        if(c >= 0 && c < COLS && r >= 0 && r < ROWS) continue;
        const px = c * TW, py = r * TH;
        if(hasGrass)
          this.add.image(px + TW/2, py + TH/2, 'grass').setDisplaySize(TW, TH).setDepth(0);
        else
          drawGrassTile(bgGfx, px, py);
      }
    }

    // Dark vignette over the outer border area
    this.borderDark = this.add.graphics().setDepth(7);
    this.borderDark.fillStyle(0x000000, 0.88);
    for(let r = -borderRows; r < ROWS + borderRows; r++){
      for(let c = -borderRows; c < COLS + borderRows; c++){
        if(c >= 0 && c < COLS && r >= 0 && r < ROWS) continue;
          this.borderDark.fillRect(c * TW, r * TH, TW, TH);
      }
    }
    

    // Maze tiles
    for(let r=0; r<ROWS; r++){
      for(let c=0; c<COLS; c++){
        const cell = this.maze[r][c];
        const px=c*TW, py=r*TH;
        const cx=px+TW/2, cy=py+TH/2;

        
        if(cell === 1){
        if(hasGrass) this.add.image(cx,cy,'grass').setDisplaySize(TW,TH).setDepth(1);
        else drawGrassTile(floorGfx, px, py);
        if(hasHedge){
          // Determine orientation: vertical if walls above/below, not left/right
          const wallAbove = r > 0        && this.maze[r-1][c] === 1;
          const wallBelow = r < ROWS - 1 && this.maze[r+1][c] === 1;
          const wallLeft  = c > 0        && this.maze[r][c-1] === 1;
          const wallRight = c < COLS - 1 && this.maze[r][c+1] === 1;

          const isVertical = (wallAbove || wallBelow) && !wallLeft && !wallRight;

          const hasHedgeV = this.textures.exists('hedge-V');
          const hedgeKey  = isVertical && hasHedgeV ? 'hedge-V' : 'hedge';

          this.add.image(cx, cy - WALL_H * 0.4, hedgeKey)
            .setDisplaySize(TW, TH + WALL_H * 0.6)
            .setDepth(5);
          wallGfx.fillStyle(0x000000, 0.18);
          wallGfx.fillRect(px, py + TH - 8, TW, 10);
        } else {
          drawHedgeWall(wallGfx, px, py);
        }
      }
        
        else if(cell === 'E'){
          if(hasDirt) this.add.image(cx, cy, 'dirt').setDisplaySize(TW, TH).setDepth(1);
          else drawDirtTile(floorGfx, px, py);
          drawBrokenHedgeOpening(wallGfx, px, py);
        } else {
          if(hasDirt) this.add.image(cx, cy, 'dirt').setDisplaySize(TW, TH).setDepth(1);
          else drawDirtTile(floorGfx, px, py);
        }
      }
    }

    this.exitGlow  = this.add.graphics().setDepth(4);
    this.exitGlowT = 0;
    this.totalW    = totalW;
    this.worldH    = worldH;
  }

  // ── Fog of war ────────────────────────────────────────────
  _buildFog(){
    const totalW = COLS * TW;
    const totalH = ROWS * TH;
    const borderRows = 3;
    const pad = borderRows * TW;

    this.fogLayer = this.add.graphics().setDepth(49);
    this.fogLayer.fillStyle(0x000000, 0.88);
    this.fogLayer.fillRect(-pad, -pad, totalW + pad * 2, totalH + pad * 2);

    this.fogMaskShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.fogMaskShape.fillStyle(0xffffff);
    this.fogMaskShape.fillCircle(0, 0, this.fogRevealRadius);

    const mask = this.fogMaskShape.createGeometryMask();
    mask.invertAlpha = true;
    this.fogLayer.setMask(mask);
    this.borderDark.setMask(mask);
    this.fogRevealRadius = SIGHT_R;
  }

  _updateFog(){
    this.fogMaskShape.x = this.playerBody.x;
    this.fogMaskShape.y = this.playerBody.y;
    this.fogMaskShape.clear();
    this.fogMaskShape.fillStyle(0xffffff);
    this.fogMaskShape.fillCircle(0, 0, this.fogRevealRadius);
  }

  // ── Player ────────────────────────────────────────────────
  _spawnPlayer(){
    const playerSize = TW * 1.8;
    this.lastDir = 'down';

    if(this.hasPlayerSheet){
      this.playerBody = this.physics.add.sprite(this.startX, this.startY, 'player_down')
        .setDisplaySize(playerSize, playerSize).setDepth(10);
      this.playerBody.play('player_walk_down');
    } else {
      // Fallback drawn player
      const pg = this.add.graphics();
      pg.fillStyle(0x4a7c3f); pg.fillRect(-14,-18,28,26);
      pg.fillStyle(0xd4956a); pg.fillEllipse(0,-26,22,22);
      pg.fillStyle(0x3a2010); pg.fillRect(-9,-34,18,10);
      pg.fillStyle(0x1a1a2e); pg.fillEllipse(-5,-28,5,5); pg.fillEllipse(5,-28,5,5);
      pg.generateTexture('pfb', 32, 50); pg.destroy();
      this.playerBody = this.physics.add.image(this.startX, this.startY, 'pfb').setDepth(10);
    }
    this.playerBody.setCollideWorldBounds(false);
    this.playerMoving = false;
  }

  _updatePlayerAnim(vx, vy){
    if(!this.hasPlayerSheet) return;

    const moving = vx !== 0 || vy !== 0;
    let newDir = this.lastDir;

    if(moving){
      if(Math.abs(vy) > Math.abs(vx)){
        newDir = vy < 0 ? 'up' : 'down';
      } else {
        newDir = 'lr';
      }
      this.playerBody.setFlipX(vx < 0);
    }

    // Only switch anim if direction changed or movement state changed
    if(newDir !== this.lastDir || moving !== this.playerMoving){
      this.lastDir = newDir;
      this.playerMoving = moving;
      if(moving){
        if(newDir === 'up')   this.playerBody.play('player_walk_up',   true);
        if(newDir === 'down') this.playerBody.play('player_walk_down', true);
        if(newDir === 'lr')   this.playerBody.play('player_walk_lr',   true);
      } else {
        this.playerBody.stop();
        this.playerBody.setFrame(0);
      }
    }
  }

  _setupAudio(){
    if(this.hasBGM){
      this.bgm = this.sound.add('bgmusic', { loop: true, volume: 0.4 });
      this.bgm.play();
    }
    if(this.hasZSound){
      this.zombieSound = this.sound.add('zombieSound', { volume: 0.7 });
    }
    this.lastZombieSoundTime  = 0;
    this.lastZombieSoundCheck = 0;
  }

  // ── Zombies ───────────────────────────────────────────────
  _spawnZombies(){
    this.zombies = [];
    const cfg = LEVEL_CONFIG[state.currentLevel] || { solo: 2, herd: 4 };
    const zombieSize = TW * 1.8;

    const farCells = this.floorCells.filter(({x,y}) =>
      Math.hypot(x - this.startX, y - this.startY) > 5*TW
    );
    const spawnCells = farCells.length >= 5 ? farCells : this.floorCells;

    const totalZ = cfg.solo + cfg.herd;
    for(let i=0; i<totalZ; i++){
      const cell = spawnCells[i % spawnCells.length];
      let zbody;

      if(this.hasZombieSheet){
        zbody = this.physics.add.sprite(cell.x, cell.y, 'zombie_lr')
          .setDisplaySize(zombieSize, zombieSize).setDepth(3);
        zbody.play('z_walk_lr');
      } else {
        const zg = this.add.graphics();
        zg.fillStyle(0x8acc70); zg.fillEllipse(0,-18,22,22);
        zg.fillStyle(0x5a7a3a); zg.fillRect(-10,-6,20,20);
        zg.fillStyle(0xff2020);
        zg.fillRect(-7,-22,4,4); zg.fillRect(-3,-18,4,4);
        zg.fillRect(3,-22,4,4);  zg.fillRect(7,-18,4,4);
        zg.fillStyle(0x1a0a0a); zg.fillEllipse(0,-10,10,6);
        const fk = `zfb${i}`;
        zg.generateTexture(fk, 30, 42); zg.destroy();
        zbody = this.physics.add.image(cell.x, cell.y, fk).setDepth(3);
      }

      zbody.chasing     = false;
      zbody.chaseTimer  = 0;
      zbody.wanderTimer = Phaser.Math.FloatBetween(0.3, 1.8);
      zbody.targetX     = cell.x;
      zbody.targetY     = cell.y;
      zbody.bobTimer    = Phaser.Math.FloatBetween(0, Math.PI*2);
      zbody.isHerd      = i >= cfg.solo;
      zbody.dir         = 'lr'; // current facing direction
      zbody.wasChasing  = false;
      this.zombies.push(zbody);
    }
  }

  // Pick the right zombie anim key based on direction + chase state
  _zombieAnim(z, chasing){
    const type = chasing ? 'run' : 'walk';
    return `z_${type}_${z.dir}`;
  }

  _setZombieDir(z, dx, dy, chasing){
    let newDir;
    if(Math.abs(dy) > Math.abs(dx)){
      newDir = dy < 0 ? 'up' : 'down';
    } else {
      newDir = 'lr';
    }
    z.setFlipX(dx < 0);

    const newChasing = chasing;
    if(newDir !== z.dir || newChasing !== z.wasChasing){
      z.dir = newDir;
      z.wasChasing = newChasing;
      if(this.hasZombieSheet) z.play(this._zombieAnim(z, chasing), true);
    }
  }

  _setupCamera(){
    this.cameras.main.setBounds(0, 0, Math.max(this.totalW, this.scale.width), this.worldH);
    this.physics.world.setBounds(0, 0, this.totalW, this.worldH);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.startFollow(this.playerBody, true, 0.12, 0.12);
  }

  _setupInput(){
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd    = this.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D' });
  }

  // O(1) wall collision via grid
  wallCollides(x, y, r){
    const minC = Math.floor((x - r) / TW);
    const maxC = Math.floor((x + r) / TW);
    const minR = Math.floor((y - r) / TH);
    const maxR = Math.floor((y + r) / TH);
    for(let rr = minR; rr <= maxR; rr++){
      for(let cc = minC; cc <= maxC; cc++){
        if(rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return true;
        if(this.wallGrid[rr][cc]) return true;
      }
    }
    return false;
  }

  hasLOS(ax, ay, bx, by){
    const steps = 28;
    for(let i=1; i<steps; i++){
      const t = i/steps;
      if(this.wallCollides(ax + (bx-ax)*t, ay + (by-ay)*t, 6)) return false;
    }
    return true;
  }

  pickRandomFloorTarget(){
    return this.floorCells.length
      ? Phaser.Utils.Array.GetRandom(this.floorCells)
      : null;
  }

  update(time, delta){
    if(this.gameOver || this.transitioning) return;
    const dt = delta / 1000;
    const p  = this.playerBody;

    this._updateFog();

    // Exit glow
    this.exitGlowT += dt * 2.5;
    this.exitGlow.clear();
    if(this.exitCol >= 0){
      const pulse = 0.15 + Math.sin(this.exitGlowT) * 0.1;
      this.exitGlow.fillStyle(0xffd700, pulse);
      this.exitGlow.fillEllipse(this.exitCol*TW + TW/2, this.exitRow*TH + TH/2, TW*0.9, TH*0.7);
    }

    // Player movement
    let vx = 0, vy = 0;
    if(this.cursors.left.isDown  || this.wasd.left.isDown)  vx = -PLAYER_SPD;
    if(this.cursors.right.isDown || this.wasd.right.isDown) vx =  PLAYER_SPD;
    if(this.cursors.up.isDown    || this.wasd.up.isDown)    vy = -PLAYER_SPD;
    if(this.cursors.down.isDown  || this.wasd.down.isDown)  vy =  PLAYER_SPD;
    if(vx !== 0 && vy !== 0){ vx *= 0.707; vy *= 0.707; }

    const nx = p.x + vx*dt, ny = p.y + vy*dt;
    if(!this.wallCollides(nx, p.y, 28)) p.x = nx;
    if(!this.wallCollides(p.x, ny, 28)) p.y = ny;

    this._updatePlayerAnim(vx, vy);
    p.setDepth(10 + p.y * 0.0001);

    // Check exit
    if(this.exitCol >= 0){
      const ex = this.exitCol*TW + TW/2, ey = this.exitRow*TH + TH/2;
      if(Math.hypot(p.x - ex, p.y - ey) < TW*0.5) this.triggerLevelComplete();
    }

    // Zombie AI
    let closestZombieDist = Infinity;
    for(let i=0; i<this.zombies.length; i++){
      const z = this.zombies[i];
      const dx = p.x - z.x, dy = p.y - z.y;
      const dist = Math.hypot(dx, dy);
      if(dist < closestZombieDist) closestZombieDist = dist;

      const canSee = dist < SIGHT_R && this.hasLOS(z.x, z.y, p.x, p.y);

      if(canSee){
        if(!z.chasing){
          z.chasing = true;
          z.chaseTimer = CHASE_MEMORY;
        } else {
          z.chaseTimer = CHASE_MEMORY;
        }

        if(!state.herdAlerted){
          state.herdAlerted = true;
          for(const other of this.zombies){
            if(other !== z && other.isHerd && Math.hypot(other.x - z.x, other.y - z.y) < HERD_RADIUS){
              other.chasing = true;
              other.chaseTimer = CHASE_MEMORY;
            }
          }
          document.getElementById('alert-bar').classList.add('show');
          this.time.delayedCall(3000, () => document.getElementById('alert-bar').classList.remove('show'));
        }
      } else if(z.chasing){
        z.chaseTimer -= dt;
        if(z.chaseTimer <= 0){
          z.chasing = false;
        }
      }

      if(z.chasing){
        const len = dist || 1;
        const spd = CHASE_SPD * (z.isHerd ? 1.15 : 1);
        let zx2 = z.x + (dx/len) * spd * dt;
        let zy2 = z.y + (dy/len) * spd * dt;
        if(!this.wallCollides(zx2, z.y, 22)) z.x = zx2;
        else if(!this.wallCollides(zx2, z.y-20, 22)){ z.x = zx2; z.y -= 18*dt; }
        else if(!this.wallCollides(zx2, z.y+20, 22)){ z.x = zx2; z.y += 18*dt; }
        if(!this.wallCollides(z.x, zy2, 22)) z.y = zy2;
        else if(!this.wallCollides(z.x-20, zy2, 22)){ z.x -= 18*dt; z.y = zy2; }
        else if(!this.wallCollides(z.x+20, zy2, 22)){ z.x += 18*dt; z.y = zy2; }

        this._setZombieDir(z, dx, dy, true);

      } else {
        z.wanderTimer -= dt;
        const tdx = z.targetX - z.x, tdy = z.targetY - z.y;
        const tlen = Math.hypot(tdx, tdy);
        if(z.wanderTimer <= 0 || tlen < 12){
          const dest = this.pickRandomFloorTarget();
          if(dest){ z.targetX = dest.x; z.targetY = dest.y; }
          z.wanderTimer = Phaser.Math.FloatBetween(3.0, 6.5);
        }
        const wdx = z.targetX - z.x, wdy = z.targetY - z.y;
        const wlen = Math.hypot(wdx, wdy) || 1;
        if(wlen > 8){
          let zx2 = z.x + (wdx/wlen) * WANDER_SPD * dt;
          let zy2 = z.y + (wdy/wlen) * WANDER_SPD * dt;
          let moved = false;
          if(!this.wallCollides(zx2, z.y, 22)){ z.x = zx2; moved = true; }
          if(!this.wallCollides(z.x, zy2, 22)){ z.y = zy2; moved = true; }
          if(!moved){
            const dest = this.pickRandomFloorTarget();
            if(dest){ z.targetX = dest.x; z.targetY = dest.y; }
            z.wanderTimer = Phaser.Math.FloatBetween(1.5, 3.0);
          }
          this._setZombieDir(z, wdx, wdy, false);
        }
      }

      z.bobTimer += dt * (z.chasing ? 8 : 4);
      z.setDepth(3 + z.y * 0.0001);
      if(!state.invincible && dist < 30) this.hitPlayer();
    }

    // Throttle zombie sound check
    if(this.hasZSound && this.zombieSound){
      if(time - this.lastZombieSoundCheck > 250){
        this.lastZombieSoundCheck = time;
        if(closestZombieDist < 220 && time - this.lastZombieSoundTime > ZOMBIE_SOUND_CD){
          this.lastZombieSoundTime = time;
          this.zombieSound.play();
        }
      }
    }
  }

  hitPlayer(){
    if(state.invincible) return;
    state.lives--;
    state.invincible = true;
    this.updateLivesUI();
    this.cameras.main.shake(280, 0.014);
    let bc = 0;
    this.time.addEvent({ delay: 160, repeat: 13, callback: () => {
      const a = this.playerBody.alpha < 1 ? 1 : 0.22;
      this.playerBody.setAlpha(a);
      if(++bc >= 14){ state.invincible = false; this.playerBody.setAlpha(1); }
    }});
    if(state.lives <= 0){
      this.gameOver = true;
      this.time.delayedCall(500, () => {
        this._showOverlay('🧟','Game Over','The zombies got you...','Try Again', () => {
          state.lives = 3; state.currentLevel = 0;
          state.invincible = false; state.herdAlerted = false;
          this.scene.restart();
        });
      });
    }
  }

  triggerLevelComplete(){
    if(this.gameOver || this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.flash(300, 255, 230, 50);
    if(state.currentLevel < MAZES.length - 1){
      this.time.delayedCall(500, () => {
        state.currentLevel++;
        state.invincible = false; state.herdAlerted = false;
        this.scene.restart();
      });
    } else {
      this.time.delayedCall(400, () => {
        this._showOverlay('🏆','You Escaped!','You survived all levels!','Play Again', () => {
          state.currentLevel = 0; state.lives = 3;
          state.invincible = false; state.herdAlerted = false;
          this.scene.restart();
        });
      });
    }
  }

  updateLivesUI(){
    const el = document.getElementById('lives-display');
    el.innerHTML = '';
    const hasHeart = this.textures.exists('heart');
    for(let i=0; i<3; i++){
      if(hasHeart){
        const img = document.createElement('img');
        img.src = 'assets/ui/heart.png';
        img.style.cssText = `width:28px;height:28px;object-fit:contain;${i >= state.lives ? 'filter:grayscale(1);opacity:0.3;' : ''}`;
        el.appendChild(img);
      } else {
        const s = document.createElement('span');
        s.className = 'heart' + (i >= state.lives ? ' lost' : '');
        s.textContent = '❤️';
        el.appendChild(s);
      }
    }
  }

  _showOverlay(icon, title, msg, btn, cb){
    document.getElementById('overlay-icon').textContent  = icon;
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-msg').textContent   = msg;
    const b = document.getElementById('overlay-btn');
    b.textContent = btn;
    b.onclick = () => { document.getElementById('overlay').classList.remove('show'); cb(); };
    document.getElementById('overlay').classList.add('show');
  }
}