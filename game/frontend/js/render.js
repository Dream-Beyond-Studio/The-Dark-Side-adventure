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
                else if (tile === 12) ctx.fillStyle = '#4169E1'; 
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

export function drawMobs(ctx, mobs, camera) {
    const palette = {
        white: '#F0F0F0',
        black: '#1a1a1a',
        hoof: '#0d0d0d',
        nose: '#ff99cc',
        udder: '#ffb3d9',
        horns: '#8c8c8c'
    };

    for (let id in mobs) {
        let m = mobs[id];
        const sx = Math.floor(m.x - camera.x);
        const sy = Math.floor(m.y - camera.y);

        if (m.type === 'cow') {
            const lift = 4;
            const pad = 2;
            const dx = sx + pad; 
            const dy = sy - lift; 
            const dw = m.width - (pad * 2); 
            const legH = 10;
            const bodyH = 18;
            const headSize = 14;

            let bodyX, bodyW;
            if (m.facingRight) {
                bodyX = dx;
                bodyW = dw - (headSize - 4);
            } else {
                bodyX = dx + (headSize - 4);
                bodyW = dw - (headSize - 4);
            }
            const bodyY = dy + m.height - legH - bodyH + 4;
            const legY = dy + m.height - legH;

            const drawLeg = (lx, ly) => {
                ctx.fillStyle = palette.black; ctx.fillRect(lx, ly, 4, legH - 3);
                ctx.fillStyle = palette.hoof;  ctx.fillRect(lx, ly + legH - 3, 4, 3);
            };

            drawLeg(bodyX + 4, legY);
            drawLeg(bodyX + bodyW - 8, legY);
            drawLeg(bodyX + 6, legY + 1);
            drawLeg(bodyX + bodyW - 10, legY + 1);

            ctx.fillStyle = palette.white;
            ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
            ctx.fillStyle = palette.black;
            ctx.fillRect(bodyX + 4, bodyY + 4, 6, 10); 
            ctx.fillRect(bodyX + bodyW - 10, bodyY + 3, 5, 5); 

            ctx.fillStyle = palette.udder;
            const udderX = m.facingRight ? bodyX + 5 : bodyX + bodyW - 11;
            ctx.fillRect(udderX, bodyY + bodyH - 2, 6, 3);

            let headX = m.facingRight ? (dx + dw - headSize) : dx;
            const headY = bodyY - 2; 

            ctx.fillStyle = palette.white;
            ctx.fillRect(headX, headY, headSize, headSize);
            ctx.fillStyle = palette.horns;
            ctx.fillRect(headX + 2, headY - 3, 3, 3);
            ctx.fillRect(headX + headSize - 5, headY - 3, 3, 3);

            const faceDir = m.facingRight ? 1 : -1;
            const eyeX = headX + (headSize/2) + (3 * faceDir) - 1;
            const noseX = headX + (headSize/2) + (4 * faceDir) - 2;
            ctx.fillStyle = palette.black; ctx.fillRect(eyeX, headY + 5, 2, 2);
            ctx.fillStyle = palette.nose;  ctx.fillRect(noseX, headY + 9, 4, 3);
        }
    }
}

export function drawLasers(ctx, lasers, camera) {
    for (let l of lasers) {
        const sx1 = Math.floor(l.x1 - camera.x);
        const sy1 = Math.floor(l.y1 - camera.y);
        const sx2 = Math.floor(l.x2 - camera.x);
        const sy2 = Math.floor(l.y2 - camera.y);

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = `rgba(255, 0, 0, ${l.life / 10})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "red";
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}