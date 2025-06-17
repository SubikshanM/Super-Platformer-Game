const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const gravity = 0.5;
let cameraX = 0;
let gameOver = false;
let gameWon = false;
let score = 0;
const levelLength = 2500;
const groundHeight = 40;

const player = {
  x: 100,
  y: 0,
  w: 40,
  h: 40,
  dx: 0,
  dy: 0,
  onGround: false,
  isBig: false,
  hasFire: false
};

const fireballs = [];

const tiles = [
  { x: 0, y: canvas.height - groundHeight, w: 300, h: groundHeight },
  { x: 400, y: canvas.height - groundHeight, w: 300, h: groundHeight },
  { x: 800, y: canvas.height - groundHeight, w: 200, h: groundHeight },
  { x: 1100, y: canvas.height - groundHeight, w: 300, h: groundHeight },
  { x: 1500, y: canvas.height - groundHeight, w: 300, h: groundHeight },
  { x: 1900, y: canvas.height - groundHeight, w: 400, h: groundHeight }
];

const pipes = [
  { x: 1250, y: canvas.height - 80, w: 60, h: 80 }
];

const blocksY = canvas.height - 150;

const blocks = [
  { x: 600, y: blocksY, w: 40, h: 40, type: "coin", hit: false },
  { x: 950, y: blocksY, w: 40, h: 40, type: "mushroom", hit: false },
  { x: 1400, y: blocksY, w: 40, h: 40, type: "fireball", hit: false }
];

const coins = [
  { x: 550, y: blocksY - 50, w: 32, h: 32, collected: false },
  { x: 900, y: blocksY - 50, w: 32, h: 32, collected: false },
  { x: 1350, y: blocksY - 50, w: 32, h: 32, collected: false }
];

const powerups = [];

const enemies = [
  { x: 700, y: canvas.height - 80, w: 40, h: 40, dir: 1, speed: 2, alive: true },
  { x: 1550, y: canvas.height - 80, w: 40, h: 40, dir: -1, speed: 2, alive: true }
];

const keys = {};
const images = {};

function loadAssets(callback) {
  const names = ["background", "player", "tile", "coin", "enemy", "pipe", "mushroom", "fireball"];
  let loaded = 0;
  names.forEach(name => {
    const img = new Image();
    img.src = `assets/${name}.png`;
    img.onload = () => {
      images[name] = img;
      loaded++;
      if (loaded === names.length) callback();
    };
  });
}

document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

function shootFireball() {
  if (!player.hasFire || !player.onGround) return;
  const dir = keys["ArrowRight"] ? 1 : keys["ArrowLeft"] ? -1 : 1;
  fireballs.push({
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    w: 16,
    h: 16,
    dx: 6 * dir
  });
}

