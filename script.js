const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const targetEl = document.getElementById("target");
const retryOverlay = document.getElementById("retry");
const retryBtn = document.getElementById("retry-btn");
const winOverlay = document.getElementById("win");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const muteBtn = document.getElementById("mute-btn");
const bgMusic = document.getElementById("bg-music");
const finalMessage = document.getElementById("final-message");
const startHint = document.getElementById("start-hint");

const TARGET_SCORE = 23;
const GRAVITY = 0.24;
const JUMP = -7.6;
const OBSTACLE_SPEED = 1.4;
const OBSTACLE_GAP = 200;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_INTERVAL = 1750;
const BIRTHDAY_SCORE = 4;
const BOOST_DURATION = 3000;
const COLLISION_SKIP = 5;
const COLLISION_COOLDOWN = 800;

let player;
let obstacles;
let score;
let playing;
let lastTime = 0;
let obstacleTimer = 0;
let audioStarted = false;
let boostTimer = 0;
let collisionCooldown = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

function resetGame() {
  player = {
    x: 80,
    y: canvas.clientHeight / 2,
    radius: 16,
    velocity: 0,
  };
  obstacles = [];
  score = 0;
  playing = true;
  lastTime = performance.now();
  obstacleTimer = 0;
  boostTimer = 0;
  collisionCooldown = 0;
  scoreEl.textContent = score.toString();
  targetEl.textContent = TARGET_SCORE.toString();
  retryOverlay.classList.add("hidden");
  winOverlay.classList.add("hidden");
  finalMessage.classList.add("hidden");
  startHint.classList.remove("hidden");
}

function jump() {
  if (!playing) {
    resetGame();
  }
  tryPlayAudio();
  player.velocity = JUMP;
  startHint.classList.add("hidden");
}

function addObstacle() {
  const minGapTop = 60;
  const maxGapTop = canvas.clientHeight - OBSTACLE_GAP - 60;
  const gapTop = Math.random() * (maxGapTop - minGapTop) + minGapTop;

  obstacles.push({
    x: canvas.clientWidth + 20,
    gapTop,
    passed: false,
  });
}

function update(delta) {
  const speedMultiplier = boostTimer > 0 ? 0.7 : 1;
  const gravityMultiplier = boostTimer > 0 ? 0.8 : 1;

  player.velocity += GRAVITY * gravityMultiplier;
  player.y += player.velocity;

  obstacleTimer += delta;
  if (obstacleTimer > OBSTACLE_INTERVAL) {
    addObstacle();
    obstacleTimer = 0;
  }

  obstacles.forEach((obs) => {
    obs.x -= OBSTACLE_SPEED * speedMultiplier;
    if (!obs.passed && obs.x + OBSTACLE_WIDTH < player.x - player.radius) {
      obs.passed = true;
      score += 1;
      scoreEl.textContent = score.toString();
      if (score === BIRTHDAY_SCORE) {
        boostTimer = BOOST_DURATION;
        player.velocity = JUMP * 0.7;
      }
      if (score >= TARGET_SCORE) {
        winGame();
      }
    }
  });

  if (boostTimer > 0) {
    boostTimer -= delta;
  }

  if (collisionCooldown > 0) {
    collisionCooldown -= delta;
  }

  obstacles = obstacles.filter((obs) => obs.x + OBSTACLE_WIDTH > -20);

  if (player.y + player.radius > canvas.clientHeight || player.y - player.radius < 0) {
    loseGame();
  }

  obstacles.forEach((obs) => {
    const inX = player.x + player.radius > obs.x && player.x - player.radius < obs.x + OBSTACLE_WIDTH;
    const inGap = player.y - player.radius > obs.gapTop && player.y + player.radius < obs.gapTop + OBSTACLE_GAP;
    if (inX && !inGap && collisionCooldown <= 0) {
      skipWalls(obs, COLLISION_SKIP);
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ff5c8a";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  obstacles.forEach((obs) => {
    ctx.fillRect(obs.x, 0, OBSTACLE_WIDTH, obs.gapTop);
    ctx.fillRect(obs.x, obs.gapTop + OBSTACLE_GAP, OBSTACLE_WIDTH, canvas.clientHeight - obs.gapTop - OBSTACLE_GAP);
  });
  ctx.restore();
}

function loop(timestamp) {
  if (!playing) return;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function loseGame() {
  playing = false;
  retryOverlay.classList.remove("hidden");
}

function winGame() {
  playing = false;
  winOverlay.classList.remove("hidden");
}

function skipWalls(hitObstacle, count) {
  let skipped = 0;
  obstacles.forEach((obs) => {
    if (!obs.passed && skipped < count) {
      obs.passed = true;
      skipped += 1;
      score += 1;
    }
  });

  scoreEl.textContent = score.toString();
  hitObstacle.x = -OBSTACLE_WIDTH - 40;
  player.velocity = JUMP * 0.5;
  collisionCooldown = COLLISION_COOLDOWN;

  if (score >= TARGET_SCORE) {
    winGame();
  }
}

function tryPlayAudio() {
  if (!bgMusic || audioStarted) return;
  bgMusic.volume = 0.35;
  bgMusic.play().then(() => {
    audioStarted = true;
  }).catch(() => {
    audioStarted = false;
  });
}

function toggleMute() {
  if (!bgMusic) return;
  const nextMuted = !bgMusic.muted;
  bgMusic.muted = nextMuted;
  muteBtn.textContent = nextMuted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", nextMuted.toString());
  if (!nextMuted) {
    tryPlayAudio();
  }
}

function handleInput(event) {
  if (event.type === "keydown") {
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    event.preventDefault();
  }
  jump();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  resetGame();
});

canvas.addEventListener("pointerdown", handleInput);
window.addEventListener("keydown", handleInput);

retryBtn.addEventListener("click", () => {
  resetGame();
  requestAnimationFrame(loop);
});

yesBtn.addEventListener("click", () => {
  finalMessage.classList.remove("hidden");
  yesBtn.disabled = true;
  noBtn.disabled = true;
});

if (muteBtn) {
  muteBtn.addEventListener("click", toggleMute);
}

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
