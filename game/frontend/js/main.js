const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- KONFIGURACJA ---
const TILE_SIZE = 32;
const CHUNK_SIZE = 16;
const GRAVITY = 0.5;
const JUMP_FORCE = -11;
const SPEED = 5;
const BUILD_RANGE = 6;
const MAP_HEIGHT = 64; 

// POZIOM MORZA
const SEA_LEVEL = 35; 

canvas.width = 960;
canvas.height = 540;

// --- STAN GRY ---
const chunks = {}; 
const keys = {};

// EKWIPUNEK
const hotbar = [
    { id: 2, name: "Ziemia", color: '#5C4033' },
    { id: 1, name: "Trawa", color: '#32CD32' },
    { id: 5, name: "Kamień", color: '#808080' },
    { id: 3, name: "Drewno", color: '#8B4513' },
    { id: 10, name: "Deski", color: '#DEB887' },
    { id: 11, name: "Cegły", color: '#B22222' },
    { id: 12, name: "Woda", color: '#4169E1' }
];

let selectedSlot = 0;

// KAMERA
const camera = { x: 0, y: 0 };
let mouseGridX = 0;
let mouseGridY = 0;
let canBuildHere = false;

// GRACZ
const player = {
    x: 0, 
    y: 0, // Zostanie nadpisane przez funkcję initPlayerPosition
    width: 20,
    height: 40,
    velX: 0,
    velY: 0,
    grounded: false,
    inWater: false, 
    color: '#ff4444'
};

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.key >= '1' && e.key <= '7') {
        selectedSlot = parseInt(e.key) - 1;
    }
});

window.addEventListener('keyup', e => keys[e.code] = false);

// --- UPDATE KAMERY ---
function updateCamera() {
    let targetX = Math.floor(player.x - canvas.width / 2);
    let targetY = Math.floor(player.y - canvas.height / 2);
    const maxCamY = (MAP_HEIGHT * TILE_SIZE) - canvas.height;
    if (targetY > maxCamY) targetY = maxCamY;
    camera.x = targetX;
    camera.y = targetY;
}

// --- NOWOŚĆ: FUNKCJA USTAWIAJĄCA SPAWN ---
function initPlayerPosition() {
    // 1. Upewnij się, że chunk startowy (0) jest wygenerowany
    if (!chunks[0]) generateChunk(0);

    // 2. Szukamy gruntu w kolumnie x = 0 (środek świata)
    // Zaczynamy od góry i idziemy w dół
    let spawnY = 0;
    
    // x wewnątrz chunka 0 to po prostu 0
    const chunkData = chunks[0]; 

    for (let y = 0; y < MAP_HEIGHT; y++) {
        const tile = chunkData[y][0]; // Sprawdzamy pierwszy blok w chunku

        // Szukamy pierwszego solidnego bloku lub wody
        // Ignorujemy powietrze (0), drewno (3) i liście (4), żeby nie zrespić się na czubku drzewa
        if (tile !== 0 && tile !== 3 && tile !== 4) {
            spawnY = y;
            break; 
        }
    }

    // 3. Ustawiamy gracza 2 bloki nad znalezionym gruntem
    player.x = 0; // Wyśrodkowany X
    player.y = (spawnY - 2) * TILE_SIZE; 
    
    // Resetujemy kamerę od razu na gracza
    updateCamera();
}

// --- OBSŁUGA MYSZY ---
canvas.addEventListener('contextmenu', e => e.preventDefault());

function updateMouseLogic(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = mouseX + camera.x;
    const worldY = mouseY + camera.y;

    mouseGridX = Math.floor(worldX / TILE_SIZE);
    mouseGridY = Math.floor(worldY / TILE_SIZE);

    checkBuildValidity();
}

canvas.addEventListener('mousemove', updateMouseLogic);

canvas.addEventListener('mousedown', e => {
    updateMouseLogic(e); 
    const gridX = mouseGridX;
    const gridY = mouseGridY;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const tileCenterX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const tileCenterY = gridY * TILE_SIZE + TILE_SIZE / 2;
    const dx = tileCenterX - playerCenterX;
    const dy = tileCenterY - playerCenterY;
    
    if (Math.sqrt(dx*dx + dy*dy) > BUILD_RANGE * TILE_SIZE) return;

    if (e.button === 0) {
        // LEWY: Niszczenie
        const targetTile = getTile(gridX, gridY);
        if (targetTile === 99) return; 
        setTile(gridX, gridY, 0); 
    } 
    else if (e.button === 2) {
        // PRAWY: Budowanie
        if (canBuildHere) {
            const blockToPlace = hotbar[selectedSlot].id;
            setTile(gridX, gridY, blockToPlace); 
        }
    }
});

