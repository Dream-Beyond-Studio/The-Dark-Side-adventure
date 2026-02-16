import { TILE_SIZE, MAP_HEIGHT, BUILD_RANGE, ITEM_LASER, SERVER_DEV, SERVER } from './config.js'; 
import { updatePlayerPhysics } from './physics.js';
import { drawWorld, drawUI, drawMobs, drawLasers, drawNightOverlay, drawPlayer } from './render.js'; 
import { getTile, setTile, generateChunk, chunks } from './world.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

window.addEventListener('resize', resizeCanvas);

const myNick = prompt("Podaj swój nick:") || "Gracz";

const socket = io(SERVER);

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
let isChatting = false;

const player = { 
    x: 0, y: 0, 
    width: 20, height: 40, 
    velX: 0, velY: 0, 
    grounded: false, inWater: false, 
    color: '#ff4444',
    nick: myNick 
};

const camera = { x: 0, y: 0 };
const keys = {};
const otherPlayers = {};
let mobs = {}; 
let lasers = []; 
let gameTime = 0; 
let dayDuration = 3600; 

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
let mouseGridX = 0; let mouseGridY = 0; 
let screenMouseX = 0; let screenMouseY = 0; 
let canBuildHere = false;

function castRay(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    const steps = dist / 4; 
    const stepX = dx / steps;
    const stepY = dy / steps;

    let curX = x1;
    let curY = y1;

    for (let i = 0; i < steps; i++) {
        curX += stepX;
        curY += stepY;

        const gridX = Math.floor(curX / TILE_SIZE);
        const gridY = Math.floor(curY / TILE_SIZE);
        const tile = getTile(gridX, gridY);
        
        if (tile !== 0 && tile !== 12 && tile !== 3 && tile !== 4 && tile !== 1) {
            return { x: curX, y: curY, hit: true };
        }
    }
    return { x: x2, y: y2, hit: false };
}

socket.on('connect', () => {
    socket.emit('setNick', myNick);
});

socket.on('initGame', (data) => {
    Object.keys(data.players).forEach(id => {
        if(id !== socket.id) otherPlayers[id] = data.players[id];
    });
    for (const key in data.history) {
        const [xStr, yStr] = key.split(',');
        setTile(parseInt(xStr), parseInt(yStr), data.history[key]);
    }
    gameTime = data.time;
    dayDuration = data.dayDuration;
    initPlayerPosition();
});

socket.on('newPlayer', (data) => otherPlayers[data.id] = data.player);

socket.on('playerMoved', (data) => { 
    if(otherPlayers[data.id]) { 
        otherPlayers[data.id].x = data.x; 
        otherPlayers[data.id].y = data.y;
        otherPlayers[data.id].velX = data.x - otherPlayers[data.id].x; 
    } 
});

socket.on('playerNickUpdate', (data) => {
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].nick = data.nick;
    }

    if (data.id === socket.id) {
        player.nick = data.nick;
    }
});

socket.on('teleport', (data) => {
    player.x = data.x;
    player.y = data.y;
    player.velX = 0;
    player.velY = 0;
});

socket.on('blockUpdate', (data) => setTile(data.x, data.y, data.type));
socket.on('playerDisconnected', (id) => delete otherPlayers[id]);
socket.on('gameUpdate', (data) => { 
    mobs = data.mobs; 
    gameTime = data.time; 
});
socket.on('playerShoot', (data) => lasers.push({ ...data, life: 10 }));

