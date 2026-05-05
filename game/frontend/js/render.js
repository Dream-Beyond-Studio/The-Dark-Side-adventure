import { TILE_SIZE } from './config.js';
import { getTile, currentDimension } from './world.js';

const STARS_COUNT = 150;
let stars = [];
let starsGenerated = false;

const SKY_PALETTE = {
    NIGHT:   { r: 10, g: 10, b: 35 },
    DAWN:    { r: 255, g: 120, b: 80 }, 
    DAY:     { r: 100, g: 200, b: 255 }, 
    DUSK:    { r: 180, g: 80, b: 160 } 
};

function lerpColor(c1, c2, factor) {
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    return `rgb(${r},${g},${b})`;
}

function generateStars(canvasWidth, canvasHeight) {
    if (starsGenerated) return;
    for (let i = 0; i < STARS_COUNT; i++) {
        stars.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight * 0.7,
            size: Math.floor(Math.random() * 3) + 1,
            blinkSpeed: Math.random() * 0.1 + 0.02
        });
    }
    starsGenerated = true;
}

function getSmoothSkyColor(progress) {
    if (progress < 0.20) return lerpColor(SKY_PALETTE.NIGHT, SKY_PALETTE.DAWN, progress / 0.20);
    if (progress < 0.30) return lerpColor(SKY_PALETTE.DAWN, SKY_PALETTE.DAY, (progress - 0.20) / 0.10);
    if (progress < 0.70) return lerpColor(SKY_PALETTE.DAY, SKY_PALETTE.DAY, (progress - 0.30) / 0.40);
    if (progress < 0.80) return lerpColor(SKY_PALETTE.DAY, SKY_PALETTE.DUSK, (progress - 0.70) / 0.10);
    return lerpColor(SKY_PALETTE.DUSK, SKY_PALETTE.NIGHT, (progress - 0.80) / 0.20);
}

function drawStars(ctx, canvasWidth, canvasHeight, progress, timeTick) {
    generateStars(canvasWidth, canvasHeight);
    let alpha = 0;
    if (progress > 0.8) alpha = (progress - 0.8) / 0.2; 
    else if (progress < 0.2) alpha = 1.0 - (progress / 0.2);
    else if (progress > 0.95 || progress < 0.05) alpha = 1;

    if (alpha <= 0) return;
    ctx.fillStyle = "white";
    stars.forEach(star => {
        const blink = Math.abs(Math.sin(timeTick * star.blinkSpeed));
        ctx.globalAlpha = alpha * blink;
        ctx.fillRect(star.x, star.y, star.size, star.size); 
    });
    ctx.globalAlpha = 1.0;
}

function drawCelestialBodies(ctx, canvasWidth, canvasHeight, progress) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight + 50; 
    const radius = canvasWidth * 0.45; 

    if (progress > 0.15 && progress < 0.85) {
        const sunRange = (progress - 0.15) / 0.7; 
        const angle = Math.PI + (sunRange * Math.PI); 
        const sunX = centerX + Math.cos(angle) * radius;
        const sunY = centerY + Math.sin(angle) * radius; 

        const glow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 80);
        glow.addColorStop(0, "rgba(255, 255, 0, 0.4)");
        glow.addColorStop(1, "rgba(255, 255, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sunX - 80, sunY - 80, 160, 160); 
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(sunX - 25, sunY - 25, 50, 50); 
    }

    let moonProgress = (progress + 0.5) % 1.0;
    if (moonProgress > 0.15 && moonProgress < 0.85) {
        const moonRange = (moonProgress - 0.15) / 0.7;
        const angle = Math.PI + (moonRange * Math.PI);
        const moonX = centerX + Math.cos(angle) * radius;
        const moonY = centerY + Math.sin(angle) * radius;

        const glow = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 60);
        glow.addColorStop(0, "rgba(200, 200, 255, 0.2)");
        glow.addColorStop(1, "rgba(200, 200, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(moonX - 60, moonY - 60, 120, 120);
        ctx.fillStyle = "#F4F6F0";
        ctx.fillRect(moonX - 20, moonY - 20, 40, 40); 
        ctx.fillStyle = "#D0D0D0";
        ctx.fillRect(moonX - 5, moonY - 10, 8, 8);
        ctx.fillRect(moonX + 10, moonY + 5, 6, 6);
    }
}

