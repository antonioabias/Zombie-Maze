<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Zombie Maze</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
background:#0a1a0a;
display:flex;align-items:center;justify-content:center;
width:100vw;height:100vh;overflow:hidden;
font-family:'Fredoka One',cursive;
}
#game-wrap{
position:relative;
width:100vw;
height:100vh;
overflow:hidden;
}
#hud{
position:absolute;top:0;left:0;right:0;z-index:100;
display:flex;align-items:center;justify-content:space-between;
padding:10px 20px;
background:linear-gradient(180deg,rgba(0,0,0,0.75) 0%,transparent 100%);
pointer-events:none;
}
.hud-pill{
background:rgba(0,0,0,0.6);
border:2px solid rgba(255,255,255,0.15);
border-radius:40px;padding:6px 18px;
display:flex;align-items:center;gap:8px;
backdrop-filter:blur(6px);
}
.hud-level{color:#ffe135;font-size:20px;text-shadow:0 2px 8px rgba(255,200,0,0.6);}
.hud-hint{color:rgba(255,255,255,0.45);font-size:12px;font-family:'Nunito',sans-serif;letter-spacing:1px;}
.hud-lives{display:flex;gap:4px;align-items:center;}
.heart{font-size:24px;}
.heart.lost{filter:grayscale(1);opacity:0.3;}
#alert-bar{
position:absolute;top:68px;left:50%;transform:translateX(-50%);
z-index:99;pointer-events:none;
background:rgba(200,20,20,0.9);
border:2px solid #ff6b6b;border-radius:30px;
padding:6px 24px;color:#fff;font-size:14px;letter-spacing:1px;
opacity:0;transition:opacity 0.3s;white-space:nowrap;
}
#alert-bar.show{opacity:1;}
#overlay{
position:absolute;inset:0;z-index:200;
display:none;align-items:center;justify-content:center;
background:rgba(0,0,0,0.78);backdrop-filter:blur(8px);
}
#overlay.show{display:flex;}
#overlay-box{
text-align:center;padding:40px 56px;
background:linear-gradient(160deg,#1a3a1a,#0f1f0f);
border:3px solid #5dde3a;border-radius:28px;
box-shadow:0 0 60px rgba(93,222,58,0.25),0 24px 80px rgba(0,0,0,0.6);
max-width:380px;width:90%;
}
#overlay-box h2{font-size:34px;margin-bottom:8px;color:#ffe135;text-shadow:0 0 20px rgba(255,200,0,0.5);}
#overlay-box p{color:rgba(255,255,255,0.7);font-family:'Nunito',sans-serif;font-size:14px;margin-bottom:24px;line-height:1.6;}
#overlay-box button{
padding:13px 40px;
background:linear-gradient(135deg,#5dde3a,#3ab820);
color:#0f2a0a;border:none;border-radius:50px;
font-size:17px;font-family:'Fredoka One',cursive;
cursor:pointer;letter-spacing:1px;
box-shadow:0 4px 0 #2a8a10,0 8px 20px rgba(93,222,58,0.3);
transition:all 0.15s;
}
#overlay-box button:hover{transform:translateY(-2px);}
#overlay-box button:active{transform:translateY(2px);box-shadow:0 2px 0 #2a8a10;}
.overlay-icon{font-size:52px;margin-bottom:10px;display:block;}
#rotate-msg{
display:none;
position:fixed;inset:0;z-index:9999;
background:#0a1a0a;
flex-direction:column;align-items:center;justify-content:center;gap:16px;
color:#fff;font-size:22px;text-align:center;padding:2rem;
}
#rotate-msg span{font-size:56px;}
@media(max-width:768px) and (orientation:portrait){
#rotate-msg{display:flex;}
#game-wrap{display:none;}
}
</style>
</head>
<body>
<div id="rotate-msg">
<span>📱</span>
Rotate your device to landscape to play!
</div>
<div id="game-wrap">
<div id="hud">
<div class="hud-pill">
<span style="font-size:16px;">🌿</span>
<span class="hud-level" id="level-display">Level 1</span>
</div>
<span class="hud-hint">WASD / Arrow Keys</span>
<div class="hud-pill">
<div class="hud-lives" id="lives-display">
<span class="heart">❤️</span>
<span class="heart">❤️</span>
<span class="heart">❤️</span>
</div>
</div>
</div>
<div id="alert-bar">🧟 HERD INCOMING!</div>
<div id="game-container"></div>
<div id="overlay">
<div id="overlay-box">
<span class="overlay-icon" id="overlay-icon">🌿</span>
<h2 id="overlay-title">Level Clear!</h2>
<p id="overlay-msg">You escaped the maze!</p>
<button id="overlay-btn">Continue</button>
</div>
</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
<script>
// ── CONSTANTS ─────────────────────────────────────────────────
const GAME_H     = window.innerHeight; // Fullscreen height
const TW         = 96;
const TH         = 96;
const WALL_H     = 72;
const COLS       = 26;  // 26 tiles wide
const ROWS       = 14;  // 14 tiles tall
const PLAYER_SPD = 200;
const WANDER_SPD = 50;
const CHASE_SPD  = 110;
const SIGHT_R    = 300;
const CHASE_MEMORY = 4;
const HERD_RADIUS  = 320;