function update() {
  if (gameOver || gameWon) {
    if (keys["Enter"]) location.reload();
    return;
  }

  player.dx = keys["ArrowRight"] ? 4 : keys["ArrowLeft"] ? -4 : 0;
  if (keys["Space"] && player.onGround) {
    player.dy = -10;
    player.onGround = false;
  }
  if (keys["KeyF"]) {
    keys["KeyF"] = false;
    shootFireball();
  }

  player.dy += gravity;
  player.x += player.dx;
  player.y += player.dy;

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > levelLength) {
    player.x = levelLength - player.w;
    gameWon = true;
  }

  player.onGround = false;
  const solids = [...tiles, ...pipes, ...blocks];
  for (const s of solids) {
    if (
      player.x < s.x + s.w &&
      player.x + player.w > s.x &&
      player.y + player.h <= s.y + 10 &&
      player.y + player.h + player.dy >= s.y
    ) {
      player.y = s.y - player.h;
      player.dy = 0;
      player.onGround = true;
    }

    if (
      player.x < s.x + s.w &&
      player.x + player.w > s.x &&
      player.y < s.y + s.h &&
      player.y + player.h > s.y
    ) {
      if (player.dy < 0) {
        const block = blocks.find(b => b === s && !b.hit);
        if (block) {
          block.hit = true;
          if (block.type === "mushroom") {
            powerups.push({ x: block.x, y: block.y - 32, w: 32, h: 32, type: "mushroom", active: true });
          } else if (block.type === "fireball") {
            powerups.push({ x: block.x, y: block.y - 32, w: 32, h: 32, type: "fireball", active: true });
          }
        }
      }
    }
  }

  coins.forEach(c => {
    if (!c.collected &&
        player.x < c.x + c.w &&
        player.x + player.w > c.x &&
        player.y < c.y + c.h &&
        player.y + player.h > c.y) {
      c.collected = true;
      score++;
    }
  });

  powerups.forEach(p => {
    if (p.active &&
        player.x < p.x + p.w &&
        player.x + player.w > p.x &&
        player.y < p.y + p.h &&
        player.y + player.h > p.y) {
      p.active = false;
      if (p.type === "mushroom") {
        player.isBig = true;
        player.h *= 1.5;
        player.w *= 1.5;
      } else if (p.type === "fireball") {
        player.hasFire = true;
      }
    }
  });

  enemies.forEach(e => {
    if (!e.alive) return;
    const frontX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
    const footY = e.y + e.h + 5;
    const platform = tiles.find(t =>
      frontX >= t.x && frontX <= t.x + t.w &&
      footY >= t.y && footY <= t.y + t.h
    );
    if (!platform) e.dir *= -1;
    else e.x += e.speed * e.dir;

    if (
      player.x < e.x + e.w &&
      player.x + player.w > e.x &&
      player.y < e.y + e.h &&
      player.y + player.h > e.y
    ) gameOver = true;
  });

  fireballs.forEach((f, i) => {
    f.x += f.dx;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (
        f.x < e.x + e.w &&
        f.x + f.w > e.x &&
        f.y < e.y + e.h &&
        f.y + f.h > e.y
      ) {
        e.alive = false;
        fireballs.splice(i, 1);
        break;
      }
    }
    for (const tile of tiles) {
      if (
        f.x < tile.x + tile.w &&
        f.x + f.w > tile.x &&
        f.y < tile.y + tile.h &&
        f.y + f.h > tile.y
      ) {
        fireballs.splice(i, 1);
        break;
      }
    }
  });

  if (player.y > canvas.height + 100) gameOver = true;
  cameraX = Math.max(0, Math.min(player.x - canvas.width / 2, levelLength - canvas.width));
}

function drawText(txt, color) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
  ctx.font = "20px Arial";
  ctx.fillText("Press ENTER to restart", canvas.width / 2, canvas.height / 2 + 40);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < levelLength; i += canvas.width) {
    ctx.drawImage(images.background, i - cameraX, 0, canvas.width, canvas.height);
  }

  tiles.forEach(t => ctx.drawImage(images.tile, t.x - cameraX, t.y, t.w, t.h));
  pipes.forEach(p => ctx.drawImage(images.pipe, p.x - cameraX, p.y, p.w, p.h));
  blocks.forEach(b => {
    ctx.fillStyle = b.type === "coin" ? "#8B4513" : "#FFD700";
    ctx.fillRect(b.x - cameraX, b.y, b.w, b.h);
  });
  coins.forEach(c => {
    if (!c.collected) ctx.drawImage(images.coin, c.x - cameraX, c.y, c.w, c.h);
  });
  powerups.forEach(p => {
    if (p.active) ctx.drawImage(images[p.type], p.x - cameraX, p.y, p.w, p.h);
  });
  enemies.forEach(e => {
    if (e.alive) ctx.drawImage(images.enemy, e.x - cameraX, e.y, e.w, e.h);
  });
  fireballs.forEach(f => {
    ctx.drawImage(images.fireball, f.x - cameraX, f.y, f.w, f.h);
  });
  ctx.drawImage(images.player, player.x - cameraX, player.y, player.w, player.h);

  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 30);

  if (gameOver) drawText("Game Over", "red");
  if (gameWon) drawText("You Win!", "green");
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

loadAssets(() => {
  requestAnimationFrame(gameLoop);
});
