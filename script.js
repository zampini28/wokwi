'use strict';

class AssetManager {
  constructor() {
    this.images = new Map();
    this.loadPromises = [];
  }

  loadImage(name, src) {
    const img = new Image();
    img.src = src;
    this.images.set(name, img);

    const promise = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`failed to load ${src}`));
    });

    this.loadPromises.push(promise);
    return promise;
  }

  getImage(name) {
    return this.images.get(name);
  }

  async loadAll() {
    try {
      await Promise.all(this.loadPromises);
      console.log('all images loaded');
      return true;
    } catch (error) {
      console.error('failed to load images:', error);
      return false;
    }
  }
}

class Character {
  static motion = {
    NORMAL: 0,
    WALKING1: 1,
    WALKING2: 2,
  };

  static facing = {
    FORWARD: 0,
    BACKWARD: 1,
    LEFTWARD: 2,
    RIGHTWARD: 3,
  };

  static CYCLE_ANIMATION = [
    Character.motion.NORMAL,
    Character.motion.WALKING1,
    Character.motion.NORMAL,
    Character.motion.WALKING2,
  ];

  constructor(canvas, assetManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assetManager = assetManager;
    this.scale = 2;
    this.spriteWidth = 16;
    this.spriteHeight = 18;

    this.currentFacing = Character.facing.FORWARD;
    this.isMoving = false;
    this.animationIndex = 0;
  }

  draw() {
    const img = this.assetManager.getImage('character');
    if (!img) return;

    const scaledWidth = this.spriteWidth * this.scale;
    const scaledHeight = this.spriteHeight * this.scale;
    const centerX = this.canvas.width / 2 - scaledWidth / 2;
    const centerY = this.canvas.height / 2 - scaledHeight / 2;

    let motion = Character.motion.NORMAL;
    if (this.isMoving) {
      motion = Character.CYCLE_ANIMATION[this.animationIndex % 4];
    }

    this.ctx.drawImage(img,
      this.spriteWidth * motion,
      this.spriteHeight * this.currentFacing,
      this.spriteWidth, this.spriteHeight,
      centerX, centerY,
      scaledWidth, scaledHeight
    );
  }

  updateAnimation() {
    if (this.isMoving) {
      this.animationIndex++;
    }
  }

  setMoving(isMoving, facing) {
    this.isMoving = isMoving;
    if (facing !== undefined) {
      this.currentFacing = facing;
    }
  }
}

class Sprite {
  constructor(name, x, y, width, height, sx=0, sy=0, sWidth=null, sHeight=null)
  {
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.sourceX = sx;
    this.sourceY = sy;
    this.sourceWidth = sWidth || width;
    this.sourceHeight = sHeight || height;
  }

  draw(ctx, assetManager, mapOffset) {
    const img = assetManager.getImage(this.name);
    if (!img) return;

    const screenX = this.x + mapOffset.x;
    const screenY = this.y + mapOffset.y;

    if (screenX + this.width > 0 && screenX < ctx.canvas.width &&
        screenY + this.height > 0 && screenY < ctx.canvas.height) {
      ctx.drawImage(img,
        this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight,
        screenX, screenY, this.width, this.height
      );
    }
  }
}

class Background {
  constructor(canvas, assetManager, tileSize=128, scale=2) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assetManager = assetManager;
    this.tileSize = tileSize;
    this.scale = scale;
    this.scaledTileSize = tileSize * scale;

