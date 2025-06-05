'use strict';
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const Character = {
  motion: {
    NORMAL: 0,
    WALKING1: 1,
    WALKING2: 2,
  },
  facing: {
    FORWARD: 0,
    BACKWARD: 1,
    LEFTWARD: 2,
    RIGHTWARD: 3,
  }
};

const img = new Image();
img.src = 'character.png';

const grassImg = new Image();
grassImg.src = 'ground.jpg';

const SCALE = 2.5;
const FRAME_LIMIT = 18;
let currentFrame = 0;

const gameState = {
  isMoving: false,
  currentFacing: Character.facing.FORWARD,
  keys: {
    w: false,
    a: false,
    s: false,
    d: false
  }
};

const mapOffset = {
  x: 0,
  y: 0
};

function drawCharacter(motion, facing) {
  const spriteWidth = 16;
  const spriteHeight = 18;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const scaledSpriteWidth = 16 * SCALE;
  const scaledSpriteHeight = 18 * SCALE;
  const canvasWidthCentered = canvasWidth/2 - scaledSpriteWidth/2;
  const canvasHeightCentered = canvasHeight/2 - scaledSpriteHeight/2;

  ctx.drawImage(img,
    spriteWidth * motion, spriteHeight * facing,
    spriteWidth, spriteHeight,
    canvasWidthCentered, canvasHeightCentered,
    scaledSpriteWidth, scaledSpriteHeight
  );
}

let swidth = 118;
let sheight = 118;
let xs = 10;
let xy = 128 * 1 + 10;

function drawBackground() {
  const grassSize = 128;
  const scaledGrassSize = grassSize * SCALE;

  const tilesX = (canvas.width / scaledGrassSize) + 2;
  const tilesY = (canvas.height / scaledGrassSize) + 2;

  const startX = (mapOffset.x % scaledGrassSize) - scaledGrassSize;
  const startY = (mapOffset.y % scaledGrassSize) - scaledGrassSize;


  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      ctx.drawImage(grassImg,
        xs, xy, swidth, sheight,
        startX + (x * scaledGrassSize),
        startY + (y * scaledGrassSize),
        scaledGrassSize + 3,
        scaledGrassSize + 3,
      );
    }
  }

}

let update_index = 0;
const CYCLE_ANIMATION = [
  Character.motion.NORMAL,
  Character.motion.WALKING1,
  Character.motion.NORMAL,
  Character.motion.WALKING2,
];

function handleInput() {
  let newFacing = gameState.currentFacing;
  let moving = false;
  const moveSpeed = 3;

  if (gameState.keys.w) {
    mapOffset.y += moveSpeed;
    newFacing = Character.facing.BACKWARD;
    moving = true;
  } else if (gameState.keys.s) {
    mapOffset.y -= moveSpeed;
    newFacing = Character.facing.FORWARD;
    moving = true;
  }

  if (gameState.keys.a) {
    mapOffset.x += moveSpeed;
    newFacing = Character.facing.LEFTWARD;
    moving = true;
  } else if (gameState.keys.d) {
    mapOffset.x -= moveSpeed;
    newFacing = Character.facing.RIGHTWARD;
    moving = true;
  }

  gameState.isMoving = moving;
  gameState.currentFacing = newFacing;
}

function update() {
  handleInput();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  if (currentFrame++ <= FRAME_LIMIT) {
    let motion = Character.motion.NORMAL;
    if (gameState.isMoving) {
      motion = CYCLE_ANIMATION[update_index % 4];
    }
    drawCharacter(motion, gameState.currentFacing);

    window.requestAnimationFrame(update);
    return;
  }

  currentFrame = 0;

  if (gameState.isMoving) {
    update_index++;
  }

  let motion = Character.motion.NORMAL;
  if (gameState.isMoving) {
    motion = CYCLE_ANIMATION[update_index % 4];
  }
  drawCharacter(motion, gameState.currentFacing);

  window.requestAnimationFrame(update);
}

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    gameState.keys[key] = true;
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    gameState.keys[key] = false;
    e.preventDefault();
  }
});

const imageList = [img, grassImg];

Promise.all(imageList.map(image => {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`failed to load ${image.src}`));
  })
})).then(images => {
  console.log('all images loaded')
  window.requestAnimationFrame(update);
}).catch(error => {
  console.error('failed to load images, because: ', error);
});

