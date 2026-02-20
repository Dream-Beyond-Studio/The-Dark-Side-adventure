import { CHUNK_SIZE, MAP_HEIGHT } from './config.js';

export let chunks = {};
export let worldChanges = {};

export function initWorldData(serverChunks, serverChanges) {
    chunks = serverChunks;
    worldChanges = serverChanges;
}

export function updateChunk(chunkX, chunkData) {
    chunks[chunkX] = chunkData;
}

export function getTile(gridX, gridY) {
    if (gridY >= MAP_HEIGHT) return 99;
    if (gridY < 0) return 0;

    const key = `${gridX},${gridY}`;
    if (worldChanges[key] !== undefined) return worldChanges[key];

    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    
    if (!chunks[chunkX]) return 0; 
    
    return chunks[chunkX][gridY][localX];
}

export function setTile(gridX, gridY, value) {
    worldChanges[`${gridX},${gridY}`] = value;
}