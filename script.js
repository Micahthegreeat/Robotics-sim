// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const CONFIG = {
    // 1. ASSET LINKS
    fieldImageSrc: "image.png",
    robotImageSrc: "image copy.png",
    
    // 2. LANGUAGE SETTINGS
    defaultLanguage: "java",    // "java" or "python"
    
    // 3. PHYSICAL DIMENSIONS (Inches)
    fieldSizeInches: 144,
    robotWidthInches: 18,
    robotLengthInches: 18,
    
    // 4. STARTING POSITION (In Inches, 0,0 is Center)
    startX: 0, 
    startY: 0, 
    startAngleDeg: -90,
    
    // 5. VISUALS (Pixels)
    canvasFieldSizePx: 600,
    
    // 6. PERFORMANCE (Speed)
    driveSpeedInchesPerFrame: 0.5,
    turnSpeedDegPerFrame: 2.0,
    
    // 7. RANDOMIZATION
    qrMin: 1,
    qrMax: 4
};

// ==========================================
// 🛠️ SYSTEM SETUP
// ==========================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const codeArea = document.getElementById("code");
const langDisplay = document.getElementById("lang");
const CACHE_KEY = "ftc_sim_code_cache";

// Initial state set from CONFIG
let currentLanguage = CONFIG.defaultLanguage;

function setLanguage(lang) {
    currentLanguage = lang;
    if (langDisplay) langDisplay.innerText = lang;
    console.log("Mode switched to:", lang);
}

// 💾 CACHING
function saveCode() { localStorage.setItem(CACHE_KEY, codeArea.value); }
function loadCode() { 
    const savedCode = localStorage.getItem(CACHE_KEY);
    if (savedCode) codeArea.value = savedCode; 
}
codeArea.addEventListener("input", saveCode);
loadCode();

// Load images
const robotImg = new Image(); robotImg.src = CONFIG.robotImageSrc;
const fieldImg = new Image(); fieldImg.src = CONFIG.fieldImageSrc;

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
// 🔍 MULTI-LANGUAGE PARSER
// =====================

function getQRCodeID() {
    const id = Math.floor(Math.random() * (CONFIG.qrMax - CONFIG.qrMin + 1)) + CONFIG.qrMin;
    console.log(`[${currentLanguage.toUpperCase()}] QR ID Scanned:`, id);
    return id;
}

function runCode() {
    // Reset Robot to CONFIG defaults
    robot.x = CONFIG.startX;
    robot.y = CONFIG.startY;
    robot.angle = CONFIG.startAngleDeg * (Math.PI / 180);
    
    const lines = codeArea.value.split("\n");
    
    // Route to appropriate parser based on current mode
    if (currentLanguage === "java") {
        commandQueue = parseJava(lines);
    } else {
        commandQueue = parsePython(lines);
    }
    currentCommand = null;
}

// --- JAVA PARSER (Supports for-loops with {}) ---
function parseJava(lines) {
    let commands = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        const loopMatch = line.match(/for\s*\(.*<\s*(\d+);.*\)/);
        if (loopMatch) {
            const count = parseInt(loopMatch[1]);
            let body = [];
            i++; 
            while (i < lines.length && !lines[i].includes("}")) {
                body.push(lines[i].trim());
                i++;
            }
            for (let j = 0; j < count; j++) {
                body.forEach(l => { let a = parseAction(l); if(a) commands.push(a); });
            }
        } else {
            let a = parseAction(line); if(a) commands.push(a);
        }
    }
    return commands;
}

// --- PYTHON PARSER (Supports range() and Indentation) ---
function parsePython(lines) {
    let commands = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        const loopMatch = lines[i].match(/for\s+\w+\s+in\s+range\((\d+)\)\s*:/);
        if (loopMatch) {
            const count = parseInt(loopMatch[1]);
            let body = [];
            i++;
            // Collect indented lines
            while (i < lines.length && (lines[i].startsWith("  ") || lines[i].startsWith("\t") || lines[i].trim() === "")) {
                if (lines[i].trim() !== "") body.push(lines[i].trim());
                i++;
            }
            i--; 
            for (let j = 0; j < count; j++) {
                body.forEach(l => { let a = parseAction(l); if(a) commands.push(a); });
            }
        } else {
            let a = parseAction(line); if(a) commands.push(a);
        }
    }
    return commands;
}

function parseAction(line) {
    if (line.includes("qrCode.getID()")) {
        getQRCodeID();
        return null; 
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
// 🏎️ ENGINE & RENDER
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
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    const fSize = CONFIG.canvasFieldSizePx;
    if (fieldImg.complete && fieldImg.naturalWidth !== 0) {
        ctx.drawImage(fieldImg, -fSize/2, -fSize/2, fSize, fSize);
    } else {
        ctx.fillStyle = "#111"; ctx.fillRect(-fSize/2, -fSize/2, fSize, fSize);
        ctx.strokeStyle = "#222";
        const tSize = 24 * INCH_TO_PX;
        for(let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(i * tSize, -300); ctx.lineTo(i * tSize, 300); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-300, i * tSize); ctx.lineTo(300, i * tSize); ctx.stroke();
        }
    }

    ctx.save();
    ctx.translate(robot.x * INCH_TO_PX, robot.y * INCH_TO_PX);
    ctx.rotate(robot.angle);
    const rw = CONFIG.robotWidthInches * INCH_TO_PX;
    const rl = CONFIG.robotLengthInches * INCH_TO_PX;
    if (robotImg.complete && robotImg.naturalWidth !== 0) {
        ctx.drawImage(robotImg, -rw/2, -rl/2, rw, rl);
    } else {
        ctx.fillStyle = "red"; ctx.fillRect(-rw/2, -rl/2, rw, rl);
    }
    ctx.restore();
    ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

// Initialize display and start loop
setLanguage(CONFIG.defaultLanguage);
loop();