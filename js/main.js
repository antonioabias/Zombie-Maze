import { GAME_H } from './config.js';
import { MazeScene } from './scene.js';
import { Menu } from './menu.js';

let game = null;
let menu = null;

// Initialize menu first — game waits until Play is clicked
function initMenu() {
  menu = new Menu({
    onPlay: startGame,
    gameRef: null
  });
}

function startGame() {
  if (game) {
    // Game already created, just resume
    game.scene.resume('MazeScene');
    return;
  }

  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: GAME_H,
    backgroundColor: '#0a1a0a',
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: MazeScene,
  };

  game = new Phaser.Game(config);
  menu.gameRef = game;

  // Apply saved settings once the scene is ready
  game.events.once('ready', () => {
    const scene = game.scene.getScene('MazeScene');
    if (scene) menu.applyToScene(scene);
  });
}

// Resize handler
window.addEventListener('resize', () => {
  if (game) game.scale.resize(window.innerWidth, GAME_H);
});

// Boot
initMenu();