// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const CONFIG = {
    // 1. ASSET LINKS (Change these to your filenames or URLs)
    fieldImageSrc: "image.png",       // Background Field
    robotImageSrc: "image copy.png",  // Robot Sprite
    
    // 2. PHYSICAL DIMENSIONS (Inches)
    fieldSizeInches: 144,
    robotWidthInches: 18,
    robotLengthInches: 18,
    
    // 3. STARTING POSITION (In Inches, 0,0 is Center)
    startX: 0, 
    startY: 0, 
    startAngleDeg: -90, // -90 is Up
    
    // 4. VISUALS (Pixels)
    canvasFieldSizePx: 600,
    
    // 5. PERFORMANCE (Speed)
    driveSpeedInchesPerFrame: 0.5,
    turnSpeedDegPerFrame: 2.0,
    
    // 6. RANDOMIZATION
    qrMin: 1,
    qrMax: 4
};

// ==========================================
// 🛠️ SYSTEM SETUP & ASSETS
// ==========================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const codeArea = document.getElementById("code");
const CACHE_KEY = "ftc_sim_code_cache";

// Initialize Images from CONFIG
const robotImg = new Image(); 
robotImg.src = CONFIG.robotImageSrc;

const fieldImg = new Image(); 
fieldImg.src = CONFIG.fieldImageSrc;

// 💾 CACHING
function saveCode() { localStorage.setItem(CACHE_KEY, codeArea.value); }
function loadCode() { 
    const savedCode = localStorage.getItem(CACHE_KEY);
    if (savedCode) codeArea.value = savedCode; 
}
codeArea.addEventListener("input", saveCode);
loadCode();

// =====================
// 🤖 ROBOT STATE
// =====================
const INCH_TO_PX = CONFIG.canvasFieldSizePx / CONFIG.fieldSizeInches;

let robot = { 
    x: CONFIG.startX, 
    y: CONFIG.startY, 
    angle: CONFIG.startAngleDeg * (Math.PI / 180) 
};

let paused = false;
let commandQueue = [];
let currentCommand = null;

// =====================
// 🔍 LOGIC & PARSING
// =====================

function getQRCodeID() {
    const id = Math.floor(Math.random() * (CONFIG.qrMax - CONFIG.qrMin + 1)) + CONFIG.qrMin;
    console.log("QR Code Scanned! ID:", id);
    return id;
}

function runCode() {
    // Reset Robot to Config
    robot.x = CONFIG.startX;
    robot.y = CONFIG.startY;
    robot.angle = CONFIG.startAngleDeg * (Math.PI / 180);
    
    const lines = codeArea.value.split("\n").map(l => l.trim()).filter(l => l !== "");
    commandQueue = parseLogic(lines);
    currentCommand = null;
}

function parseLogic(lines) {
    let commands = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Match Java for-loop: for(int i=0; i<4; i++) or repeat(4)
        const isJavaFor = line.match(/for\s*\(.*<\s*(\d+);.*\)/);
        const isRepeat = line.match(/repeat\((\d+)\)/);

        if (isJavaFor || isRepeat) {
            const count = isJavaFor ? parseInt(isJavaFor[1]) : parseInt(isRepeat[1]);
            let loopBody = [];
            i++; 
            while (i < lines.length && !lines[i].includes("}")) {
                loopBody.push(lines[i]);
                i++;
            }
            for (let j = 0; j < count; j++) {
                loopBody.forEach(loopLine => {
                    const parsed = parseAction(loopLine);
                    if (parsed) commands.push(parsed);
                });
            }
        } else {
            const parsed = parseAction(line);
            if (parsed) commands.push(parsed);
        }
    }
    return commands;
}

function parseAction(line) {
    if (line.includes("qrCode.getID()")) {
        return { type: "log", msg: "QR ID: " + getQRCodeID() };
    }
    const match = line.match(/^(\w+)\((.*)\)/);
    if (!match) return null;
    return {
        type: match[1].toLowerCase(),
        args: match[2].split(",").map(a => parseFloat(a.trim())),
        progress: 0
    };
}

// =====================
// 🏎️ ENGINE
// =====================

function update() {
    if (paused || (!currentCommand && commandQueue.length === 0)) return;

    if (!currentCommand) {
        currentCommand = commandQueue.shift();
        currentCommand.progress = 0; 
    }

    const cmd = currentCommand;
    if (cmd.type === "forward") {
        let dist = cmd.args[0] || 0;
        let spd = CONFIG.driveSpeedInchesPerFrame;
        robot.x += Math.cos(robot.angle) * spd;
        robot.y += Math.sin(robot.angle) * spd;
        cmd.progress += spd;
        if (cmd.progress >= dist) currentCommand = null;
    }
    if (cmd.type === "turn") {
        let deg = cmd.args[0] || 0;
        let targetRad = Math.abs(deg * (Math.PI / 180));
        let spdRad = CONFIG.turnSpeedDegPerFrame * (Math.PI / 180);
        robot.angle += spdRad * (deg > 0 ? 1 : -1);
        cmd.progress += spdRad;
        if (cmd.progress >= targetRad) currentCommand = null;
    }
    if (cmd.type === "log") currentCommand = null;
}

// =====================
// 🎨 RENDERER
// =====================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // DRAW FIELD
    const fSize = CONFIG.canvasFieldSizePx;
    if (fieldImg.complete && fieldImg.naturalWidth !== 0) {
        ctx.drawImage(fieldImg, -fSize/2, -fSize/2, fSize, fSize);
    } else {
        ctx.fillStyle = "#111"; ctx.fillRect(-fSize/2, -fSize/2, fSize, fSize);
        ctx.strokeStyle = "#333";
        const tSize = 24 * INCH_TO_PX;
        for(let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(i * tSize, -300); ctx.lineTo(i * tSize, 300); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-300, i * tSize); ctx.lineTo(300, i * tSize); ctx.stroke();
        }
    }

    // DRAW ROBOT
    ctx.save();
    ctx.translate(robot.x * INCH_TO_PX, robot.y * INCH_TO_PX);
    ctx.rotate(robot.angle);
    const rw = CONFIG.robotWidthInches * INCH_TO_PX;
    const rl = CONFIG.robotLengthInches * INCH_TO_PX;
    
    if (robotImg.complete && robotImg.naturalWidth !== 0) {
        ctx.drawImage(robotImg, -rw/2, -rl/2, rw, rl);
    } else {
        ctx.fillStyle = "red"; ctx.fillRect(-rw/2, -rl/2, rw, rl);
        ctx.fillStyle = "white"; ctx.fillRect(rw/3, -2, rw/6, 4);
    }
    ctx.restore();
    ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();