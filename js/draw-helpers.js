import { TW, TH, WALL_H } from './config.js';

export function drawGrassTile(g, px, py) {
  const colors = [0x5a9e30, 0x5da832, 0x58962e, 0x60a635];
  g.fillStyle(colors[(Math.floor(px/TW)*3 + Math.floor(py/TH)*7) % 4]);
  g.fillRect(px, py, TW, TH);
  g.fillStyle(0x4a8820, 0.4);
  g.fillRect(px+6, py+8, 4, 10);
  g.fillRect(px+10, py+6, 3, 12);
  g.fillRect(px+TW-14, py+10, 4, 9);
  g.fillStyle(0x000000, 0.05);
  g.fillRect(px, py+TH-3, TW, 3);
  g.fillRect(px+TW-3, py, 3, TH);
}

export function drawDirtTile(g, px, py) {
  g.fillStyle(0x9c6b3c);
  g.fillRect(px, py, TW, TH);
  g.fillStyle(0xb07d4a);
  g.fillRect(px+4, py+4, TW-8, TH-8);
  g.fillStyle(0x7a5028, 0.6);
  const s = (Math.floor(px/TW)*5 + Math.floor(py/TH)*9) % 4;
  if(s===0){g.fillRect(px+12,py+14,7,5);g.fillRect(px+55,py+40,6,5);}
  if(s===1){g.fillRect(px+25,py+8,6,7);g.fillRect(px+68,py+52,7,5);}
  if(s===2){g.fillRect(px+18,py+48,8,5);g.fillRect(px+50,py+12,6,6);}
  if(s===3){g.fillRect(px+10,py+32,6,5);g.fillRect(px+62,py+22,7,4);}
  g.fillStyle(0x000000,0.07);
  g.fillRect(px,py+TH-4,TW,4);
  g.fillRect(px+TW-4,py,4,TH);
}

export function drawHedgeWall(g, px, py) {
  g.fillStyle(0x000000,0.22);
  g.fillRect(px+6, py+TH-6, TW-6, 10);
  const top = py - WALL_H + TH;
  g.fillStyle(0x236010);
  g.fillRect(px, top, TW, WALL_H+6);
  g.fillStyle(0x3a8a1a);
  g.fillRect(px, top, TW, 16);
  const blobs = [[2,0,22,18],[24,-3,20,22],[46,0,22,18],[68,-2,18,20],[86,1,10,16]];
  g.fillStyle(0x4aa020);
  blobs.forEach(([bx,by,bw,bh]) => g.fillRect(px+bx, top+by, bw, bh));
  g.fillStyle(0x6acc30,0.65);
  g.fillRect(px+4, top+2, 10, 8);
  g.fillRect(px+28, top+0, 10, 8);
  g.fillRect(px+52, top+2, 10, 7);
  g.fillRect(px+74, top+0, 8, 7);
  g.fillStyle(0x122a08,0.5);
  g.fillRect(px+24, top, 5, WALL_H+6);
  g.fillRect(px+46, top, 5, WALL_H+6);
  g.fillRect(px+68, top, 5, WALL_H+6);
  g.fillStyle(0x000000,0.2);
  g.fillRect(px, top, 5, WALL_H+6);
  g.fillStyle(0x78d840,0.5);
  g.fillRect(px, top, TW, 4);
}

export function drawBrokenHedgeOpening(g, px, py) {
  const top = py - WALL_H + TH;
  g.fillStyle(0x000000,0.2);
  g.fillRect(px+6, py+TH-6, TW-12, 8);
  g.fillStyle(0x236010);
  g.fillRect(px-4, top, 14, WALL_H+6);
  g.fillStyle(0x3a8a1a);
  g.fillRect(px-4, top, 14, 14);
  g.fillStyle(0x4aa020);
  g.fillRect(px-2, top+2, 10, 10);
  g.fillStyle(0x6acc30,0.6);
  g.fillRect(px, top+2, 6, 6);
  g.fillStyle(0x236010);
  g.fillRect(px+TW-10, top, 14, WALL_H+6);
  g.fillStyle(0x3a8a1a);
  g.fillRect(px+TW-10, top, 14, 14);
  g.fillStyle(0x4aa020);
  g.fillRect(px+TW-8, top+2, 10, 10);
  g.fillStyle(0x6acc30,0.6);
  g.fillRect(px+TW-6, top+2, 6, 6);
  g.fillStyle(0x236010);
  g.fillRect(px+14, top+WALL_H*0.5, 8, WALL_H*0.5+6);
  g.fillRect(px+TW-22, top+WALL_H*0.4, 8, WALL_H*0.6+6);
  g.fillStyle(0x3a8a1a);
  g.fillRect(px+14, top+WALL_H*0.5, 8, 10);
  g.fillRect(px+TW-22, top+WALL_H*0.4, 8, 10);
  g.fillStyle(0x9c6b3c, 0.6);
  g.fillRect(px+10, py+TH-12, TW-20, 12);
  g.fillStyle(0xffd700, 0.3);
  g.fillEllipse(px+TW/2, py+TH/2, TW*0.7, TH*0.5);
  g.fillStyle(0xffe96e, 0.5);
  g.fillEllipse(px+TW/2, py+TH/2, TW*0.4, TH*0.3);
}

