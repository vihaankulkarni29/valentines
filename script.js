const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const targetEl = document.getElementById("target");
const retryOverlay = document.getElementById("retry");
const retryBtn = document.getElementById("retry-btn");
const winOverlay = document.getElementById("win");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const finalMessage = document.getElementById("final-message");
const startHint = document.getElementById("start-hint");

const TARGET_SCORE = 25;
const GRAVITY = 0.35;
const JUMP = -6.5;
const OBSTACLE_SPEED = 2.2;
const OBSTACLE_GAP = 150;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_INTERVAL = 1300;

let player;
let obstacles;
let score;
let playing;
let lastTime = 0;
let obstacleTimer = 0;

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
  player.velocity += GRAVITY;
  player.y += player.velocity;

  obstacleTimer += delta;
  if (obstacleTimer > OBSTACLE_INTERVAL) {
    addObstacle();
    obstacleTimer = 0;
  }

  obstacles.forEach((obs) => {
    obs.x -= OBSTACLE_SPEED;
    if (!obs.passed && obs.x + OBSTACLE_WIDTH < player.x - player.radius) {
      obs.passed = true;
      score += 1;
      scoreEl.textContent = score.toString();
      if (score >= TARGET_SCORE) {
        winGame();
      }
    }
  });

  obstacles = obstacles.filter((obs) => obs.x + OBSTACLE_WIDTH > -20);

  if (player.y + player.radius > canvas.clientHeight || player.y - player.radius < 0) {
    loseGame();
  }

  obstacles.forEach((obs) => {
    const inX = player.x + player.radius > obs.x && player.x - player.radius < obs.x + OBSTACLE_WIDTH;
    const inGap = player.y - player.radius > obs.gapTop && player.y + player.radius < obs.gapTop + OBSTACLE_GAP;
    if (inX && !inGap) {
      loseGame();
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

function moveNoButton() {
  const card = winOverlay.querySelector(".card");
  const cardRect = card.getBoundingClientRect();
  const maxX = cardRect.width - noBtn.offsetWidth - 20;
  const maxY = cardRect.height - noBtn.offsetHeight - 20;
  const nextX = Math.random() * maxX + 10;
  const nextY = Math.random() * maxY + 10;
  noBtn.style.position = "absolute";
  noBtn.style.left = `${nextX}px`;
  noBtn.style.top = `${nextY}px`;
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

noBtn.addEventListener("mouseenter", moveNoButton);
noBtn.addEventListener("click", moveNoButton);
noBtn.addEventListener("touchstart", (event) => {
  event.preventDefault();
  moveNoButton();
});

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