function checkBuildValidity() {
    canBuildHere = false;
    const currentTile = getTile(mouseGridX, mouseGridY);
    if (!(currentTile === 0 || currentTile === 3 || currentTile === 4 || currentTile === 12)) return;

    const top = getTile(mouseGridX, mouseGridY - 1);
    const bottom = getTile(mouseGridX, mouseGridY + 1);
    const left = getTile(mouseGridX - 1, mouseGridY);
    const right = getTile(mouseGridX + 1, mouseGridY);
    const hasSupport = (top !== 0) || (bottom !== 0) || (left !== 0) || (right !== 0);
    if (!hasSupport) return;

    const blockLeft = mouseGridX * TILE_SIZE;
    const blockTop = mouseGridY * TILE_SIZE;
    const blockRight = blockLeft + TILE_SIZE;
    const blockBottom = blockTop + TILE_SIZE;
    const padding = 1;

    const blockToPlace = hotbar[selectedSlot].id;
    if (blockToPlace !== 12) { 
        if (player.x + padding < blockRight &&
            player.x + player.width - padding > blockLeft &&
            player.y + padding < blockBottom &&
            player.y + player.height - padding > blockTop) {
            return; 
        }
    }
    canBuildHere = true;
}

// --- ZARZĄDZANIE KAFELKAMI ---

function getTile(gridX, gridY) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    if (!chunks[chunkX]) generateChunk(chunkX);
    if (gridY >= MAP_HEIGHT) return 99; 
    if (gridY < 0) return 0; 
    
    return chunks[chunkX][gridY][localX];
}

