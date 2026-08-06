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

// Helper to play sound effects reliably
function playSFX(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay fallback catch
  });
}

// --- Intro Splash Logic (Mobile-Safe) ---
function hideIntro() {
  if (introScreen.classList.contains('fade-out')) return;
  
  introScreen.classList.add('fade-out');
  setTimeout(() => {
    introScreen.style.display = 'none';
  }, 800);
}

// Trigger intro hide 2 seconds after HTML DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hideIntro, 2000);
  });
} else {
  setTimeout(hideIntro, 2000);
}

// Fallback guarantee: force hide splash screen after 3.5s regardless of asset loading
setTimeout(hideIntro, 3500);

// --- Game State & Constants ---
const GAME_STATE = {
  START: 'START',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

let currentState = GAME_STATE.START;
let score = 0;
let highScore = localStorage.getItem('apple_bird_highscore') || 0;
let frames = 0;

// Game Physics Adjustments
const bird = {
  x: 50,
  y: 150,
  w: 34,
  h: 24,
  gravity: 0.08,
  jump: 3.5,
  velocity: 0,
  
  draw() {
    ctx.drawImage(birdImg, this.x, this.y, this.w, this.h);
  },
  
  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    
    // Bottom boundary check
    if (this.y + this.h >= canvas.height) {
      this.y = canvas.height - this.h;
      triggerGameOver();
    }
  },
  
  flap() {
    this.velocity = -this.jump;
    playSFX(sfxWing);
  },
  
  reset() {
    this.y = 150;
    this.velocity = 0;
  }
};

const pipes = {
  position: [],
  topImg: new Image(),
  bottomImg: new Image(),
  w: 52,
  gap: 130,
  dx: 1.0,
  
  reset() {
    this.position = [];
  },
  
  update() {
    if (frames % 160 === 0) {
      const topHeight = Math.floor(Math.random() * (canvas.height - this.gap - 100)) + 50;
      this.position.push({
        x: canvas.width,
        top: topHeight,
        passed: false
      });
    }
    
    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      p.x -= this.dx;
      
      // Collision check with Bird
      if (
        bird.x + bird.w > p.x &&
        bird.x < p.x + this.w &&
        (bird.y < p.top || bird.y + bird.h > p.top + this.gap)
      ) {
        triggerGameOver();
      }
      
      // Score increment
      if (p.x + this.w < bird.x && !p.passed) {
        score++;
        p.passed = true;
        playSFX(sfxPoint);
      }
    }
    
    // Remove offscreen pipes
    if (this.position.length > 0 && this.position[0].x < -this.w) {
      this.position.shift();
    }
  },
  
  draw() {
    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      
      // Top pipe
      ctx.fillStyle = '#2e8b57';
      ctx.fillRect(p.x, 0, this.w, p.top);
      
      // Bottom pipe
      ctx.fillRect(p.x, p.top + this.gap, this.w, canvas.height - (p.top + this.gap));
    }
  }
};

function startCountdown() {
  uiOverlay.classList.add('hidden');
  countdownOverlay.classList.remove('hidden');
  currentState = GAME_STATE.COUNTDOWN;
  
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

function handleInput() {
  if (currentState === GAME_STATE.PLAYING) {
    bird.flap();
  }
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (currentState === GAME_STATE.PLAYING) handleInput();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (currentState === GAME_STATE.PLAYING) handleInput();
}, { passive: false });

canvas.addEventListener('mousedown', () => {
  if (currentState === GAME_STATE.PLAYING) handleInput();
});

startBtn.addEventListener('click', () => {
  score = 0;
  bird.reset();
  pipes.reset();
  startCountdown();
});

restartBtn.addEventListener('click', () => {
  score = 0;
  bird.reset();
  pipes.reset();
  gameoverMessage.classList.add('hidden');
  startCountdown();
});

// --- Main Game Loop ---
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render Background
  if (bgImg.complete) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  }
  
  if (currentState === GAME_STATE.PLAYING) {
    bird.update();
    pipes.update();
    frames++;
  }
  
  pipes.draw();
  bird.draw();
  
  // Draw Score
  if (currentState === GAME_STATE.PLAYING) {
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.font = '35px Segoe UI, sans-serif';
    ctx.fillText(score, canvas.width / 2 - 10, 50);
    ctx.strokeText(score, canvas.width / 2 - 10, 50);
  }
  
  requestAnimationFrame(loop);
}

loop();