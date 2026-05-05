import { CHUNK_SIZE, MAP_HEIGHT } from './config.js';

export let dimensions = {
    earth: { chunks: {}, worldChanges: {} },
    moon: { chunks: {}, worldChanges: {} }
};

export let currentDimension = 'earth';

export function setDimension(dim) {
    currentDimension = dim;
}

export function initWorldData(serverChunks, serverChanges) {
    dimensions['earth'].chunks = serverChunks;
    dimensions['earth'].worldChanges = serverChanges;
}

export function updateChunk(chunkX, chunkData, dim) {
    if (!dimensions[dim]) return;
    dimensions[dim].chunks[chunkX] = chunkData;
}

export function getTile(gridX, gridY) {
    if (gridY >= MAP_HEIGHT) return 99;
    if (gridY < 0) return 0;

    const key = `${gridX},${gridY}`;
    if (dimensions[currentDimension].worldChanges[key] !== undefined) {
        return dimensions[currentDimension].worldChanges[key];
    }

    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    
    if (!dimensions[currentDimension].chunks[chunkX]) return 0; 
    
    return dimensions[currentDimension].chunks[chunkX][gridY][localX];
}

export function setTile(gridX, gridY, value, dim) {
    if (dimensions[dim]) {
        dimensions[dim].worldChanges[`${gridX},${gridY}`] = value;
    }
}