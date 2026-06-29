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
    this.load.image('heart',  'assets/ui/heart.png');
    this.load.image('player_front', 'assets/sprites/Survivor-Front.png');
    this.load.image('player_back',  'assets/sprites/Survivor-Back.png');
    this.load.image('player_left',  'assets/sprites/Survivor-Left.png');
    this.load.image('player_right', 'assets/sprites/Survivor-Right.png');
    this.load.image('zombie_front', 'assets/sprites/Zombie-Front.png');
    this.load.image('zombie_back',  'assets/sprites/Zombie-Back.png');
    this.load.image('zombie_left',  'assets/sprites/Zombie-Left.png');
    this.load.image('zombie_right', 'assets/sprites/Zombie-Right.png');
    this.load.audio('bgmusic',     'assets/music/backgroundmusic.mp3');
    this.load.audio('zombieSound', 'assets/music/zombie.mp3');

    const bar = this.add.graphics();
    this.load.on('progress', v => {
      bar.clear();
      bar.fillStyle(0x000000,0.7); bar.fillRect(0,0,this.scale.width,this.scale.height);
      bar.fillStyle(0x5dde3a);
      bar.fillRect(this.scale.width/2-160, this.scale.height/2-14, 320*v, 28);
    });
    this.load.on('complete', () => bar.destroy());
    this.load.on('loaderror', () => {});
  }

  create(){
    this.maze          = MAZES[state.currentLevel];
    this.gameOver      = false;
    this.transitioning = false;
    state.herdAlerted  = false;
    state.invincible   = false;

    // ── OPTIMIZATION: Build a spatial wall grid for O(1) collision ──
    this.wallGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    this.floorCells = [];      // cached once
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

    this.hasPlayerFront = this.textures.exists('player_front');
    this.hasZombieFront = this.textures.exists('zombie_front');
    this.hasBGM         = this.cache.audio.exists('bgmusic');
    this.hasZSound      = this.cache.audio.exists('zombieSound');

    this._buildWorld();
    this._spawnPlayer();
    this._setupAudio();
    this._spawnZombies();
    this._setupCamera();
    this._setupInput();

    document.getElementById('level-display').textContent = `Level ${state.currentLevel + 1}`;
    this.updateLivesUI();
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
    for(let r=-borderRows; r<ROWS+borderRows; r++){
      for(let c=-borderRows; c<COLS+borderRows; c++){
        if(c>=0 && c<COLS && r>=0 && r<ROWS) continue;
        const px=c*TW, py=r*TH;
        if(hasGrass) this.add.image(px+TW/2,py+TH/2,'grass').setDisplaySize(TW,TH).setDepth(0);
        else drawGrassTile(bgGfx, px, py);
      }
    }

    // Outer decorations
    const outerDecor = [];
    for(let c=0; c<COLS; c++){
      outerDecor.push({c,r:-2,t:'tree'});
      outerDecor.push({c,r:ROWS+1,t:'tree'});
    }
    [-1,-2,-3].forEach(r => {
      for(let c=1; c<COLS; c+=2) outerDecor.push({c,r,t: c%4===0?'rock': c%3===0?'stump':'bush'});
    });
    [ROWS, ROWS+1, ROWS+2].forEach(r => {
      for(let c=1; c<COLS; c+=2) outerDecor.push({c,r,t: c%5===0?'flower': c%3===0?'rock':'bush', col: c%2===0?0xff88cc:0xffee44});
    });
    outerDecor.forEach(d => {
      const px=d.c*TW, py=d.r*TH;
      if(d.t==='tree')   drawTree(decorGfx, px, py);
      else if(d.t==='bush')   drawBush(decorGfx, px, py);
      else if(d.t==='flower') drawFlower(decorGfx, px, py, d.col||0xff88cc);
      else if(d.t==='stump')  drawStump(decorGfx, px, py);
      else if(d.t==='rock')   drawRock(decorGfx, px, py);
    });

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
            this.add.image(cx, cy-WALL_H*0.4, 'hedge').setDisplaySize(TW, TH+WALL_H*0.6).setDepth(5);
            wallGfx.fillStyle(0x000000,0.18); wallGfx.fillRect(px, py+TH-8, TW, 10);
          } else {
            drawHedgeWall(wallGfx, px, py);
          }
        } else if(cell === 'E'){
          if(hasDirt) this.add.image(cx,cy,'dirt').setDisplaySize(TW,TH).setDepth(1);
          else drawDirtTile(floorGfx, px, py);
          drawBrokenHedgeOpening(wallGfx, px, py);
        } else {
          if(hasDirt) this.add.image(cx,cy,'dirt').setDisplaySize(TW,TH).setDepth(1);
          else drawDirtTile(floorGfx, px, py);
        }
      }
    }

    this.exitGlow  = this.add.graphics().setDepth(4);
    this.exitGlowT = 0;
    this.totalW    = totalW;
    this.worldH    = worldH;
  }

  _spawnPlayer(){
    const playerSize = TW * 0.9;
    if(this.hasPlayerFront){
      this.playerBody = this.physics.add.image(this.startX, this.startY, 'player_front')
        .setDisplaySize(playerSize, playerSize).setDepth(3);
      this.lastDir = 'front';
    } else {
      const pg = this.add.graphics();
      pg.fillStyle(0x4a7c3f); pg.fillRect(-14,-18,28,26);
      pg.fillStyle(0xd4956a); pg.fillEllipse(0,-26,22,22);
      pg.fillStyle(0x3a2010); pg.fillRect(-9,-34,18,10);
      pg.fillStyle(0x1a1a2e); pg.fillEllipse(-5,-28,5,5); pg.fillEllipse(5,-28,5,5);
      pg.generateTexture('pfb', 32, 50); pg.destroy();
      this.playerBody = this.physics.add.image(this.startX, this.startY, 'pfb').setDepth(3);
    }
    this.playerBody.setCollideWorldBounds(false);
  }

  _setupAudio(){
    if(this.hasBGM){
      this.bgm = this.sound.add('bgmusic', { loop: true, volume: 0.4 });
      this.bgm.play();
    }
    if(this.hasZSound){
      this.zombieSound = this.sound.add('zombieSound', { volume: 0.7 });
    }
    this.lastZombieSoundTime = 0;
    this.lastZombieSoundCheck = 0;
  }

  _spawnZombies(){
    this.zombies = [];
    const cfg = LEVEL_CONFIG[state.currentLevel] || { solo: 2, herd: 4 };
    const zombieSize = TW * 1.0;

    // Spawn far from player
    const farCells = this.floorCells.filter(({x,y}) =>
      Math.hypot(x - this.startX, y - this.startY) > 5*TW
    );
    const spawnCells = farCells.length >= 5 ? farCells : this.floorCells;

    const totalZ = cfg.solo + cfg.herd;
    for(let i=0; i<totalZ; i++){
      const cell = spawnCells[i % spawnCells.length];
      let zbody;
      if(this.hasZombieFront){
        zbody = this.physics.add.image(cell.x, cell.y, 'zombie_front')
          .setDisplaySize(zombieSize, zombieSize).setDepth(3);
        zbody.lastDir = 'front';
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
      this.zombies.push(zbody);
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

  // ── OPTIMIZATION: O(1) wall collision via grid ────────────
  wallCollides(x, y, r){
    const minC = Math.floor((x - r) / TW);
    const maxC = Math.floor((x + r) / TW);
    const minR = Math.floor((y - r) / TH);
    const maxR = Math.floor((y + r) / TH);
    for(let rr = minR; rr <= maxR; rr++){
      for(let cc = minC; cc <= maxC; cc++){
        if(rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
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

  // ── OPTIMIZATION: Use cached floorCells ───────────────────
  pickRandomFloorTarget(){
    return this.floorCells.length
      ? Phaser.Utils.Array.GetRandom(this.floorCells)
      : null;
  }

  update(time, delta){
    if(this.gameOver || this.transitioning) return;
    const dt = delta / 1000;
    const p  = this.playerBody;

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

    if(this.hasPlayerFront){
      let newDir = this.lastDir;
      if(Math.abs(vx) > Math.abs(vy)){
        if(vx < 0) newDir = 'left'; else if(vx > 0) newDir = 'right';
      } else {
        if(vy < 0) newDir = 'back'; else if(vy > 0) newDir = 'front';
      }
      if(newDir !== this.lastDir){
        this.lastDir = newDir;
        p.setTexture('player_' + newDir);
      }
    } else {
      if(vx < 0) p.setFlipX(true);
      if(vx > 0) p.setFlipX(false);
    }
    p.setDepth(3 + p.y * 0.0001);

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
        z.chasing = true;
        z.chaseTimer = CHASE_MEMORY;
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
      } else if(z.chaseTimer > 0){
        z.chaseTimer -= dt;
        if(z.chaseTimer <= 0) z.chasing = false;
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

        if(this.hasZombieFront){
          let newDir = z.lastDir;
          if(Math.abs(dx) > Math.abs(dy)){
            if(dx < 0) newDir = 'left'; else if(dx > 0) newDir = 'right';
          } else {
            if(dy < 0) newDir = 'back'; else if(dy > 0) newDir = 'front';
          }
          if(newDir !== z.lastDir){ z.lastDir = newDir; z.setTexture('zombie_' + newDir); }
        } else {
          z.setFlipX(dx < 0);
        }
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
          if(this.hasZombieFront){
            let newDir = z.lastDir;
            if(Math.abs(wdx) > Math.abs(wdy)){
              if(wdx < 0) newDir = 'left'; else if(wdx > 0) newDir = 'right';
            } else {
              if(wdy < 0) newDir = 'back'; else if(wdy > 0) newDir = 'front';
            }
            if(newDir !== z.lastDir){ z.lastDir = newDir; z.setTexture('zombie_' + newDir); }
          } else {
            z.setFlipX(wdx < 0);
          }
        }
      }

      z.bobTimer += dt * (z.chasing ? 8 : 4);
      z.setDepth(3 + z.y * 0.0001);
      if(!state.invincible && dist < 30) this.hitPlayer();
    }

    // ── OPTIMIZATION: Throttle zombie sound check ───────────
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