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

// Helper to reliably play sound effects even during rapid inputs
function playSFX(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Gracefully handle browser autoplay policies if sound is blocked
  });
}

// Intro Splash Logic
window.addEventListener('load', () => {
  setTimeout(() => {
    introScreen.classList.add('fade-out');
    setTimeout(() => {
      introScreen.style.display = 'none';
    }, 800);
  }, 2000);
});

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

// Bird Properties
const bird = {
  x: 50,
  y: 250,
  w: 38,
  h: 38,
  gravity: 0.11,
  jump: 4.2,
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
    playSFX(sfxWing); // Play wing SFX on flap
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
  dx: 1.3,

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

    if (frames % 160 === 0) {
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

      // Score Increase & Sound
      if (p.x + 52 < bird.x && !p.passed) {
        score++;
        p.passed = true;
        playSFX(sfxPoint); // Play point SFX on score
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

// Draw Live Score Display
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

// Countdown & Game Flow Handlers
function startCountdown() {
  currentState = GAME_STATE.COUNTDOWN;
  uiOverlay.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');

  score = 0;
  pipes.reset();
  bird.reset();

  let count = 3;
  countdownText.textContent = count;
  countdownText.style.animation = 'none';
  countdownText.offsetHeight; 
  countdownText.style.animation = null;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
      countdownText.style.animation = 'none';
      countdownText.offsetHeight; 
      countdownText.style.animation = null;
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      currentState = GAME_STATE.PLAYING;
    }
  }, 900);
}

function triggerGameOver() {
  if (currentState !== GAME_STATE.GAMEOVER) {
    playSFX(sfxHit); // Play hit SFX on collision
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

function handleInput() {
  if (currentState === GAME_STATE.PLAYING) {
    bird.flap();
  }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (currentState === GAME_STATE.PLAYING) handleInput();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (currentState === GAME_STATE.PLAYING) handleInput();
});

canvas.addEventListener('mousedown', () => {
  if (currentState === GAME_STATE.PLAYING) handleInput();
});

startBtn.addEventListener('click', startCountdown);
restartBtn.addEventListener('click', startCountdown);

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