const LEVEL_CONFIG = [
{ solo: 2, herd: 4 },
{ solo: 3, herd: 6 },
{ solo: 4, herd: 8 },
];

// ── NEW MAZES (14 rows x 26 cols) ────────────────────────────
const MAZES = [
// Level 1: "The Spiral"
[
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,'S',0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
[1,0,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
[1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
[1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,'E',1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
],

// Level 2: "The Fortress"
[
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,'S',0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
[1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,1,0,0,0,1],
[1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1],
[1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
[1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1],
[1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1],
[1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,'E',1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
],

// Level 3: "The Labyrinth"
[
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,'S',0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
[1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,0,1],
[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
[1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
[1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,0,1],
[1,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1],
[1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,'E',1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
],
];

let currentLevel = 0;
let lives = 3;
let invincible = false;
let herdAlerted = false;

// ── DRAW HELPERS ──────────────────────────────────────────────
function drawGrassTile(g, px, py, tw, th) {
const colors = [0x5a9e30,0x5da832,0x58962e,0x60a635];
g.fillStyle(colors[(Math.floor(px/tw)*3+Math.floor(py/th)*7)%4]);
g.fillRect(px, py, tw, th);
g.fillStyle(0x4a8820, 0.4);
g.fillRect(px+6,  py+8,  4, 10);
g.fillRect(px+10, py+6,  3, 12);
g.fillRect(px+tw-14, py+10, 4, 9);
g.fillStyle(0x000000, 0.05);
g.fillRect(px, py+th-3, tw, 3);
g.fillRect(px+tw-3, py, 3, th);
}

function drawDirtTile(g, px, py, tw, th) {
g.fillStyle(0x9c6b3c);
g.fillRect(px, py, tw, th);
g.fillStyle(0xb07d4a);
g.fillRect(px+4, py+4, tw-8, th-8);
g.fillStyle(0x7a5028, 0.6);
const s = (Math.floor(px/tw)*5+Math.floor(py/th)*9)%4;
if (s===0){g.fillRect(px+12,py+14,7,5);g.fillRect(px+55,py+40,6,5);}
if(s===1){g.fillRect(px+25,py+8, 6,7);g.fillRect(px+68,py+52,7,5);}
if(s===2){g.fillRect(px+18,py+48,8,5);g.fillRect(px+50,py+12,6,6);}
if(s===3){g.fillRect(px+10,py+32,6,5);g.fillRect(px+62,py+22,7,4);}
g.fillStyle(0x000000,0.07);
g.fillRect(px,py+th-4,tw,4);
g.fillRect(px+tw-4,py,4,th);
}

function drawHedgeWall(g, px, py, tw, th, wallH) {
g.fillStyle(0x000000,0.22);
g.fillRect(px+6, py+th-6, tw-6, 10);
const top = py - wallH + th;
g.fillStyle(0x236010);
g.fillRect(px, top, tw, wallH+6);
g.fillStyle(0x3a8a1a);
g.fillRect(px, top, tw, 16);
const blobs = [
[2,0,22,18],[24,-3,20,22],[46,0,22,18],[68,-2,18,20],[86,1,10,16]
];
g.fillStyle(0x4aa020);
blobs.forEach(([bx,by,bw,bh])=>g.fillRect(px+bx, top+by, bw, bh));
g.fillStyle(0x6acc30,0.65);
g.fillRect(px+4,  top+2, 10, 8);
g.fillRect(px+28, top+0, 10, 8);
g.fillRect(px+52, top+2, 10, 7);
g.fillRect(px+74, top+0, 8,  7);
g.fillStyle(0x122a08,0.5);
g.fillRect(px+24, top, 5, wallH+6);
g.fillRect(px+46, top, 5, wallH+6);
g.fillRect(px+68, top, 5, wallH+6);
g.fillStyle(0x000000,0.2);
g.fillRect(px, top, 5, wallH+6);
g.fillStyle(0x78d840,0.5);
g.fillRect(px, top , tw, 4);
}

function drawBrokenWall(g, px, py, tw, th, wallH) {
const top = py - wallH + th;
g.fillStyle(0xffd700 , 0.18);
g.fillRect(px-8, top-8, tw+16, wallH+20);
g.fillStyle(0x236010);
g.fillRect(px, top, tw*0.35, wallH+6);
g.fillStyle(0x4aa020);
g.fillRect(px, top, tw*0.35,  14);
g.fillStyle(0x236010);
g.fillRect(px+tw*0.65, top, tw*0.35, wallH+6);
g.fillStyle(0x4aa020);
g.fillRect(px+tw*0.65, top, tw*0.35, 14);
g.fillStyle(0x3a8a1a);
g.fillRect(px+tw*0.3, top+wallH*0.4, 14, 10);
g.fillRect(px+tw*0.5, top+wallH*0.6, 10, 8);
g.fillRect(px+tw*0.4, top+wallH*0.75, 12, 6);
g.fillStyle(0xffd700, 0.35);
g.fillRect(px+tw*0.35-2, top, tw*0.3+4, wallH+6);
g.fillStyle(0xffe96e, 0.2);
g.fillRect(px+tw*0.38, top+4, tw*0.24, wallH-2);
g.fillStyle(0xffd700, 0.9);
const ax = px+tw*0.47, ay = py+th*0.3;
g.fillTriangle(ax,ay-8, ax+14,ay, ax,ay+8);
g.fillTriangle(ax+10,ay-8, ax+24,ay, ax+10,ay+8);
}

function drawTree(g, px, py, tw, th) {
g.fillStyle(0x000000,0.15); g.fillEllipse(px+tw/2,py+th-6,tw*0.7,18);
g.fillStyle(0x6b3d1e); g.fillRect(px+tw/2-8,py+th*0.45,16,th*0.55);
g.fillStyle(0x9a5a28); g.fillRect(px+tw/2-6,py+th*0.45,7,th*0.55);
g.fillStyle(0x1e5c0a); g.fillEllipse(px+tw/2,py+th*0.38,tw*0.82,th*0.72);
g.fillStyle(0x2e7a10); g.fillEllipse(px+tw/2,py+th*0.28,tw*0.68,th*0.58);
g.fillStyle(0x40a018); g.fillEllipse(px+tw/2,py+th*0.18,tw*0.52,th*0.44);
g.fillStyle(0x60c030,0.6); g.fillEllipse(px+tw/2-8,py+th*0.12,tw*0.28,th*0.22);
}

function drawBush(g, px, py, tw, th) {
g.fillStyle(0x000000,0.12); g.fillEllipse(px+tw/2,py+th*0.75,tw*0.7,14);
g.fillStyle(0x236010); g.fillEllipse(px+tw/2,py+th*0.6,tw*0.65,th*0.5);
g.fillStyle(0x3a8a1a); g.fillEllipse(px+tw/2,py+th*0.5,tw*0.55,th*0.42);
g.fillStyle(0x4aa020); g.fillEllipse(px+tw/2-8,py+th*0.42,tw*0.35,th*0.3);
g.fillStyle(0x4aa020); g.fillEllipse(px+tw/2+8,py+th*0.38,tw*0.3,th*0.26);
g.fillStyle(0x66c030,0.5); g.fillEllipse(px+tw/2-6,py+th*0.36,tw*0.2,th*0.16);
}

function drawFlower(g, px, py, tw, th, color) {
g.fillStyle(0x3a8a1a); g.fillRect(px+tw/2-2,py+th*0.45,4,th*0.4);
const cx=px+tw/2, cy=py+th*0.38;
[[-7,-7],[7,-7],[-7,7],[7,7],[0,-10],[0,10],[-10,0],[10,0]]
.forEach(([dx,dy])=>{g.fillStyle(color);g.fillEllipse(cx+dx,cy+dy,11,11);});
g.fillStyle(0xffe44e); g.fillEllipse(cx,cy,10,10);
}

function drawStump(g, px, py, tw, th) {
g.fillStyle(0x5a3010); g.fillEllipse(px+tw/2,py+th*0.7,tw*0.5,th*0.25);
g.fillStyle(0x7a4a20); g.fillRect(px+tw/2-14,py+th*0.35,28,th*0.4);
g.fillStyle(0x9a6030); g.fillRect(px+tw/2-12,py+th*0.35,10,th*0.4);
g.fillStyle(0x5a3010); g.fillEllipse(px+tw/2,py+th*0.35,28,16);
g.fillStyle(0x7a4a20); g.fillEllipse(px+tw/2,py+th*0.35,20,10);
}

function drawRock(g, px, py, tw, th) {
g.fillStyle(0x000000,0.15); g.fillEllipse(px+tw/2+4,py+th*0.72,tw*0.5,12);
g.fillStyle(0x666672); g.fillEllipse(px+tw/2,py+th*0.58,tw*0.42,th*0.35);
g.fillStyle(0x88889a); g.fillEllipse(px+tw/2-2,py+th*0.52,tw*0.34,th*0.27);
g.fillStyle(0xaaaabc,0.5); g.fillEllipse(px+tw/2-6,py+th*0.46,tw*0.14,th*0.1);
}

// ── SCENE ─────────────────────────────────────────────────────
class MazeScene extends Phaser.Scene {
constructor(){super({key:'MazeScene'});}

preload(){
this.load.image('grass',  'assets/tiles/grass.png');
this.load.image('dirt',   'assets/tiles/dirt.png');
this.load.image('hedge',  'assets/tiles/hedge.png');
this.load.image('heart',  'assets/ui/heart.png');
this.load.image('player', 'assets/sprites/Survivor-Front.png');
this.load.image('zombie', 'assets/sprites/Zombie-Front.png');

const bar = this.add.graphics();
this.load.on('progress', v=>{
bar.clear();
bar.fillStyle(0x000000,0.7); bar.fillRect(0,0,this.scale.width,this.scale.height);
bar.fillStyle(0x5dde3a);
bar.fillRect(this.scale.width/2-160, this.scale.height/2-14, 320*v, 28);
bar.fillStyle(0xffffff,0.08);
bar.fillRoundedRect(this.scale.width/2-162,this.scale.height/2-16,324,32,10);
});
this.load.on('complete',()=>bar.destroy());
}

create(){
this.maze     = MAZES[currentLevel];
this.walls    = [];
this.zombies  = [];
this.gameOver = false;
herdAlerted   = false;
this.transitioning = false;

const hasGrass  = this.textures.exists('grass');
const hasDirt   = this.textures.exists('dirt');
const hasHedge  = this.textures.exists('hedge');
const hasPlayer = this.textures.exists('player');
const hasZombie = this.textures.exists('zombie');

const totalW = COLS * TW;
const totalH = ROWS * TH;

const bgGfx    = this.add.graphics().setDepth(0);
const floorGfx = this.add.graphics().setDepth(1);
const wallGfx  = this.add.graphics().setDepth(5);
const decorGfx = this.add.graphics().setDepth(6);

const borderRows = 3;
for(let r=-borderRows; r<ROWS+borderRows; r++){
for(let c=-borderRows; c<COLS+borderRows; c++){
if(c>=0&&c<COLS&&r>=0&&r<ROWS) continue;
const px=c*TW, py=r*TH;
if(hasGrass){
this.add.image(px+TW/2,py+TH/2,'grass')
.setDisplaySize(TW,TH).setDepth(0);
} else {
drawGrassTile(bgGfx,px,py,TW,TH);
}
}
}

const outerDecor=[];
for(let c=0;c<COLS;c++){
outerDecor.push({c,r:-2,t:'tree'});
outerDecor.push({c,r:ROWS+1,t:'tree'});
}
[-1,-2,-3].forEach(r=>{
for(let c=1;c<COLS;c+=2) outerDecor.push({c,r,t:c%4===0?'rock':c%3===0?'stump':'bush'});
});
[ROWS,ROWS+1,ROWS+2].forEach(r=>{
for(let c=1;c<COLS;c+=2) outerDecor.push({c,r,t:c%5===0?'flower':c%3===0?'rock':'bush',col:c%2===0?0xff88cc:0xffee44});
});

outerDecor.forEach(d=>{
const px=d.c*TW, py=d.r*TH;
if(d.t==='tree')   drawTree(decorGfx,px,py,TW,TH);
else if(d.t==='bush')  drawBush(decorGfx,px,py,TW,TH);
else if(d.t==='flower') drawFlower(decorGfx,px,py,TW,TH,d.col||0xff88cc);
else if(d.t==='stump') drawStump(decorGfx,px,py,TW,TH);
else if(d.t==='rock')  drawRock(decorGfx,px,py,TW,TH);
});

let startX=TW/2, startY=TH/2;
this.exitCol=COLS-2; this.exitRow=ROWS-1;

for(let r=0;r<ROWS;r++){
for(let c=0;c<COLS;c++){
const cell=this.maze[r][c];
const px=c*TW, py=r*TH;
const cx=px+TW/2, cy=py+TH/2;

if(cell===1){
if(hasGrass){
this.add.image(cx,cy,'grass').setDisplaySize(TW,TH).setDepth(1);
} else {
drawGrassTile(floorGfx,px,py,TW,TH);
}
if(hasHedge){
this.add.image(cx,cy-WALL_H*0.4,'hedge')
.setDisplaySize(TW,TH+WALL_H*0.6).setDepth(5);
wallGfx.fillStyle(0x000000,0.18);
wallGfx.fillRect(px,py+TH-8,TW,10);
} else {
drawHedgeWall(wallGfx,px,py,TW,TH,WALL_H);
}
this.walls.push({x:px,y:py,w:TW,h:TH});

} else if(cell==='E'){
if(hasDirt){
this.add.image(cx,cy,'dirt').setDisplaySize(TW,TH).setDepth(1);
} else {
drawDirtTile(floorGfx,px,py,TW,TH);
}
drawBrokenWall(wallGfx,px,py,TW,TH,WALL_H);
this.exitCol=c; this.exitRow=r;

} else {
if(hasDirt){
this.add.image(cx,cy,'dirt').setDisplaySize(TW,TH).setDepth(1);
} else {
drawDirtTile(floorGfx,px,py,TW,TH);
}
if(cell==='S'){startX=cx;startY=cy;}
}
}
}

this.exitGlow=this.add.graphics().setDepth(4);
this.exitGlowT=0;

const playerSize = TW * 0.85;
const headSize   = playerSize * 0.45;

if(hasPlayer){
this.playerBody = this.physics.add.image(startX,startY,'player')
.setDisplaySize(playerSize, playerSize)
.setDepth(3);
this.playerHead = this.add.image(startX, startY-playerSize*0.28, 'player')
.setDisplaySize(headSize, headSize)
.setDepth(8)
.setCrop(192*0.2, 0, 192*0.6, 192*0.45);
} else {
const pg=this.add.graphics();
pg.fillStyle(0x4a7c3f); pg.fillRect(-14,-18,28,26);
pg.fillStyle(0xd4956a); pg.fillEllipse(0,-26,22,22);
pg.fillStyle(0x3a2010); pg.fillRect(-9,-34,18,10);
pg.fillStyle(0x1a1a2e); pg.fillEllipse(-5,-28,5,5); pg.fillEllipse(5,-28,5,5);
pg.generateTexture('pfb',32,50); pg.destroy();
this.playerBody=this.physics.add.image(startX,startY,'pfb').setDepth(3);
this.playerHead=this.add.image(startX,startY-22,'pfb').setDepth(8).setScale(0.6);
}
this.playerBody.setCollideWorldBounds(false);
this.player=this.playerBody;

const cfg = LEVEL_CONFIG[currentLevel]||{solo:2,herd:3};
const floorCells=[];
for(let r=0;r<ROWS;r++)
for(let c=0;c<COLS;c++)
if(this.maze[r][c]===0) floorCells.push({r,c});
Phaser.Utils.Array.Shuffle(floorCells);

const farCells=floorCells.filter(({r,c})=>{
const dx=c*TW+TW/2-startX, dy=r*TH+TH/2-startY;
return Math.sqrt(dx*dx+dy*dy) >5*TW;
});

const zombieSize = TW * 1.32;
const zombieHeadSize = zombieSize * 0.42;
const totalZ = cfg.solo + cfg.herd;

for(let i=0;i<totalZ;i++){
const cell=farCells[i%farCells.length];
const zx=cell.c*TW+TW/2, zy=cell.r*TH+TH/2;

let zbody, zhead;
if(hasZombie){
zbody=this.physics.add.image(zx,zy,'zombie')
.setDisplaySize(zombieSize,zombieSize).setDepth(3);
zhead=this.add.image(zx,zy-zombieSize*0.26,'zombie')
.setDisplaySize(zombieHeadSize,zombieHeadSize).setDepth(8)
.setCrop(192*0.2,0, 192*0.6,192*0.45);
} else {
const zg=this.add.graphics();
zg.fillStyle(0x8acc70); zg.fillEllipse(0,-18,22,22);
zg.fillStyle(0x5a7a3a); zg.fillRect(-10,-6,20,20);
zg.fillStyle(0xff2020);
zg.fillRect(-7,-22,4,4); zg.fillRect(-3,-18,4,4);
zg.fillRect(3,-22,4,4);  zg.fillRect(7,-18,4,4);
zg.fillStyle(0x1a0a0a); zg.fillEllipse(0,-10,10,6);
const fk=`zfb${i}`;
zg.generateTexture(fk,30,42); zg.destroy();
zbody=this.physics.add.image(zx,zy,fk).setDepth(3);
zhead=this.add.image(zx,zy-18,fk).setDepth(8).setScale(0.5);
}

zbody.chasing      = false;
zbody.chaseTimer   = 0;
zbody.wanderTimer  = Phaser.Math.FloatBetween(0.3,1.8);
zbody.targetX      = zx;
zbody.targetY      = zy;
zbody.bobTimer     = Phaser.Math.FloatBetween(0,Math.PI*2);
zbody.isHerd       = i >= cfg.solo;
zbody.head         = zhead;
this.zombies.push(zbody);
}

const camW = this.scale.width;
this.cameras.main.setBounds(0, 0, Math.max(totalW, camW), totalH);
this.cameras.main.setZoom(1.0);
this.cameras.main.startFollow(this.playerBody, true, 0.1, 0.08);

this.physics.world.setBounds(0, 0, totalW, totalH);

this.cursors=this.input.keyboard.createCursorKeys();
this.wasd=this.input.keyboard.addKeys({up:'W',down:'S',left:'A',right:'D'});

document.getElementById('level-display').textContent=`Level ${currentLevel+1}`;
this.updateLivesUI();
}

wallCollides(x,y,r){
for(const w of this.walls)
if(x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h) return true;
return false;
}

hasLOS(ax,ay,bx,by){
const steps=28;
for(let i=1;i<steps;i++){
const tx=ax+(bx-ax)*(i/steps), ty=ay+(by-ay)*(i/steps);
if(this.wallCollides(tx,ty,6)) return false;
}
return true;
}

syncHead(body, head, bodySize){
head.x = body.x;
head.y = body.y - bodySize * 0.28;
head.setFlipX(body.flipX);
head.setAlpha(body.alpha);
}

update(time,delta){
if(this.gameOver||this.transitioning) return;
const dt=delta/1000;
const p=this.playerBody;

this.exitGlowT+=dt*2.5;
this.exitGlow.clear();
this.exitGlow.fillStyle(0xffd700, 0.08+Math.sin(this.exitGlowT)*0.06);
this.exitGlow.fillRect(this.exitCol*TW-10,this.exitRow*TH-10,TW+20,TH+20);

let vx=0,vy=0;
if(this.cursors.left.isDown||this.wasd.left.isDown)  vx=-PLAYER_SPD;
if(this.cursors.right.isDown||this.wasd.right.isDown) vx=+PLAYER_SPD;
if(this.cursors.up.isDown||this.wasd.up.isDown)    vy=-PLAYER_SPD;
if(this.cursors.down.isDown||this.wasd.down.isDown)  vy=+PLAYER_SPD;
if(vx!==0&&vy!==0){vx*=0.707;vy*=0.707;}

const nx=p.x+vx*dt, ny=p.y+vy*dt;
if(!this.wallCollides(nx,p.y,28)) p.x=nx;
if(!this.wallCollides(p.x,ny,28)) p.y=ny;
if(vx<0) p.setFlipX(true);
if(vx>0) p.setFlipX(false);

const pSize = TW*0.85;
this.syncHead(p, this.playerHead, pSize);

p.setDepth(3+p.y*0.0001);
this.playerHead.setDepth(8+p.y*0.0001);

const ex=this.exitCol*TW+TW/2, ey=this.exitRow*TH+TH/2;
if(Math.hypot(p.x-ex,p.y-ey)<TW*0.45) this.triggerLevelComplete();

this.zombies.forEach(z=>{
const dx=p.x-z.x, dy=p.y-z.y;
const dist=Math.hypot(dx,dy);
const canSee=dist<SIGHT_R&&this.hasLOS(z.x,z.y,p.x,p.y);

if(canSee){
z.chasing=true;
z.chaseTimer=CHASE_MEMORY;

if(!herdAlerted){
herdAlerted=true;
this.zombies.forEach(other=>{
if(other!==z&&other.isHerd){
const hd=Math.hypot(other.x-z.x,other.y-z.y);
if(hd<HERD_RADIUS){
other.chasing=true;
other.chaseTimer=CHASE_MEMORY;
}
}
});
document.getElementById('alert-bar').classList.add('show');
this.time.delayedCall(3000,()=>
document.getElementById('alert-bar').classList.remove('show')
);
}
} else {
if(z.chaseTimer>0){
z.chaseTimer-=dt;
if(z.chaseTimer<=0) z.chasing=false;
}
}

if(z.chasing){
const len=dist||1;
const spd=CHASE_SPD*(z.isHerd?1.15:1);
let zx2=z.x+(dx/len)*spd*dt;
let zy2=z.y+(dy/len)*spd*dt;

if(!this.wallCollides(zx2,z.y,22)) z.x=zx2;
else {
if(!this.wallCollides(zx2,z.y-20,22)){z.x=zx2;z.y-=18*dt;}
else if(!this.wallCollides(zx2,z.y+20,22)){z.x=zx2;z.y+=18*dt;}
}
if(!this.wallCollides(z.x,zy2,22)) z.y=zy2;
else {
if(!this.wallCollides(z.x-20,zy2,22)){z.x-=18*dt;z.y=zy2;}
else if(!this.wallCollides(z.x+20,zy2,22)){z.x+=18*dt;z.y=zy2;}
}

if(dx<0) z.setFlipX(true); else z.setFlipX(false);
} else {
z.wanderTimer-=dt;
if(z.wanderTimer<=0){
const floorCells=[];
for(let r=0;r<ROWS;r++)
for(let c=0;c<COLS;c++)
if(this.maze[r][c]===0||this.maze[r][c]==='S')
floorCells.push({
x:c*TW+TW/2,
y:r*TH+TH/2
});
if(floorCells.length){
const dest=Phaser.Utils.Array.GetRandom(floorCells);
z.targetX=dest.x;
z.targetY=dest.y;
}
z.wanderTimer=Phaser.Math.FloatBetween(2.5,5.5);
}

const tdx=z.targetX-z.x, tdy=z.targetY-z.y;
const tlen=Math.hypot(tdx,tdy)||1;
if(tlen>8){
let zx2=z.x+(tdx/tlen)*WANDER_SPD*dt;
let zy2=z.y+(tdy/tlen)*WANDER_SPD*dt;
if(!this.wallCollides(zx2,z.y,22)) z.x=zx2;
else {
z.targetX=z.x+Phaser.Math.Between(-TW,TW);
z.wanderTimer=0.5;
}
if(!this.wallCollides(z.x,zy2,22)) z.y=zy2;
else {
z.targetY=z.y+Phaser.Math.Between(-TH,TH);
z.wanderTimer=0.5;
}
if(tdx<0) z.setFlipX(true); else z.setFlipX(false);
}
}

z.bobTimer+=dt*(z.chasing?8:4);
const bobOff=Math.sin(z.bobTimer)*1.2;

z.setDepth(3+z.y*0.0001);
const zSize=TW*0.82;
z.head.x=z.x;
z.head.y=z.y-zSize*0.26+bobOff;
z.head.setFlipX(z.flipX);
z.head.setAlpha(z.alpha);
z.head.setDepth(8+z.y*0.0001);

if(!invincible&&dist<30) this.hitPlayer();
});
}

hitPlayer(){
if(invincible) return;
lives--;
invincible=true;
this.updateLivesUI();
this.cameras.main.shake(280,0.014);
let bc=0;
this.time.addEvent({delay:160,repeat:13,callback:()=>{
const a=this.playerBody.alpha<1?1:0.22;
this.playerBody.setAlpha(a);
this.playerHead.setAlpha(a);
if(++bc>=14){invincible=false;this.playerBody.setAlpha(1);this.playerHead.setAlpha(1);}
}});
if(lives<=0){
this.gameOver=true;
this.time.delayedCall(500,()=>{
showOverlay('🧟','Game Over','The zombies got you...','Try Again',()=>{
lives=3;currentLevel=0;invincible=false;herdAlerted=false;
this.scene.restart();
});
});
}
}

triggerLevelComplete(){
if(this.gameOver||this.transitioning) return;
this.transitioning=true;
const isLast=currentLevel>=MAZES.length-1;
this.cameras.main.flash(300,255,230,50);

if(!isLast){
const nextX=this.cameras.main.scrollX+this.scale.width*1.2;
this.cameras.main.stopFollow();
this.cameras.main.pan(
nextX, this.cameras.main.scrollY+this.scale.height/2,
900, 'Sine.easeInOut', false,
(cam, progress)=>{
if(progress===1){
currentLevel++;
invincible=false;
herdAlerted=false;
this.scene.restart();
}
}
);
} else {
this.time.delayedCall(400,()=>{
showOverlay('🏆','You Escaped!','You survived all garden levels! More coming soon.','Play Again',()=>{
currentLevel=0;lives=3;invincible=false;herdAlerted=false;
this.scene.restart();
});
});
}
}

updateLivesUI(){
const el=document.getElementById('lives-display');
el.innerHTML='';
const hasHeart=this.textures.exists('heart');
for(let i=0;i<3;i++){
if(hasHeart){
const img=document.createElement('img');
img.src='assets/ui/heart.png';
img.style.cssText=`width:28px;height:28px;object-fit:contain;${i>=lives?'filter:grayscale(1);opacity:0.3;':''}`;
el.appendChild(img);
} else {
const s=document.createElement('span');
s.className='heart'+(i>=lives?' lost':'');
s.textContent='❤️';
el.appendChild(s);
}
}
}
}

function showOverlay(icon,title,msg,btn,cb){
document.getElementById('overlay-icon').textContent=icon;
document.getElementById('overlay-title').textContent=title;
document.getElementById('overlay-msg').textContent=msg;
const b=document.getElementById('overlay-btn');
b.textContent=btn;
b.onclick=()=>{document.getElementById('overlay').classList.remove('show');cb();};
document.getElementById('overlay').classList.add('show');
}

const config={
type:Phaser.AUTO,
width:window.innerWidth,
height:GAME_H,
backgroundColor:'#2a4a1a',
parent:'game-container',
physics:{default:'arcade',arcade:{debug:false}},
scene:MazeScene,
};
const game=new Phaser.Game(config);
window.addEventListener('resize',()=>{
game.scale.resize(window.innerWidth, GAME_H);
});
</script>
</body>
</html>