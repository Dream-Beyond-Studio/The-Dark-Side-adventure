import { TILE_SIZE, MAP_HEIGHT, BUILD_RANGE, ITEM_LASER, SERVER_DEV } from './config.js'; 
import { drawWorld, drawUI, drawMobs, drawLasers, drawNightOverlay, drawPlayer } from './render.js'; 
import { getTile, setTile, initWorldData, updateChunk } from './world.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const myNick = prompt("Podaj swój nick:") || "Gracz";
const socket = io(SERVER_DEV);

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
let isChatting = false;

const camera = { x: 0, y: 0 };
const keys = { left: false, right: false, jump: false };
let players = {};
let mobs = {}; 
let lasers = []; // Tablica przechowująca strzały do narysowania
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
let mouseGridX = 0, mouseGridY = 0, screenMouseX = 0, screenMouseY = 0; 
let canBuildHere = false;
let canMineHere = false;

socket.on('connect', () => socket.emit('setNick', myNick));

socket.on('initWorld', (data) => {
    initWorldData(data.chunks, data.worldChanges);
    dayDuration = data.dayDuration;
});

socket.on('newChunk', (data) => updateChunk(data.chunkX, data.data));

socket.on('gameState', (data) => {
    players = data.players;
    mobs = data.mobs;
    gameTime = data.time;
});

socket.on('blockUpdate', (data) => setTile(data.x, data.y, data.type));

// ODBIERANIE STRZAŁÓW OD INNYCH GRACZY
socket.on('playerShoot', (data) => {
    lasers.push({ x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2, life: 10 });
});

socket.on('chatMessage', (msgData) => {
    const div = document.createElement('div');
    if (msgData.id === 'SYSTEM') div.style.color = '#ffcc00'; 
    div.innerHTML = `<b>${msgData.nick}:</b> ${msgData.text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatInput.addEventListener('focus', () => isChatting = true);
chatInput.addEventListener('blur', () => {
    isChatting = false;
    keys.left = false; keys.right = false; keys.jump = false;
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        if (msg) socket.emit('chatMessage', msg);
        chatInput.value = '';
        chatInput.blur();
        canvas.focus();
    }
});

window.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !isChatting) { chatInput.focus(); e.preventDefault(); return; }
    if (isChatting) return; 
    
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') keys.jump = true;
    
    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= hotbar.length) selectedSlot = keyNum - 1;
});

window.addEventListener('keyup', e => {
    if (isChatting) return; 
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') keys.jump = false;
});

canvas.addEventListener('mousemove', e => { screenMouseX = e.clientX; screenMouseY = e.clientY; });

canvas.addEventListener('mousedown', e => {
    if (isChatting) return;

    const myPlayer = players[socket.id];
    if (!myPlayer) return;

    const targetItem = hotbar[selectedSlot].id;

    // --- DZIDA LASEROWA ---
    if (targetItem === ITEM_LASER) {
        if (e.button === 0) { // Strzał tylko Lewym Przyciskiem Myszy
            const targetX = screenMouseX + camera.x;
            const targetY = screenMouseY + camera.y;
            
            // Wysłanie strzału do serwera (by zabić krowy i pokazać innym)
            socket.emit('shoot', { x: targetX, y: targetY });
            
            // Narysowanie lasera u siebie natychmiast
            lasers.push({
                x1: myPlayer.x + myPlayer.width / 2,
                y1: myPlayer.y + myPlayer.height / 2,
                x2: targetX,
                y2: targetY,
                life: 10
            });
        }
        return; // Blokujemy budowanie/kopanie gdy mamy wybraną broń
    }

    // --- BUDOWANIE / KOPANIE ---
    const dist = Math.sqrt(((mouseGridX*TILE_SIZE+16)-(myPlayer.x+10))**2 + ((mouseGridY*TILE_SIZE+16)-(myPlayer.y+20))**2);
    if (dist > BUILD_RANGE * TILE_SIZE) return;

    const type = (e.button === 0) ? 0 : targetItem;

    if (e.button === 0 && !canMineHere) return; 
    if (e.button === 2 && !canBuildHere) return; 

    socket.emit('blockUpdate', { x: mouseGridX, y: mouseGridY, type: type });
    setTile(mouseGridX, mouseGridY, type); 
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

function updateMouseWorldPosition() {
    mouseGridX = Math.floor((screenMouseX + camera.x) / TILE_SIZE);
    mouseGridY = Math.floor((screenMouseY + camera.y) / TILE_SIZE);
    
    const targetTile = getTile(mouseGridX, mouseGridY);
    const isReplaceable = (targetTile === 0 || targetTile === 4 || targetTile === 12); 

    canMineHere = !isReplaceable && targetTile !== 99;
    if (!isReplaceable) { canBuildHere = false; return; }

    function isSupport(t) { return t !== 0 && t !== 12 && t !== 4; }
    const top = getTile(mouseGridX, mouseGridY - 1);
    const bottom = getTile(mouseGridX, mouseGridY + 1);
    const left = getTile(mouseGridX - 1, mouseGridY);
    const right = getTile(mouseGridX + 1, mouseGridY);

    canBuildHere = isSupport(top) || isSupport(bottom) || isSupport(left) || isSupport(right);
}

function loop() {
    socket.emit('input', keys);

    const myPlayer = players[socket.id];
    if (myPlayer) {
        camera.x = myPlayer.x - canvas.width / 2;
        camera.y = myPlayer.y - canvas.height / 2;
        if (camera.y > (MAP_HEIGHT * TILE_SIZE) - canvas.height) camera.y = (MAP_HEIGHT * TILE_SIZE) - canvas.height;
    }

    updateMouseWorldPosition();

    drawWorld(ctx, camera, canvas.width, canvas.height, gameTime, dayDuration);
    drawMobs(ctx, mobs, camera);

    for (let id in players) {
        drawPlayer(ctx, players[id], camera);
    }

    drawNightOverlay(ctx, canvas.width, canvas.height, gameTime, dayDuration);

    // Rysowanie i stopniowe zanikanie laserów
    drawLasers(ctx, lasers, camera);
    for (let i = lasers.length - 1; i >= 0; i--) { 
        if (--lasers[i].life <= 0) lasers.splice(i, 1); 
    }

    if (hotbar[selectedSlot].id !== ITEM_LASER) {
        if (canBuildHere) ctx.strokeStyle = hotbar[selectedSlot].color;
        else if (canMineHere) ctx.strokeStyle = "white"; 
        else ctx.strokeStyle = "red"; 
        
        ctx.lineWidth = 3;
        ctx.strokeRect(mouseGridX * TILE_SIZE - camera.x, mouseGridY * TILE_SIZE - camera.y, TILE_SIZE, TILE_SIZE);
    }
    
    drawUI(ctx, canvas.width, hotbar, selectedSlot);

    requestAnimationFrame(loop);
}

loop();