    this.grassSource = {
      x: 10,
      y: 128 + 10,
      width: 118,
      height: 118,
    };
  }

  draw(mapOffset) {
    const tilesX = (this.canvas.width / this.scaledTileSize) + 2;
    const tilesY = (this.canvas.height / this.scaledTileSize) + 2;

    const startX =
      (mapOffset.x % this.scaledTileSize) - this.scaledTileSize;
    const startY =
      (mapOffset.y % this.scaledTileSize) - this.scaledTileSize;

    const grassImg = this.assetManager.getImage('grass');
    if (!grassImg) return;

    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        this.ctx.drawImage(grassImg,
          this.grassSource.x, this.grassSource.y,
          this.grassSource.width, this.grassSource.height,
          startX + (x * this.scaledTileSize),
          startY + (y * this.scaledTileSize),
          this.scaledTileSize + 3,
          this.scaledTileSize + 3
        );
      }
    }
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.assetManager = new AssetManager();
    this.character = new Character(canvas, this.assetManager);
    this.background = new Background(canvas, this.assetManager);

    this.mapOffset = { x: 0, y: 0 };
    this.sprites = [];

    // edit it
    //this.frameLimit = 18;
    this.frameLimit = 5;
    this.currentFrame = 0;
    //this.moveSpeed = 3;
    this.moveSpeed = 15;

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
    };

    this.setupEventListeners();
  }

  async init() {
    this.assetManager.loadImage('character', 'character.png');
    this.assetManager.loadImage('grass', 'ground.jpg');
    this.assetManager.loadImage('house_floor', 'house_interior/interior.png');
    this.assetManager.loadImage('house_wall', 'inside/inside.png');
    this.assetManager.loadImage('house_door', 'tileset_16x16_interior.png');

    const success = await this.assetManager.loadAll();
    if (success) {
      this.createSprites();
      this.start();
    }
  }

  createSprites() {
    // house floor | 32x32
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        this.addSprite('house_floor',
          260 + i*32, -1600 + j*32, 32, 32,
          2, 32*4+2, 28, 28
        );
      }
    }

    // left wall
    this.addSprite('house_wall',
      260 - 17, -1600, 10*2, 32 * 40 + 19,
      416, 152, 9, 71
    );

    // right wall
    this.addSprite('house_wall',
      260 + 40*32, -1600, 10*2, 32 * 40 + 18,
      416, 152, 9, 71
    );

    // top wall
    this.addSprite('house_wall',
      260, -1600, 32 * 40, 20,
      424, 224, 79, 15
    );

    // bottom wall
    this.addSprite('house_wall',
      260, -1600 + 32*40, 32 * 40, 20,
      424, 224, 79, 15
    );

    this.addSprite('house_door',
      743, -360, 27*1.5, 39*1.5,
      178, 8, 27, 39
    );

    this.addSprite('house_door',
      780, -360, 27*1.5, 39*1.5,
      178, 8, 27, 39
    );

  }

  addSprite(name, x, y, width, height, sx=0, sy=0, sWidth=null, sHeight=null) {
    const sprite = new Sprite(name, x, y, width, height,
                              sx, sy, sWidth, sHeight);
    this.sprites.push(sprite);
    return sprite;
  }

  setupEventListeners() {
    document.addEventListener('keydown', event => {
      const key = event.key;
      if (key in this.keys) {
        this.keys[key] = true;
        event.preventDefault();
      }
    });

    document.addEventListener('keyup', event => {
      const key = event.key;
      if (key in this.keys) {
        this.keys[key] = false;
        event.preventDefault();
      }
    });
  }

  handleInput() {
    let newFacing = this.character.currentFacing;
    let moving = false;

    if (this.keys.w) {
      this.mapOffset.y += this.moveSpeed;
      newFacing = Character.facing.BACKWARD;
      moving = true;
    } else if (this.keys.s) {
      this.mapOffset.y -= this.moveSpeed;
      newFacing = Character.facing.FORWARD;
      moving = true;
    }

    if (this.keys.a) {
      this.mapOffset.x += this.moveSpeed;
      newFacing = Character.facing.LEFTWARD;
      moving = true;
    } else if (this.keys.d) {
      this.mapOffset.x -= this.moveSpeed;
      newFacing = Character.facing.RIGHTWARD;
      moving = true;
    }

    this.character.setMoving(moving, newFacing);
  }

  update() {
    this.handleInput();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.background.draw(this.mapOffset);

    this.sprites.forEach(sprite => {
      sprite.draw(this.ctx, this.assetManager, this.mapOffset);
    });

    if (this.currentFrame++ <= this.frameLimit) {
      this.character.draw();
      requestAnimationFrame(() => this.update());
      return;
    }

    this.currentFrame = 0;
    this.character.updateAnimation();
    this.character.draw();

    requestAnimationFrame(() => this.update());
  }

  start() {
    this.update();
  }
}

const canvas = document.querySelector('canvas');
const game = new Game(canvas);
game.init();
