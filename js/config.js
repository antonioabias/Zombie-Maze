// ── Game Constants ──────────────────────────────────────────
export const GAME_H        = window.innerHeight;
export const TW            = 96;   // tile width
export const TH            = 96;   // tile height
export const WALL_H        = 72;
export const COLS          = 30;
export const ROWS          = 19;
export const PLAYER_SPD    = 200;
export const WANDER_SPD    = 70;
export const CHASE_SPD     = 120;
export const SIGHT_R       = 320;
export const CHASE_MEMORY  = 4;
export const HERD_RADIUS   = 360;
export const ZOMBIE_SOUND_CD = 2500;
export const VISION_RADIUS = 180;

export const LEVEL_CONFIG = [
  { solo: 2, herd: 4 },
  { solo: 3, herd: 6 },
  { solo: 4, herd: 8 },
];

// ── Shared game state ───────────────────────────────────────
export const state = {
  currentLevel: 0,
  lives: 3,
  invincible: false,
  herdAlerted: false,
};