socket.on('chatMessage', (data) => {
    const msgDiv = document.createElement('div');
    let color = "#AAAAAA"; 
    let fontWeight = "bold";

    if (data.id === socket.id) {
        color = "#00FF00"; 
    } else if (data.id === 'SYSTEM') {
        color = "#FFD700"; 
    } else if (data.id === 'SERVER') {
        color = "#FF0000"; 
        fontWeight = "900"; 
    }

    msgDiv.innerHTML = `<span style="color:${color}; font-weight:${fontWeight};">${data.nick}:</span> ${data.text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatInput.addEventListener('focus', () => { isChatting = true; for(let k in keys) keys[k]=false; });
chatInput.addEventListener('blur', () => { isChatting = false; });
chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && chatInput.value) {
        socket.emit('chatMessage', chatInput.value); chatInput.value = ''; chatInput.blur(); canvas.focus();
    }
});
window.addEventListener('keydown', e => {
    if (isChatting) return;
    keys[e.code] = true;
    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= hotbar.length) selectedSlot = keyNum - 1;
    if (e.key === 'Enter') chatInput.focus();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { 
    const rect = canvas.getBoundingClientRect(); 
    screenMouseX = e.clientX - rect.left; screenMouseY = e.clientY - rect.top; 
});
canvas.addEventListener('mousedown', e => {
    if (isChatting) return;
    const worldMouseX = screenMouseX + camera.x;
    const worldMouseY = screenMouseY + camera.y;

    if (hotbar[selectedSlot].id === ITEM_LASER) {
        if (e.button === 0) {
            const startX = player.x + 10;
            const startY = player.y + 20;
            const hitPoint = castRay(startX, startY, worldMouseX, worldMouseY);
            socket.emit('shoot', { x: hitPoint.x, y: hitPoint.y });
            lasers.push({ x1: startX, y1: startY, x2: hitPoint.x, y2: hitPoint.y, life: 10 });
        }
    } else {
        updateMouseWorldPosition();
        const dist = Math.sqrt(((mouseGridX*TILE_SIZE+16)-(player.x+10))**2 + ((mouseGridY*TILE_SIZE+16)-(player.y+20))**2);
        if (dist > BUILD_RANGE * TILE_SIZE) return;

        const type = (e.button === 0) ? 0 : hotbar[selectedSlot].id;
        if (e.button === 2 && !canBuildHere) return;
        if (getTile(mouseGridX, mouseGridY) === 99) return;

        setTile(mouseGridX, mouseGridY, type);
        socket.emit('blockUpdate', { x: mouseGridX, y: mouseGridY, type: type });
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

function updateMouseWorldPosition() {
    const worldX = screenMouseX + camera.x;
    const worldY = screenMouseY + camera.y;
    mouseGridX = Math.floor(worldX / TILE_SIZE);
    mouseGridY = Math.floor(worldY / TILE_SIZE);
    
    const targetTile = getTile(mouseGridX, mouseGridY);
    const isReplaceable = (targetTile === 0 || targetTile === 3 || targetTile === 4 || targetTile === 12);

    if (!isReplaceable) { canBuildHere = false; return; }

    const top = getTile(mouseGridX, mouseGridY - 1);
    const bottom = getTile(mouseGridX, mouseGridY + 1);
    const left = getTile(mouseGridX - 1, mouseGridY);
    const right = getTile(mouseGridX + 1, mouseGridY);

    const hasSupport = (top !== 0 || bottom !== 0 || left !== 0 || right !== 0);
    canBuildHere = hasSupport;
}

function initPlayerPosition() {
    if (!chunks[0]) generateChunk(0);
    let spawnY = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const tile = getTile(0, y);
        if (tile !== 0 && tile !== 3 && tile !== 4 && tile !== 12) { spawnY = y; break; }
    }
    player.x = 0; player.y = (spawnY - 2) * TILE_SIZE;
}

function loop() {
    updatePlayerPhysics(player, keys);
    if (player.y > (MAP_HEIGHT + 10) * TILE_SIZE) { initPlayerPosition(); player.velY = 0; }

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    if (camera.y > (MAP_HEIGHT * TILE_SIZE) - canvas.height) camera.y = (MAP_HEIGHT * TILE_SIZE) - canvas.height;

    updateMouseWorldPosition();
    if (player.velX !== 0 || player.velY !== 0) socket.emit('playerMovement', { x: player.x, y: player.y });

    drawWorld(ctx, camera, canvas.width, canvas.height, gameTime, dayDuration);
    drawMobs(ctx, mobs, camera);

    for (let id in otherPlayers) {
        drawPlayer(ctx, otherPlayers[id], camera);
    }

    drawLasers(ctx, lasers, camera);
    for (let i = lasers.length - 1; i >= 0; i--) { if (--lasers[i].life <= 0) lasers.splice(i, 1); }

    drawPlayer(ctx, player, camera);
    drawNightOverlay(ctx, canvas.width, canvas.height, gameTime, dayDuration);

    if (hotbar[selectedSlot].id !== ITEM_LASER) {
        ctx.strokeStyle = canBuildHere ? hotbar[selectedSlot].color : "red"; 
        ctx.lineWidth = 3;
        ctx.strokeRect(mouseGridX * TILE_SIZE - camera.x, mouseGridY * TILE_SIZE - camera.y, TILE_SIZE, TILE_SIZE);
    }
    drawUI(ctx, canvas.width, hotbar, selectedSlot);

    requestAnimationFrame(loop);
}

initPlayerPosition();
loop();