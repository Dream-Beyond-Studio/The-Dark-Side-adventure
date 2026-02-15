import { TILE_SIZE, MAP_HEIGHT, BUILD_RANGE, ITEM_LASER, SERVER_DEV, SERVER } from './config.js'; 
import { updatePlayerPhysics } from './physics.js';
import { drawWorld, drawUI, drawMobs, drawLasers } from './render.js'; 
import { getTile, setTile, generateChunk, chunks } from './world.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

const socket = io(SERVER);

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
let isChatting = false;

// --- STAN GRY ---
const player = { 
    x: 0, y: 0, 
    width: 20, height: 40, 
    velX: 0, velY: 0, 
    grounded: false, inWater: false, 
    color: '#ff4444' 
};

const camera = { x: 0, y: 0 };
const keys = {};
const otherPlayers = {};
let mobs = {}; 
let lasers = []; 

const hotbar = [
    { id: 2, name: "Ziemia", color: '#5C4033' },
    { id: 1, name: "Trawa", color: '#32CD32' },
    { id: 5, name: "Kamień", color: '#808080' },
    { id: 3, name: "Drewno", color: '#8B4513' },
    { id: 10, name: "Deski", color: '#DEB887' },
    { id: ITEM_LASER, name: "Dzida Laserowa", color: '#FF0000' },
    { id: 11, name: "Cegły", color: '#B22222' },
    { id: 12, name: "Woda", color: '#4169E1' }
];

let selectedSlot = 0;
let mouseGridX = 0; 
let mouseGridY = 0; 
let screenMouseX = 0; 
let screenMouseY = 0; 
let canBuildHere = false;

// --- KOMUNIKACJA SIECIOWA (SOCKETS) ---
socket.on('currentPlayers', (players) => { 
    Object.keys(players).forEach(id => { 
        if(id !== socket.id) otherPlayers[id] = players[id]; 
    }); 
});

socket.on('newPlayer', (data) => otherPlayers[data.id] = data.player);

socket.on('playerMoved', (data) => { 
    if(otherPlayers[data.id]) { 
        otherPlayers[data.id].x = data.x; 
        otherPlayers[data.id].y = data.y; 
    } 
});

socket.on('worldHistory', (history) => {
    for (const key in history) {
        const [xStr, yStr] = key.split(',');
        setTile(parseInt(xStr), parseInt(yStr), history[key]);
    }
    initPlayerPosition();
});

socket.on('blockUpdate', (data) => setTile(data.x, data.y, data.type));
socket.on('playerDisconnected', (id) => delete otherPlayers[id]);
socket.on('mobsUpdate', (serverMobs) => { mobs = serverMobs; });

socket.on('playerShoot', (data) => {
    lasers.push({ x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2, life: 10 });
});

