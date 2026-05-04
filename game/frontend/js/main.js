import { TILE_SIZE, MAP_HEIGHT, BUILD_RANGE, ITEM_LASER, SERVER, SERVER_DEV } from './config.js'; 
import { drawWorld, drawUI, drawMobs, drawLasers, drawNightOverlay, drawPlayer, drawDamageTexts, drawDeathScreen } from './render.js'; 
import { getTile, setTile, initWorldData, updateChunk } from './world.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const myNick = prompt("Podaj swój nick:") || "Gracz";
const socket = io(SERVER);

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
let isChatting = false;

const camera = { x: 0, y: 0 };
const keys = { left: false, right: false, jump: false };
let localPlayers = {};
let localMobs = {};
let targetPlayers = {};
let targetMobs = {};

let lasers = [];
let damageTexts = [];
let gameTime = 0; 
let dayDuration = 3600; 
let lastKeysJSON = ""; 

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
    targetPlayers = data.players;
    targetMobs = data.mobs;
    gameTime = data.time;
});

socket.on('blockUpdate', (data) => setTile(data.x, data.y, data.type));

socket.on('playerShoot', (data) => {
    lasers.push({ x1: data.x1, y1: data.y1, x2: data.x2, y2: data.y2, life: 10 });
});

socket.on('damageText', (data) => {
    damageTexts.push({ x: data.x, y: data.y, dmg: data.dmg, life: 60 });
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

    const myPlayer = localPlayers[socket.id];
    if (!myPlayer) return;

    if (myPlayer.isDead) {
        const btnWidth = 200;
        const btnHeight = 50;
        const btnX = canvas.width / 2 - btnWidth / 2;
        const btnY = canvas.height / 2 + 20;

        if (screenMouseX >= btnX && screenMouseX <= btnX + btnWidth && screenMouseY >= btnY && screenMouseY <= btnY + btnHeight) {
            socket.emit('respawn');
        }
        return;
    }

    const targetItem = hotbar[selectedSlot].id;

    if (targetItem === ITEM_LASER) {
        if (e.button === 0) {
            const targetX = screenMouseX + camera.x;
            const targetY = screenMouseY + camera.y;
            
            socket.emit('shoot', { x: targetX, y: targetY });
            
            lasers.push({
                x1: myPlayer.x + myPlayer.width / 2,
                y1: myPlayer.y + myPlayer.height / 2,
                x2: targetX,
                y2: targetY,
                life: 10
            });
        }
        return;
    }

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
    const currentKeysJSON = JSON.stringify(keys);
    if (currentKeysJSON !== lastKeysJSON) {
        socket.emit('input', keys);
        lastKeysJSON = currentKeysJSON;
    }

    for (let id in targetPlayers) {
        let tp = targetPlayers[id];
        if (!localPlayers[id]) {
            localPlayers[id] = { ...tp };
        } else {
            localPlayers[id].x += (tp.x - localPlayers[id].x) * 0.3;
            localPlayers[id].y += (tp.y - localPlayers[id].y) * 0.3;
            localPlayers[id].velX = tp.velX; 
            localPlayers[id].facingRight = tp.facingRight;
            localPlayers[id].nick = tp.nick;
            localPlayers[id].color = tp.color;
            localPlayers[id].width = tp.width;
            localPlayers[id].height = tp.height;
            localPlayers[id].hp = tp.hp;
            localPlayers[id].maxHp = tp.maxHp;
            localPlayers[id].isDead = tp.isDead;
        }
    }
    for (let id in localPlayers) if (!targetPlayers[id]) delete localPlayers[id];

    for (let id in targetMobs) {
        let tm = targetMobs[id];
        if (!localMobs[id]) {
            localMobs[id] = { ...tm };
        } else {
            localMobs[id].x += (tm.x - localMobs[id].x) * 0.3;
            localMobs[id].y += (tm.y - localMobs[id].y) * 0.3;
            localMobs[id].facingRight = tm.facingRight;
            localMobs[id].width = tm.width;
            localMobs[id].height = tm.height;
            localMobs[id].type = tm.type;
            localMobs[id].hp = tm.hp;
            localMobs[id].maxHp = tm.maxHp;
        }
    }
    for (let id in localMobs) if (!targetMobs[id]) delete localMobs[id];

    for (let i = damageTexts.length - 1; i >= 0; i--) {
        damageTexts[i].y -= 0.5; 
        if (--damageTexts[i].life <= 0) damageTexts.splice(i, 1);
    }

    const myPlayer = localPlayers[socket.id];
    let pX, pY;

    if (myPlayer) {
        camera.x = myPlayer.x - canvas.width / 2;
        camera.y = myPlayer.y - canvas.height / 2;
        if (camera.y > (MAP_HEIGHT * TILE_SIZE) - canvas.height) camera.y = (MAP_HEIGHT * TILE_SIZE) - canvas.height;
        
        pX = myPlayer.x;
        pY = myPlayer.y;
    }

    updateMouseWorldPosition();

    drawWorld(ctx, camera, canvas.width, canvas.height, gameTime, dayDuration);
    drawMobs(ctx, localMobs, camera);

    for (let id in localPlayers) {
        drawPlayer(ctx, localPlayers[id], camera);
    }

    drawDamageTexts(ctx, damageTexts, camera);

    drawNightOverlay(ctx, canvas.width, canvas.height, gameTime, dayDuration);

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
    
    drawUI(ctx, canvas.width, hotbar, selectedSlot, pX, pY);

    if (myPlayer && myPlayer.isDead) {
        drawDeathScreen(ctx, canvas.width, canvas.height);
    }

    requestAnimationFrame(loop);
}

loop();