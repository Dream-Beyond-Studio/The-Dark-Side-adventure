import { TILE_SIZE, GRAVITY, MAP_HEIGHT, SPEED, JUMP_FORCE } from './config.js';
import { getTile } from './world.js';

export function isSolid(x, y) {
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    if (gridY >= MAP_HEIGHT) return true;
    const tile = getTile(gridX, gridY);
    return !(tile === 0 || tile === 3 || tile === 4 || tile === 12);
}

export function updatePlayerPhysics(player, keys) {
    const centerX = Math.floor((player.x + player.width/2) / TILE_SIZE);
    const feetY = Math.floor((player.y + player.height - 2) / TILE_SIZE);
    
    // Sprawdzamy wodę przy stopach
    player.inWater = (getTile(centerX, feetY) === 12);

    let currentSpeed = player.inWater ? SPEED * 0.5 : SPEED;

    if (keys['ArrowLeft'] || keys['KeyA']) player.velX = -currentSpeed;
    else if (keys['ArrowRight'] || keys['KeyD']) player.velX = currentSpeed;
    else player.velX = 0;

    player.x += player.velX;

    // Kolizja X
    const pointsY = [player.y + 2, player.y + player.height/2, player.y + player.height - 2];
    for (let py of pointsY) {
        if (player.velX > 0 && isSolid(player.x + player.width, py)) {
            player.x = (Math.floor((player.x + player.width) / TILE_SIZE) * TILE_SIZE) - player.width;
        } else if (player.velX < 0 && isSolid(player.x, py)) {
            player.x = (Math.floor(player.x / TILE_SIZE) + 1) * TILE_SIZE;
        }
    }

    // Ruch pionowy
    if (player.inWater) {
        if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) player.velY = -4;
        else { 
            player.velY += 0.2; 
            if (player.velY > 2) player.velY = 2; 
        }
        player.velY *= 0.9;
    } else {
        if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.grounded) {
            player.velY = JUMP_FORCE;
            player.grounded = false;
        }
        player.velY += GRAVITY;
    }

    player.y += player.velY;
    player.grounded = false;

    // Kolizja Y
    const pointsX = [player.x + 2, player.x + player.width - 2];
    for (let px of pointsX) {
        if (player.velY > 0 && isSolid(px, player.y + player.height)) {
            player.y = (Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE) - player.height;
            player.velY = 0;
            player.grounded = true;
        } else if (player.velY < 0 && isSolid(px, player.y)) {
            player.y = (Math.floor(player.y / TILE_SIZE) + 1) * TILE_SIZE;
            player.velY = 0;
        }
    }
}