socket.on('chatMessage', (data) => {
    const msgDiv = document.createElement('div');
    const senderName = (data.id === socket.id) ? "Ty" : "Gracz";
    const color = (data.id === socket.id) ? "#00FF00" : "#AAAAAA";
    msgDiv.innerHTML = `<span style="color:${color}; font-weight:bold;">${senderName}:</span> ${data.text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- OBSŁUGA WEJŚCIA (KLAWIATURA I MYSZ) ---
chatInput.addEventListener('focus', () => { 
    isChatting = true; 
    for(let k in keys) keys[k] = false; 
});
chatInput.addEventListener('blur', () => { isChatting = false; });

chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
        const text = chatInput.value;
        if (text) { 
            socket.emit('chatMessage', text); 
            chatInput.value = ''; 
            chatInput.blur(); 
            canvas.focus(); 
        }
    }
});

window.addEventListener('keydown', e => {
    if (isChatting) return;
    keys[e.code] = true;

    // POPRAWKA: Dynamiczny wybór slotu (obsługuje dowolną liczbę itemów)
    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= hotbar.length) {
        selectedSlot = keyNum - 1;
    }

    if (e.key === 'Enter') { chatInput.focus(); return; }
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('contextmenu', e => e.preventDefault());

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
    const padding = 1;
    const blockToPlace = hotbar[selectedSlot].id;

    if (blockToPlace !== 12 && blockToPlace !== ITEM_LASER) { 
        if (player.x + padding < blockLeft + TILE_SIZE && 
            player.x + player.width - padding > blockLeft && 
            player.y + padding < blockTop + TILE_SIZE && 
            player.y + player.height - padding > blockTop) return; 
    }
    canBuildHere = true;
}

function updateMouseWorldPosition() {
    const worldX = screenMouseX + camera.x;
    const worldY = screenMouseY + camera.y;
    mouseGridX = Math.floor(worldX / TILE_SIZE);
    mouseGridY = Math.floor(worldY / TILE_SIZE);
    checkBuildValidity();
}

canvas.addEventListener('mousemove', e => { 
    const rect = canvas.getBoundingClientRect(); 
    screenMouseX = e.clientX - rect.left; 
    screenMouseY = e.clientY - rect.top; 
});

canvas.addEventListener('mousedown', e => {
    if (isChatting) return;
    const worldMouseX = screenMouseX + camera.x;
    const worldMouseY = screenMouseY + camera.y;
    const currentItem = hotbar[selectedSlot].id;

    if (currentItem === ITEM_LASER) {
        if (e.button === 0) {
            const startX = player.x + player.width / 2;
            const startY = player.y + player.height / 2;
            lasers.push({ x1: startX, y1: startY, x2: worldMouseX, y2: worldMouseY, life: 10 });
            socket.emit('shoot', { x: worldMouseX, y: worldMouseY });
        }
    } else {
        updateMouseWorldPosition();
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const tileCenterX = mouseGridX * TILE_SIZE + TILE_SIZE / 2;
        const tileCenterY = mouseGridY * TILE_SIZE + TILE_SIZE / 2;
        const dist = Math.sqrt((tileCenterX-playerCenterX)**2 + (tileCenterY-playerCenterY)**2);
        
        if (dist > BUILD_RANGE * TILE_SIZE) return;

        if (e.button === 0) {
            if (getTile(mouseGridX, mouseGridY) === 99) return;
            setTile(mouseGridX, mouseGridY, 0);
            socket.emit('blockUpdate', { x: mouseGridX, y: mouseGridY, type: 0 });
        } else if (e.button === 2 && canBuildHere) {
            const type = hotbar[selectedSlot].id;
            setTile(mouseGridX, mouseGridY, type);
            socket.emit('blockUpdate', { x: mouseGridX, y: mouseGridY, type: type });
        }
    }
});

function initPlayerPosition() {
    if (!chunks[0]) generateChunk(0);
    let spawnY = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const tile = getTile(0, y);
        if (tile !== 0 && tile !== 3 && tile !== 4 && tile !== 12) { spawnY = y; break; }
    }
    player.x = 0; 
    player.y = (spawnY - 2) * TILE_SIZE;
}

// --- GŁÓWNA PĘTLA GRY ---
function loop() {
    updatePlayerPhysics(player, keys);

    if (player.y > (MAP_HEIGHT + 10) * TILE_SIZE) { 
        initPlayerPosition(); 
        player.velY = 0; 
    }
    
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    if (camera.y > (MAP_HEIGHT * TILE_SIZE) - canvas.height) {
        camera.y = (MAP_HEIGHT * TILE_SIZE) - canvas.height;
    }

    updateMouseWorldPosition();

    if (player.velX !== 0 || player.velY !== 0) {
        socket.emit('playerMovement', { x: player.x, y: player.y });
    }

    // RYSOWANIE KOLEJNYCH WARSTW
    drawWorld(ctx, camera, canvas.width, canvas.height);
    drawMobs(ctx, mobs, camera);

    for (let id in otherPlayers) {
        const p = otherPlayers[id];
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x - camera.x), Math.floor(p.y - camera.y), p.width, p.height);
    }

    drawLasers(ctx, lasers, camera);
    for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].life--;
        if (lasers[i].life <= 0) lasers.splice(i, 1);
    }

    if (hotbar[selectedSlot].id === ITEM_LASER) {
        ctx.strokeStyle = "red"; 
        ctx.lineWidth = 1; 
        ctx.beginPath();
        const mx = screenMouseX; 
        const my = screenMouseY;
        ctx.moveTo(mx - 15, my); ctx.lineTo(mx + 15, my);
        ctx.moveTo(mx, my - 15); ctx.lineTo(mx, my + 15);
        ctx.stroke();
    } else {
        if (canBuildHere) { 
            ctx.strokeStyle = hotbar[selectedSlot].color; 
            ctx.lineWidth = 4; 
        } else { 
            ctx.strokeStyle = "#FF0000"; 
            ctx.lineWidth = 2; 
        }
        ctx.strokeRect(
            Math.floor(mouseGridX * TILE_SIZE - camera.x), 
            Math.floor(mouseGridY * TILE_SIZE - camera.y), 
            TILE_SIZE, TILE_SIZE
        );
    }

    ctx.fillStyle = player.color;
    ctx.fillRect(Math.floor(player.x - camera.x), Math.floor(player.y - camera.y), player.width, player.height);

    drawUI(ctx, canvas.width, hotbar, selectedSlot);

    requestAnimationFrame(loop);
}

initPlayerPosition();
loop();