function drawMoonCelestialBodies(ctx, canvasWidth, canvasHeight, progress) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight + 50; 
    const radius = canvasWidth * 0.45; 

    const earthProgress = progress; 
    if (earthProgress > 0.1 && earthProgress < 0.9) {
        const earthRange = (earthProgress - 0.1) / 0.8;
        const angle = Math.PI + (earthRange * Math.PI);
        const earthX = centerX + Math.cos(angle) * radius;
        const earthY = centerY + Math.sin(angle) * radius;

        const glow = ctx.createRadialGradient(earthX, earthY, 30, earthX, earthY, 80);
        glow.addColorStop(0, "rgba(100, 150, 255, 0.3)");
        glow.addColorStop(1, "rgba(100, 150, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(earthX - 80, earthY - 80, 160, 160);
        
        ctx.fillStyle = "#1E90FF"; 
        ctx.fillRect(earthX - 30, earthY - 30, 60, 60); 
        ctx.fillStyle = "#32CD32"; 
        ctx.fillRect(earthX - 20, earthY - 10, 20, 20);
        ctx.fillRect(earthX + 5, earthY - 20, 15, 25);
        ctx.fillStyle = "#FFFFFF"; 
        ctx.fillRect(earthX - 25, earthY - 25, 15, 10);
        ctx.fillRect(earthX - 10, earthY + 20, 30, 10);
    }

    const sunProgress = (progress + 0.3) % 1.0; 
    if (sunProgress > 0.15 && sunProgress < 0.85) {
        const sunRange = (sunProgress - 0.15) / 0.7; 
        const angle = Math.PI + (sunRange * Math.PI); 
        const sunX = centerX + Math.cos(angle) * radius;
        const sunY = centerY + Math.sin(angle) * radius; 

        const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 100);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.8)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(sunX - 100, sunY - 100, 200, 200); 
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(sunX - 20, sunY - 20, 40, 40); 
    }
}

export function drawFallingUfos(ctx, ufos, camera) {
    for (let ufo of ufos) {
        const sx = Math.floor(ufo.currentX - camera.x);
        const sy = Math.floor(ufo.currentY - camera.y);

        const tailLength = 300;
        const gradient = ctx.createLinearGradient(sx, sy, sx + tailLength, sy - tailLength);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.2, "rgba(255, 200, 0, 0.8)");
        gradient.addColorStop(0.6, "rgba(255, 50, 0, 0.4)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + tailLength + 50, sy - tailLength + 20);
        ctx.lineTo(sx + tailLength + 20, sy - tailLength + 50);
        ctx.fill();

        const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 100);
        glow.addColorStop(0, "rgba(255, 255, 200, 1)");
        glow.addColorStop(0.4, "rgba(255, 100, 0, 0.6)");
        glow.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, 100, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#C0C0C0";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 40, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        ctx.arc(sx, sy - 5, 20, Math.PI, 0);
        ctx.fill();
    }
}

