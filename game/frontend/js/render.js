import { TILE_SIZE } from './config.js';
import { getTile } from './world.js';

export function drawWorld(ctx, camera, canvasWidth, canvasHeight) {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const startCol = Math.floor(camera.x / TILE_SIZE) - 1;
    const endCol = Math.floor((camera.x + canvasWidth) / TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / TILE_SIZE) - 1;
    const endRow = Math.floor((camera.y + canvasHeight) / TILE_SIZE) + 1;

    for (let x = startCol; x <= endCol; x++) {
        for (let y = startRow; y <= endRow; y++) {
            const tile = getTile(x, y);
            if (tile !== 0) {
                if (tile === 1) ctx.fillStyle = '#32CD32';      
                else if (tile === 2) ctx.fillStyle = '#5C4033'; 
                else if (tile === 3) ctx.fillStyle = '#8B4513'; 
                else if (tile === 4) ctx.fillStyle = '#228B22'; 
                else if (tile === 5) ctx.fillStyle = '#808080'; 
                else if (tile === 99) ctx.fillStyle = '#000000'; 
                else if (tile === 10) ctx.fillStyle = '#DEB887'; 
                else if (tile === 11) ctx.fillStyle = '#B22222';
                else if (tile === 12) ctx.fillStyle = '#4169E1'; // Woda (RoyalBlue)

                // Surowce
                else if (tile >= 6) {
                    ctx.fillStyle = '#808080'; 
                    ctx.fillRect(Math.floor(x * TILE_SIZE - camera.x), Math.floor(y * TILE_SIZE - camera.y), TILE_SIZE, TILE_SIZE);
                    
                    if (tile === 6) ctx.fillStyle = '#000000';      
                    else if (tile === 7) ctx.fillStyle = '#B0C4DE'; 
                    else if (tile === 8) ctx.fillStyle = '#FFD700'; 
                    else if (tile === 9) ctx.fillStyle = '#00FFFF'; 
                    
                    ctx.fillRect(Math.floor(x * TILE_SIZE - camera.x) + 8, Math.floor(y * TILE_SIZE - camera.y) + 8, 16, 16);
                    continue; 
                }
                
                ctx.fillRect(Math.floor(x * TILE_SIZE - camera.x), Math.floor(y * TILE_SIZE - camera.y), TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

export function drawUI(ctx, canvasWidth, hotbar, selectedSlot) {
    const slotSize = 40;
    const padding = 10;
    const startX = (canvasWidth - (hotbar.length * (slotSize + padding))) / 2;
    const startY = 10; 

    for (let i = 0; i < hotbar.length; i++) {
        const x = startX + i * (slotSize + padding);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        if (i === selectedSlot) ctx.fillStyle = "rgba(255, 255, 0, 0.5)"; 
        ctx.fillRect(x, startY, slotSize, slotSize);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, startY, slotSize, slotSize);

        const item = hotbar[i];
        ctx.fillStyle = item.color;
        const itemSize = 20;
        ctx.fillRect(x + (slotSize - itemSize)/2, startY + (slotSize - itemSize)/2, itemSize, itemSize);

        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText(i + 1, x + 2, startY + 10);
    }
    
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(hotbar[selectedSlot].name, canvasWidth / 2, startY + slotSize + 25);
    ctx.textAlign = "start"; 
}