function setTile(gridX, gridY, value) {
    const chunkX = Math.floor(gridX / CHUNK_SIZE);
    const localX = ((gridX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    if (!chunks[chunkX]) generateChunk(chunkX);
    if (gridY >= MAP_HEIGHT || gridY < 0) return;

    if (chunks[chunkX] && chunks[chunkX][gridY] !== undefined) {
        chunks[chunkX][gridY][localX] = value;
    }
    checkBuildValidity(); 
}

function createTree(chunkData, localX, groundY) {
    const treeHeight = Math.floor(Math.random() * 4) + 3;
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

function spawnVein(chunkData, centerX, centerY, oreID) {
    const positions = [{x:0,y:0}, {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
    for (let pos of positions) {
        if (Math.random() > 0.3) {
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

function isCave(x, y) {
    const val = Math.sin(x / 15) * Math.cos(y / 15) + Math.sin((x + y) / 30) * 0.5;
    return val > 0.5;
}

function generateChunk(chunkX) {
    const chunkData = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        chunkData[y] = new Array(CHUNK_SIZE).fill(0);
    }

    for (let x = 0; x < CHUNK_SIZE; x++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const baseHeight = 30; 
        const noise = Math.sin(worldX * 0.1) * 8 + Math.sin(worldX * 0.05) * 12;
        const surfaceY = Math.floor(baseHeight + noise + 5);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            if (y >= MAP_HEIGHT - 3) { 
                chunkData[y][x] = 99; // Bedrock
                continue;
            }

            if (y <= surfaceY && y > SEA_LEVEL) {
                chunkData[y][x] = 12; // Woda
            }

            if (y > surfaceY) {
                if (y > surfaceY + 4 && isCave(worldX, y)) {
                    chunkData[y][x] = 0; 
                } else {
                    if (y < surfaceY + 8) chunkData[y][x] = 2; 
                    else chunkData[y][x] = 5; 
                }
            } else if (y === surfaceY) {
                if (y > SEA_LEVEL) {
                     chunkData[y][x] = 2; 
                } else {
                     chunkData[y][x] = 1; 
                     if (x > 1 && x < CHUNK_SIZE - 2 && Math.random() < 0.1) {
                         createTree(chunkData, x, surfaceY);
                     }
                }
            }
        }
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            if (y > 30 && Math.random() < 0.02) spawnVein(chunkData, x, y, 6);
            if (y > 40 && Math.random() < 0.015) spawnVein(chunkData, x, y, 7);
            if (y > 50 && Math.random() < 0.008) spawnVein(chunkData, x, y, 8);
            if (y > 55 && Math.random() < 0.004) spawnVein(chunkData, x, y, 9);
        }
    }
    chunks[chunkX] = chunkData;
}

// --- FIZYKA ---

function isSolid(x, y) {
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    if (gridY >= MAP_HEIGHT) return true; 
    const tile = getTile(gridX, gridY);
    if (tile === 0 || tile === 3 || tile === 4 || tile === 12) return false;
    return true; 
}

function update() {
    const centerX = player.x + player.width / 2;
    const feetY = player.y + player.height - 2; 
    
    const centerGridX = Math.floor(centerX / TILE_SIZE);
    const feetGridY = Math.floor(feetY / TILE_SIZE);
    
    player.inWater = (getTile(centerGridX, feetGridY) === 12);

    let currentSpeed = SPEED;
    if (player.inWater) currentSpeed = SPEED * 0.5; 

    if (keys['ArrowLeft'] || keys['KeyA']) player.velX = -currentSpeed;
    else if (keys['ArrowRight'] || keys['KeyD']) player.velX = currentSpeed;
    else player.velX = 0;

    player.x += player.velX;

    const pointsY = [player.y + 2, player.y + player.height / 2, player.y + player.height - 2];
    for (let py of pointsY) {
        if (player.velX > 0 && isSolid(player.x + player.width, py)) {
            player.x = (Math.floor((player.x + player.width) / TILE_SIZE) * TILE_SIZE) - player.width;
            player.velX = 0; break;
        }
        if (player.velX < 0 && isSolid(player.x, py)) {
            player.x = (Math.floor(player.x / TILE_SIZE) + 1) * TILE_SIZE;
            player.velX = 0; break;
        }
    }

    if (player.inWater) {
        if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
            player.velY = -4; 
        } else {
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

    const pointsX = [player.x + 2, player.x + player.width - 2];
    for (let px of pointsX) {
        if (player.velY > 0 && isSolid(px, player.y + player.height)) {
            player.y = (Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE) - player.height;
            player.velY = 0; player.grounded = true; break;
        }
        if (player.velY < 0 && isSolid(px, player.y)) {
            player.y = (Math.floor(player.y / TILE_SIZE) + 1) * TILE_SIZE;
            player.velY = 0; break;
        }
    }
    
    // Reset pozycji - teraz używamy initPlayerPosition() dla bezpieczeństwa
    if (player.y > (MAP_HEIGHT + 10) * TILE_SIZE) { 
        initPlayerPosition();
        player.velY = 0; 
    }
    
    updateCamera();
}

function drawUI() {
    const slotSize = 40;
    const padding = 10;
    const startX = (canvas.width - (hotbar.length * (slotSize + padding))) / 2;
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
    ctx.fillText(hotbar[selectedSlot].name, canvas.width / 2, startY + slotSize + 25);
    ctx.textAlign = "start"; 
}

function draw() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    const startCol = Math.floor(camera.x / TILE_SIZE) - 1;
    const endCol = Math.floor((camera.x + canvas.width) / TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / TILE_SIZE) - 1;
    const endRow = Math.floor((camera.y + canvas.height) / TILE_SIZE) + 1;

    for (let x = startCol; x <= endCol; x++) {
        for (let y = startRow; y <= endRow; y++) {
            if (y >= MAP_HEIGHT) continue;

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
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    if (tile === 6) ctx.fillStyle = '#000000';      
                    else if (tile === 7) ctx.fillStyle = '#B0C4DE'; 
                    else if (tile === 8) ctx.fillStyle = '#FFD700'; 
                    else if (tile === 9) ctx.fillStyle = '#00FFFF'; 
                    ctx.fillRect(x * TILE_SIZE + 8, y * TILE_SIZE + 8, 16, 16);
                    continue; 
                }
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    if (canBuildHere) {
        ctx.strokeStyle = hotbar[selectedSlot].color; 
        ctx.lineWidth = 4;
    } else {
        ctx.strokeStyle = "#FF0000"; 
        ctx.lineWidth = 2;
    }
    ctx.strokeRect(mouseGridX * TILE_SIZE, mouseGridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.restore();
    drawUI();
    update();
    requestAnimationFrame(draw);
}

// START GRY
initPlayerPosition(); // Wywołujemy RAZ na początku
draw();