import { TILE_SIZE, CHUNK_SIZE, MAP_HEIGHT, SEA_LEVEL } from './config.js';

export const chunks = {}; 

// --- NOWOŚĆ: Własna funkcja losująca ---
// Zamiast Math.random(), używamy tego. Dla tego samego X i Y zawsze da ten sam wynik.
function pseudoRandom(x, y) {
    let n = x * 331 + y * 439; // Unikalna liczba dla kafelka
    n = Math.sin(n) * 12345.6789;
    return n - Math.floor(n); // Zwraca ułamek 0.0 - 1.0
}

function isCave(x, y) {
    const val = Math.sin(x / 15) * Math.cos(y / 15) + Math.sin((x + y) / 30) * 0.5;
    return val > 0.5;
}

function createTree(chunkData, localX, groundY, worldX) {
    // Używamy pseudoRandom zamiast Math.random
    // Dzięki temu drzewo wyrośnie w tym samym miejscu u każdego gracza
    const hRand = pseudoRandom(worldX, groundY); 
    const treeHeight = Math.floor(hRand * 4) + 3;

    for (let i = 1; i <= treeHeight; i++) {
        const trunkY = groundY - i;
        if (trunkY >= 0) chunkData[trunkY][localX] = 3; 
    }
    const topY = groundY - treeHeight;
    if (topY >= 0) chunkData[topY][localX] = 4;
    if (topY - 1 >= 0) chunkData[topY - 1][localX] = 4;
    if (localX > 0 && topY >= 0) chunkData[topY][localX - 1] = 4;
    if (localX < CHUNK_SIZE - 1 && topY >= 0) chunkData[topY][localX + 1] = 4;
}

function spawnVein(chunkData, centerX, centerY, oreID, worldX) {
    const positions = [{x:0,y:0}, {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        // Używamy pseudoRandom z unikalnym offsetem 'i'
        if (pseudoRandom(worldX + pos.x, centerY + pos.y + i) > 0.3) {
            const targetX = centerX + pos.x;
            const targetY = centerY + pos.y;
            if (targetX >= 0 && targetX < CHUNK_SIZE && targetY >= 0 && targetY < MAP_HEIGHT) {
                if (chunkData[targetY][targetX] === 5) {
                    chunkData[targetY][targetX] = oreID;
                }
            }
        }
    }
}

export function getTile(gridX, gridY) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    
    if (!chunks[chunkX]) generateChunk(chunkX);
    if (gridY >= MAP_HEIGHT) return 99; 
    if (gridY < 0) return 0; 
    
    return chunks[chunkX][gridY][localX];
}

export function setTile(gridX, gridY, value) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    if (!chunks[chunkX]) generateChunk(chunkX);
    
    if (gridY >= 0 && gridY < MAP_HEIGHT) {
        chunks[chunkX][gridY][localX] = value;
    }
}

export function generateChunk(chunkX) {
    const chunkData = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        chunkData[y] = new Array(CHUNK_SIZE).fill(0);
    }

    for (let x = 0; x < CHUNK_SIZE; x++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const noise = Math.sin(worldX * 0.1) * 8 + Math.sin(worldX * 0.05) * 12;
        const surfaceY = Math.floor(30 + noise + 5);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            if (y >= MAP_HEIGHT - 3) { chunkData[y][x] = 99; continue; }
            if (y <= surfaceY && y > SEA_LEVEL) chunkData[y][x] = 12; 
            
            if (y > surfaceY) {
                if (y > surfaceY + 4 && isCave(worldX, y)) chunkData[y][x] = 0;
                else chunkData[y][x] = (y < surfaceY + 8) ? 2 : 5; 
            } else if (y === surfaceY) {
                 if (y > SEA_LEVEL) chunkData[y][x] = 2; 
                 else {
                     chunkData[y][x] = 1; 
                     // DRZEWA: Używamy pseudoRandom
                     if (x > 1 && x < CHUNK_SIZE - 2 && pseudoRandom(worldX, surfaceY) < 0.1) {
                         createTree(chunkData, x, surfaceY, worldX);
                     }
                 }
            }
        }
    }

    // SUROWCE: Też pseudoRandom
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            if (y > 30 && pseudoRandom(worldX, y) < 0.02) spawnVein(chunkData, x, y, 6, worldX);
            if (y > 40 && pseudoRandom(worldX, y + 1) < 0.015) spawnVein(chunkData, x, y, 7, worldX);
            if (y > 50 && pseudoRandom(worldX, y + 2) < 0.008) spawnVein(chunkData, x, y, 8, worldX);
            if (y > 55 && pseudoRandom(worldX, y + 3) < 0.004) spawnVein(chunkData, x, y, 9, worldX);
        }
    }
    chunks[chunkX] = chunkData;
}