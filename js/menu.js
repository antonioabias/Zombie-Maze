// ── Menu module: handles main menu + modals ────────────────

const MENU_CONTENT = {
  instructions: {
    title: '📖 How to Play',
    body: `
      <h3>🎯 Objective</h3>
      <p>Navigate through the hedge maze and reach the <strong style="color:#ffe135">golden exit</strong> on the far side. Avoid the zombies!</p>

      <h3>🎮 Controls</h3>
      <ul>
        <li>Move: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys</li>
        <li>Diagonal movement works too!</li>
      </ul>

      <h3>🧟 Zombies</h3>
      <ul>
        <li>Zombies wander the maze until they spot you</li>
        <li>If one sees you, nearby zombies form a <strong style="color:#ff6b6b">HORDE</strong> and chase!</li>
        <li>Break their line of sight by hiding behind hedges</li>
        <li>You have <strong>3 lives</strong> — each zombie hit costs one ❤️</li>
      </ul>

      <h3>🏁 The Exit</h3>
      <p>Look for the <strong style="color:#ffe135">broken hedge opening</strong> with a golden glow. Touch it to advance!</p>
    `
  },
  settings: {
    title: '⚙️ Settings',
    body: `
      <div class="setting-row">
        <label>🎵 Background Music</label>
        <input type="range" id="vol-bgm" min="0" max="100" value="40">
      </div>
      <div class="setting-row">
        <label>🧟 Zombie Sounds</label>
        <input type="range" id="vol-zombie" min="0" max="100" value="70">
      </div>
      <div class="setting-row">
        <label>📳 Screen Shake</label>
        <input type="checkbox" id="opt-shake" checked style="width:20px;height:20px;accent-color:#5dde3a;">
      </div>
      <p style="margin-top:20px;font-size:13px;opacity:0.6;">Settings are saved automatically.</p>
    `
  },
  about: {
    title: 'ℹ️ About',
    body: `
      <h3>Zombie Maze</h3>
      <p>A 2D survival maze game built with <strong>Phaser 3</strong>.</p>

      <h3>Credits</h3>
      <ul>
        <li>Game Design & Code — You!</li>
        <li>Engine — Phaser 3.60</li>
        <li>Font — Fredoka One & Nunito (Google Fonts)</li>
      </ul>

      <h3>Version</h3>
      <p>v1.1.0 • June 2026</p>

      <p style="margin-top:20px;font-style:italic;opacity:0.6;">
        Thanks for playing! Can you survive all 3 levels? 🧟
      </p>
    `
  }
};

export class Menu {
  constructor({ onPlay, gameRef }) {
    this.onPlay = onPlay;
    this.gameRef = gameRef; // will be set when game starts
    this._bindButtons();
    this._loadSettings();
  }

  _bindButtons() {
    document.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'play') this._startGame();
        else this._openModal(action);
      });
    });

    document.getElementById('modal-close').addEventListener('click', () => this._closeModal());
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') this._closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._closeModal();
    });
  }

  _startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-wrap').classList.remove('hidden');
    if (this.onPlay) this.onPlay();
  }

  _openModal(key) {
    const data = MENU_CONTENT[key];
    if (!data) return;
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-body').innerHTML = data.body;
    document.getElementById('modal').classList.remove('hidden');

    // Bind settings sliders if this is the settings modal
    if (key === 'settings') this._bindSettingsControls();
  }

  _closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  _bindSettingsControls() {
    const bgmSlider = document.getElementById('vol-bgm');
    const zombieSlider = document.getElementById('vol-zombie');
    const shakeCheck = document.getElementById('opt-shake');

    if (bgmSlider) {
      bgmSlider.addEventListener('input', (e) => {
        const v = e.target.value / 100;
        this._saveSetting('bgmVolume', v);
        if (this.gameRef && this.gameRef.scene.scenes[0] && this.gameRef.scene.scenes[0].bgm) {
          this.gameRef.scene.scenes[0].bgm.setVolume(v);
        }
      });
    }
    if (zombieSlider) {
      zombieSlider.addEventListener('input', (e) => {
        const v = e.target.value / 100;
        this._saveSetting('zombieVolume', v);
        if (this.gameRef && this.gameRef.scene.scenes[0] && this.gameRef.scene.scenes[0].zombieSound) {
          this.gameRef.scene.scenes[0].zombieSound.setVolume(v);
        }
      });
    }
    if (shakeCheck) {
      shakeCheck.addEventListener('change', (e) => {
        this._saveSetting('screenShake', e.target.checked);
      });
    }
  }

  _saveSetting(key, value) {
    try { localStorage.setItem(`zm_${key}`, JSON.stringify(value)); } catch (e) {}
  }

  _loadSettings() {
    try {
      const bgm = localStorage.getItem('zm_bgmVolume');
      const zombie = localStorage.getItem('zm_zombieVolume');
      const shake = localStorage.getItem('zm_screenShake');

      if (bgm !== null) this.bgmVolume = JSON.parse(bgm);
      else this.bgmVolume = 0.4;

      if (zombie !== null) this.zombieVolume = JSON.parse(zombie);
      else this.zombieVolume = 0.7;

      if (shake !== null) this.screenShake = JSON.parse(shake);
      else this.screenShake = true;
    } catch (e) {
      this.bgmVolume = 0.4;
      this.zombieVolume = 0.7;
      this.screenShake = true;
    }
  }

  // Called by the game scene to apply loaded volumes
  applyToScene(scene) {
    if (scene.bgm) scene.bgm.setVolume(this.bgmVolume);
    if (scene.zombieSound) scene.zombieSound.setVolume(this.zombieVolume);
  }
}