export function drawWorld(ctx, camera, canvasWidth, canvasHeight, time, dayDuration) {
    const isMoon = currentDimension === 'moon';
    const progress = time / dayDuration; 
    
    if (isMoon) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        drawStars(ctx, canvasWidth, canvasHeight, 1.0, time);
        drawMoonCelestialBodies(ctx, canvasWidth, canvasHeight, progress);
    } else {
        ctx.fillStyle = getSmoothSkyColor(progress);
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        drawStars(ctx, canvasWidth, canvasHeight, progress, time);
        drawCelestialBodies(ctx, canvasWidth, canvasHeight, progress);
    }

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
                else if (tile === 13) ctx.fillStyle = '#C0C0C0'; 
                else if (tile === 14) ctx.fillStyle = '#00FFFF'; 
                else if (tile >= 6 && tile <= 9) {
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

export function drawPlayer(ctx, p, camera) {
    const sx = Math.floor(p.x - camera.x);
    const sy = Math.floor(p.y - camera.y);
    
    const facingRight = (p.velX > 0.1) ? true : (p.velX < -0.1 ? false : (p.facingRight ?? true));
    const isMoving = Math.abs(p.velX) > 0.1;
    
    const walkCycle = Math.sin(p.x * 0.2); 
    const legOffset = isMoving ? walkCycle * 5 : 0;
    const armOffset = isMoving ? -walkCycle * 5 : 0; 

    const skinColor = "#f1c27d"; 
    const shirtColor = p.color;  
    const pantsColor = "#223344"; 
    const centerX = sx + p.width / 2;

    ctx.fillStyle = pantsColor; 
    ctx.fillRect(centerX - 8, sy + 28 + legOffset, 6, 12);
    ctx.fillRect(centerX + 2, sy + 28 - legOffset, 6, 12);

    ctx.fillStyle = skinColor; 
    ctx.fillRect(centerX - 10, sy + 14 + armOffset, 6, 14);
    ctx.fillRect(centerX + 4, sy + 14 - armOffset, 6, 14);

    ctx.fillStyle = shirtColor; 
    ctx.fillRect(centerX - 6, sy + 14, 12, 16);
    
    ctx.fillStyle = skinColor; 
    ctx.fillRect(centerX - 8, sy, 16, 14);

    ctx.fillStyle = "white"; 
    const eyeX = facingRight ? centerX + 1 : centerX - 5;
    ctx.fillRect(eyeX, sy + 4, 4, 4);
    
    ctx.fillStyle = "black"; 
    const pupilX = facingRight ? eyeX + 2 : eyeX;
    ctx.fillRect(pupilX, sy + 5, 2, 2);

    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 2;
    ctx.fillText(p.nick || "Gracz", centerX, sy - 18);
    ctx.shadowBlur = 0;

    if (p.hp !== undefined && p.maxHp !== undefined) {
        const hpPercent = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle = "red";
        ctx.fillRect(centerX - 10, sy - 14, 20, 4);
        ctx.fillStyle = "#32CD32";
        ctx.fillRect(centerX - 10, sy - 14, 20 * hpPercent, 4);
    }
    
    if (p.air !== undefined && p.maxAir !== undefined && p.air < p.maxAir) {
        const airPercent = Math.max(0, p.air / p.maxAir);
        ctx.fillStyle = "gray";
        ctx.fillRect(centerX - 10, sy - 19, 20, 4);
        ctx.fillStyle = "#00BFFF";
        ctx.fillRect(centerX - 10, sy - 19, 20 * airPercent, 4);
    }

    ctx.textAlign = "start"; 
}

export function drawDamageTexts(ctx, damageTexts, camera) {
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    for (let t of damageTexts) {
        const sx = Math.floor(t.x - camera.x);
        const sy = Math.floor(t.y - camera.y);
        ctx.fillStyle = `rgba(255, 50, 50, ${t.life / 60})`;
        ctx.shadowColor = "black";
        ctx.shadowBlur = 2;
        ctx.fillText(`-${t.dmg}`, sx, sy);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = "start";
}

export function drawNightOverlay(ctx, canvasWidth, canvasHeight, time, dayDuration) {
    if (currentDimension === 'moon') return;

    const progress = time / dayDuration;
    let darkness = (Math.cos(progress * Math.PI * 2) + 1) / 2;
    darkness = Math.pow(darkness, 4);
    const opacity = darkness * 0.75;

    if (opacity > 0.01) {
        ctx.fillStyle = `rgba(0, 5, 20, ${opacity})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
}

export function drawUI(ctx, canvasWidth, hotbar, selectedSlot, playerX, playerY) {
    const slotSize = 40;
    const padding = 10;
    const startX = (canvasWidth - (hotbar.length * (slotSize + padding))) / 2;
    const startY = 10; 

    for (let i = 0; i < hotbar.length; i++) {
        const x = startX + i * (slotSize + padding);
        ctx.fillStyle = (i === selectedSlot) ? "rgba(255, 255, 0, 0.5)" : "rgba(0, 0, 0, 0.5)"; 
        ctx.fillRect(x, startY, slotSize, slotSize);
        ctx.strokeStyle = "white"; ctx.lineWidth = 2;
        ctx.strokeRect(x, startY, slotSize, slotSize);

        const item = hotbar[i];
        ctx.fillStyle = item.color;
        const itemSize = 20;
        ctx.fillRect(x + (slotSize - itemSize)/2, startY + (slotSize - itemSize)/2, itemSize, itemSize);
        ctx.fillStyle = "white"; ctx.font = "10px Arial";
        ctx.fillText(i + 1, x + 2, startY + 10);
    }
    ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "center";
    ctx.fillText(hotbar[selectedSlot].name, canvasWidth / 2, startY + slotSize + 25);

    if (playerX !== undefined && playerY !== undefined) {
        const gridX = Math.floor(playerX / TILE_SIZE);
        const gridY = Math.floor(playerY / TILE_SIZE);
        
        ctx.textAlign = "right";
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "white";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 3;
        ctx.fillText(`X: ${gridX} | Y: ${gridY}`, canvasWidth - 20, 100);
        ctx.shadowBlur = 0;
    }

    ctx.textAlign = "start"; 
}

export function drawMobs(ctx, mobs, camera) {
    const palette = {
        white: '#F0F0F0', black: '#1a1a1a', hoof: '#0d0d0d',
        nose: '#ff99cc', horns: '#8c8c8c',
        zSkin: '#4B5320', zShirt: '#008080', zPants: '#483D8B',
        pigSkin: '#ffb3c6', pigNose: '#ff809f',
        sheepWool: '#e6e6e6', sheepSkin: '#e0b084'
    };

    for (let id in mobs) {
        let m = mobs[id];
        const sx = Math.floor(m.x - camera.x);
        const sy = Math.floor(m.y - camera.y);

        if (m.type === 'cow') {
            const bodyW = m.width - 10;
            const bodyH = 18;
            const bodyX = m.facingRight ? sx : sx + 10;
            const headX = m.facingRight ? sx + bodyW - 4 : sx;

            ctx.fillStyle = palette.black;
            ctx.fillRect(bodyX + 4, sy + m.height - 10, 4, 10);
            ctx.fillRect(bodyX + bodyW - 8, sy + m.height - 10, 4, 10);
            ctx.fillStyle = palette.white;
            ctx.fillRect(bodyX, sy + 6, bodyW, bodyH);
            ctx.fillStyle = palette.black;
            ctx.fillRect(bodyX + 6, sy + 8, 6, 8);
            ctx.fillStyle = palette.white;
            ctx.fillRect(headX, sy + 2, 14, 14);
            ctx.fillStyle = palette.horns;
            ctx.fillRect(headX + 3, sy - 1, 3, 3);
            ctx.fillStyle = palette.black;
            ctx.fillRect(headX + (m.facingRight ? 8 : 4), sy + 5, 2, 2);
            ctx.fillStyle = palette.nose;
            ctx.fillRect(headX + (m.facingRight ? 8 : 2), sy + 10, 4, 3);
            
        } else if (m.type === 'pig') {
            ctx.fillStyle = palette.pigSkin;
            ctx.fillRect(sx, sy + 6, m.width, 14);
            ctx.fillRect(sx + (m.facingRight ? m.width - 8 : -4), sy + 4, 12, 12);
            ctx.fillStyle = palette.pigNose;
            ctx.fillRect(sx + (m.facingRight ? m.width : -6), sy + 10, 4, 4);
            ctx.fillStyle = palette.black;
            ctx.fillRect(sx + (m.facingRight ? m.width - 2 : 0), sy + 6, 2, 2);
            ctx.fillStyle = palette.pigSkin;
            ctx.fillRect(sx + 4, sy + 16, 4, 4);
            ctx.fillRect(sx + m.width - 8, sy + 16, 4, 4);

        } else if (m.type === 'sheep') {
            ctx.fillStyle = palette.sheepSkin;
            ctx.fillRect(sx + (m.facingRight ? m.width - 6 : -4), sy + 8, 10, 10);
            ctx.fillStyle = palette.black;
            ctx.fillRect(sx + (m.facingRight ? m.width - 2 : 0), sy + 10, 2, 2);
            ctx.fillStyle = palette.sheepWool;
            ctx.fillRect(sx, sy + 4, m.width - 4, 18);
            ctx.fillRect(sx + (m.facingRight ? m.width - 8 : -2), sy + 4, 8, 8);
            ctx.fillStyle = palette.sheepSkin;
            ctx.fillRect(sx + 4, sy + 22, 4, 6);
            ctx.fillRect(sx + m.width - 12, sy + 22, 4, 6);

        } else if (m.type === 'zombie') {
            ctx.fillStyle = palette.zPants;
            ctx.fillRect(sx + 4, sy + 28, 12, 12);
            ctx.fillStyle = palette.zShirt;
            ctx.fillRect(sx + 4, sy + 14, 12, 14);
            ctx.fillStyle = palette.zSkin;
            ctx.fillRect(sx + 2, sy, 16, 14);
            const armDir = m.facingRight ? 4 : -8;
            ctx.fillRect(sx + 4 + armDir, sy + 14, 16, 4);

        } else if (m.type === 'alien') {
            ctx.fillStyle = "#00FF00"; 
            ctx.fillRect(sx, sy, m.width, m.height);
            ctx.fillStyle = "black";
            ctx.fillRect(sx + (m.facingRight ? 16 : 4), sy + 8, 6, 6);
        }

        if (m.hp !== undefined && m.maxHp !== undefined) {
            const hpPercent = Math.max(0, m.hp / m.maxHp);
            ctx.fillStyle = "red";
            ctx.fillRect(sx, sy - 10, m.width, 4);
            ctx.fillStyle = "#32CD32";
            ctx.fillRect(sx, sy - 10, m.width * hpPercent, 4);
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
        ctx.globalAlpha = l.life / 10;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

export function drawDeathScreen(ctx, canvasWidth, canvasHeight) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = "red";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NIE ŻYJESZ", canvasWidth / 2, canvasHeight / 2 - 50);

    const btnWidth = 200;
    const btnHeight = 50;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 20;

    ctx.fillStyle = "#444";
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.fillText("RESPAWN", canvasWidth / 2, btnY + 34);
    ctx.textAlign = "start";
}

export function drawFlightAnimation(ctx, canvasWidth, canvasHeight, timer) {
    const maxTimer = 180;
    const progress = 1 - (timer / maxTimer);

    ctx.fillStyle = "black";
    if (progress < 0.2) {
        ctx.globalAlpha = progress * 5;
    } else if (progress > 0.8) {
        ctx.globalAlpha = (1 - progress) * 5;
    } else {
        ctx.globalAlpha = 1.0;
    }
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.globalAlpha = 1.0;

    if (progress >= 0.2 && progress <= 0.8) {
        const ufoX = canvasWidth * 0.5;
        const ufoY = canvasHeight / 2;
        
        ctx.strokeStyle = "white";
        ctx.beginPath();
        for(let i=0; i<100; i++) {
            const y = Math.random() * canvasHeight;
            const x = (Math.random() * canvasWidth + timer * 30) % canvasWidth;
            const length = Math.random() * 80 + 40;
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y);
        }
        ctx.stroke();

        const shakeX = (Math.random() - 0.5) * 4;
        const shakeY = (Math.random() - 0.5) * 4;
        
        ctx.fillStyle = "rgba(255, 100, 0, 0.9)";
        for(let i=0; i<15; i++) {
            ctx.beginPath();
            ctx.arc(ufoX - 60 - Math.random() * 120, ufoY + Math.random() * 20 - 10 + shakeY, Math.random() * 15 + 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
        for(let i=0; i<20; i++) {
            ctx.beginPath();
            ctx.arc(ufoX - 100 - Math.random() * 200, ufoY + Math.random() * 50 - 25 + shakeY, Math.random() * 25 + 15, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#C0C0C0";
        ctx.beginPath();
        ctx.ellipse(ufoX + shakeX, ufoY + shakeY + 10, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        ctx.arc(ufoX + shakeX, ufoY + shakeY - 5, 30, Math.PI, 0);
        ctx.fill();
    }
}