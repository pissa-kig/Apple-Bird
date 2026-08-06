// --- Game Initialization & Assets ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const introScreen = document.getElementById('intro-screen');
const uiOverlay = document.getElementById('ui-overlay');
const startMessage = document.getElementById('start-message');
const gameoverMessage = document.getElementById('gameover-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');

const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');

// Load Custom Sprites
const bgImg = new Image();
bgImg.src = 'imgs/bgnd.png';

const birdImg = new Image();
birdImg.src = 'imgs/flappy.png';

// Load Sound Effects
const sfxPoint = new Audio('sfx/point.wav');
const sfxWing = new Audio('sfx/wing.wav');
const sfxHit = new Audio('sfx/hit.wav');

let audioUnlocked = false;

// Unlock mobile web audio on first tap
function unlockAudio() {
  if (audioUnlocked) return;
  [sfxPoint, sfxWing, sfxHit].forEach(audio => {
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
  });
  audioUnlocked = true;
}

// Helper to play sound effects reliably
function playSFX(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// --- Intro Splash Logic (Mobile Safe) ---
function hideIntro() {
  if (introScreen.classList.contains('fade-out')) return;
  introScreen.classList.add('fade-out');
  setTimeout(() => {
    introScreen.style.display = 'none';
  }, 800);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(hideIntro, 2000));
} else {
  setTimeout(hideIntro, 2000);
}
setTimeout(hideIntro, 3500);

// --- Game State & Constants ---
const GAME_STATE = {
  START: 'START',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

let currentState = GAME_STATE.START;
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('apple_bird_highscore') || 0;

// Bird Properties & Physics
const bird = {
  x: 50,
  y: 250,
  w: 38,
  h: 38,
  gravity: 0.22,
  jump: 5.2,
  velocity: 0,
  rotation: 0,
  
  draw() {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    
    if (this.velocity < 0) {
      this.rotation = -0.25;
    } else {
      this.rotation = Math.min(Math.PI / 2.5, this.rotation + 0.03);
    }
    ctx.rotate(this.rotation);

    if (birdImg.complete && birdImg.naturalWidth !== 0) {
      ctx.drawImage(birdImg, -this.w / 2, -this.h / 2, this.w, this.h);
    } else {
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  update() {
    if (currentState === GAME_STATE.PLAYING) {
      this.velocity += this.gravity;
      this.y += this.velocity;

      // Floor collision check
      if (this.y + this.h >= canvas.height - 20) {
        this.y = canvas.height - 20 - this.h;
        triggerGameOver();
      }

      // Ceiling collision check
      if (this.y <= 0) {
        this.y = 0;
        this.velocity = 0;
      }
    }
  },

  flap() {
    this.velocity = -this.jump;
    playSFX(sfxWing);
  },

  reset() {
    this.y = 250;
    this.velocity = 0;
    this.rotation = 0;
  }
};

// Pipe Obstacles
const pipes = {
  position: [],
  topGap: 145,
  dx: 1.5,

  draw() {
    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      let topY = p.y;
      let bottomY = p.y + this.topGap;

      ctx.fillStyle = '#2c3e50';
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 3;

      // Top Pipe
      ctx.fillRect(p.x, 0, 52, topY);
      ctx.strokeRect(p.x, 0, 52, topY);

      // Bottom Pipe
      ctx.fillRect(p.x, bottomY, 52, canvas.height - bottomY);
      ctx.strokeRect(p.x, bottomY, 52, canvas.height - bottomY);
    }
  },

  update() {
    if (currentState !== GAME_STATE.PLAYING) return;

    if (frames % 130 === 0) {
      this.position.push({
        x: canvas.width,
        y: Math.floor(Math.random() * (220 - 50 + 1)) + 50,
        passed: false
      });
    }

    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      p.x -= this.dx;

      let topPipeBottom = p.y;
      let bottomPipeTop = p.y + this.topGap;

      // Collision Detection
      if (
        bird.x + bird.w > p.x &&
        bird.x < p.x + 52 &&
        (bird.y < topPipeBottom || bird.y + bird.h > bottomPipeTop)
      ) {
        triggerGameOver();
      }

      // Score Increase
      if (p.x + 52 < bird.x && !p.passed) {
        score++;
        p.passed = true;
        playSFX(sfxPoint);
      }

      // Remove offscreen pipes
      if (p.x + 52 <= 0) {
        this.position.shift();
        i--;
      }
    }
  },

  reset() {
    this.position = [];
  }
};

// Background Rendering
function drawBackground() {
  if (bgImg.complete && bgImg.naturalWidth !== 0) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1c29');
    gradient.addColorStop(1, '#0f1016');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Live Score
function drawScore() {
  if (currentState === GAME_STATE.PLAYING) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.font = 'bold 36px Segoe UI, sans-serif';
    ctx.textAlign = 'center';

    ctx.strokeText(score, canvas.width / 2, 50);
    ctx.fillText(score, canvas.width / 2, 50);
  }
}

// Flow Handlers
function startCountdown() {
  currentState = GAME_STATE.COUNTDOWN;
  uiOverlay.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');

  score = 0;
  pipes.reset();
  bird.reset();

  let count = 3;
  countdownText.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      currentState = GAME_STATE.PLAYING;
    }
  }, 900);
}

function triggerGameOver() {
  if (currentState !== GAME_STATE.GAMEOVER) {
    playSFX(sfxHit);
  }

  currentState = GAME_STATE.GAMEOVER;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('apple_bird_highscore', highScore);
  }
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = highScore;

  startMessage.classList.add('hidden');
  gameoverMessage.classList.remove('hidden');
  uiOverlay.classList.remove('hidden');
}

function handleInput(e) {
  unlockAudio();
  if (currentState === GAME_STATE.PLAYING) {
    bird.flap();
  }
}

// Global Mobile Touch & Desktop Key Listeners
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleInput(e);
  }
});

window.addEventListener('touchstart', (e) => {
  if (currentState === GAME_STATE.PLAYING) {
    e.preventDefault();
    handleInput(e);
  }
}, { passive: false });

window.addEventListener('mousedown', (e) => {
  if (currentState === GAME_STATE.PLAYING && e.target.tagName !== 'BUTTON') {
    handleInput(e);
  }
});

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  unlockAudio();
  startCountdown();
});

restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  unlockAudio();
  startCountdown();
});

// Core Loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  pipes.draw();
  pipes.update();
  bird.draw();
  bird.update();
  drawScore();

  frames++;
  requestAnimationFrame(loop);
}

loop();