export function drawTree(g, px, py) {
  g.fillStyle(0x000000,0.15); g.fillEllipse(px+TW/2,py+TH-6,TW*0.7,18);
  g.fillStyle(0x6b3d1e); g.fillRect(px+TW/2-8,py+TH*0.45,16,TH*0.55);
  g.fillStyle(0x9a5a28); g.fillRect(px+TW/2-6,py+TH*0.45,7,TH*0.55);
  g.fillStyle(0x1e5c0a); g.fillEllipse(px+TW/2,py+TH*0.38,TW*0.82,TH*0.72);
  g.fillStyle(0x2e7a10); g.fillEllipse(px+TW/2,py+TH*0.28,TW*0.68,TH*0.58);
  g.fillStyle(0x40a018); g.fillEllipse(px+TW/2,py+TH*0.18,TW*0.52,TH*0.44);
  g.fillStyle(0x60c030,0.6); g.fillEllipse(px+TW/2-8,py+TH*0.12,TW*0.28,TH*0.22);
}

export function drawBush(g, px, py) {
  g.fillStyle(0x000000,0.12); g.fillEllipse(px+TW/2,py+TH*0.75,TW*0.7,14);
  g.fillStyle(0x236010); g.fillEllipse(px+TW/2,py+TH*0.6,TW*0.65,TH*0.5);
  g.fillStyle(0x3a8a1a); g.fillEllipse(px+TW/2,py+TH*0.5,TW*0.55,TH*0.42);
  g.fillStyle(0x4aa020); g.fillEllipse(px+TW/2-8,py+TH*0.42,TW*0.35,TH*0.3);
  g.fillStyle(0x4aa020); g.fillEllipse(px+TW/2+8,py+TH*0.38,TW*0.3,TH*0.26);
  g.fillStyle(0x66c030,0.5); g.fillEllipse(px+TW/2-6,py+TH*0.36,TW*0.2,TH*0.16);
}

export function drawFlower(g, px, py, color) {
  g.fillStyle(0x3a8a1a); g.fillRect(px+TW/2-2,py+TH*0.45,4,TH*0.4);
  const cx=px+TW/2, cy=py+TH*0.38;
  [[-7,-7],[7,-7],[-7,7],[7,7],[0,-10],[0,10],[-10,0],[10,0]]
    .forEach(([dx,dy]) => {g.fillStyle(color);g.fillEllipse(cx+dx,cy+dy,11,11);});
  g.fillStyle(0xffe44e); g.fillEllipse(cx,cy,10,10);
}

export function drawStump(g, px, py) {
  g.fillStyle(0x5a3010); g.fillEllipse(px+TW/2,py+TH*0.7,TW*0.5,TH*0.25);
  g.fillStyle(0x7a4a20); g.fillRect(px+TW/2-14,py+TH*0.35,28,TH*0.4);
  g.fillStyle(0x9a6030); g.fillRect(px+TW/2-12,py+TH*0.35,10,TH*0.4);
  g.fillStyle(0x5a3010); g.fillEllipse(px+TW/2,py+TH*0.35,28,16);
  g.fillStyle(0x7a4a20); g.fillEllipse(px+TW/2,py+TH*0.35,20,10);
}

export function drawRock(g, px, py) {
  g.fillStyle(0x000000,0.15); g.fillEllipse(px+TW/2+4,py+TH*0.72,TW*0.5,12);
  g.fillStyle(0x666672); g.fillEllipse(px+TW/2,py+TH*0.58,TW*0.42,TH*0.35);
  g.fillStyle(0x88889a); g.fillEllipse(px+TW/2-2,py+TH*0.52,TW*0.34,TH*0.27);
  g.fillStyle(0xaaaabc,0.5); g.fillEllipse(px+TW/2-6,py+TH*0.46,TW*0.14,TH*0.1);
}