// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const CONFIG = {
    fieldSizeInches: 144,
    robotWidthInches: 18,
    robotLengthInches: 18,
    startX: 0, 
    startY: 0, 
    startAngleDeg: -90,
    canvasFieldSizePx: 600,
    driveSpeedInchesPerFrame: 0.5,
    turnSpeedDegPerFrame: 2.0
};

// ==========================================
// 🛠️ INTERNAL STATE & PERSISTENCE
// ==========================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const codeArea = document.getElementById("code");

// 💾 CACHING LOGIC
const CACHE_KEY = "ftc_sim_code_cache";

function saveCode() {
    localStorage.setItem(CACHE_KEY, codeArea.value);
}

function loadCode() {
    const savedCode = localStorage.getItem(CACHE_KEY);
    if (savedCode) {
        codeArea.value = savedCode;
    }
}

// Attach the listener so it saves automatically while you type
codeArea.addEventListener("input", saveCode);

// Load the code immediately on script start
loadCode();

// ==========================================
// ⚙️ COORDINATE & ROBOT SETUP
// ==========================================
const INCH_TO_PX = CONFIG.canvasFieldSizePx / CONFIG.fieldSizeInches;

let robot = {
    x: CONFIG.startX,
    y: CONFIG.startY,
    angle: CONFIG.startAngleDeg * (Math.PI / 180)
};

let paused = false;
let commandQueue = [];
let currentCommand = null;

const robotImg = new Image();
robotImg.src = "image copy.png";
const fieldImg = new Image();
fieldImg.src = "image.png";

// =====================
// 🕹️ LOGIC & PARSING
// =====================

function togglePause() {
    paused = !paused;
    document.getElementById("pauseBtn").innerText = paused ? "Resume" : "Pause";
}

function runCode() {
    // Reset robot to the CONFIG values
    robot.x = CONFIG.startX;
    robot.y = CONFIG.startY;
    robot.angle = CONFIG.startAngleDeg * (Math.PI / 180);
    
    commandQueue = parseCode(codeArea.value);
    currentCommand = null;
}

function parseCode(code) {
    return code.split("\n")
        .map((line, index) => {
            const match = line.trim().match(/^(\w+)\((.*)\)/);
            if (!match) return null;
            return {
                type: match[1].toLowerCase(),
                args: match[2].split(",").map(a => parseFloat(a.trim())),
                progress: 0,
                lineIndex: index
            };
        })
        .filter(cmd => cmd !== null);
}

// =====================
// 🏎️ EXECUTION ENGINE
// =====================

function update() {
    if (paused || (!currentCommand && commandQueue.length === 0)) return;

    if (!currentCommand) {
        currentCommand = commandQueue.shift();
        currentCommand.progress = 0; 
    }

    const cmd = currentCommand;
    
    if (cmd.type === "forward") {
        let targetInches = cmd.args[0] || 0;
        let speed = cmd.args[1] || CONFIG.driveSpeedInchesPerFrame;

        robot.x += Math.cos(robot.angle) * speed;
        robot.y += Math.sin(robot.angle) * speed;
        cmd.progress += speed;

        if (cmd.progress >= targetInches) currentCommand = null;
    }

    if (cmd.type === "turn") {
        let targetDegrees = cmd.args[0] || 0;
        let targetRad = Math.abs(targetDegrees * (Math.PI / 180));
        let speedRad = (cmd.args[1] || CONFIG.turnSpeedDegPerFrame) * (Math.PI / 180);

        let direction = targetDegrees > 0 ? 1 : -1;
        robot.angle += speedRad * direction;
        cmd.progress += speedRad;

        if (cmd.progress >= targetRad) currentCommand = null;
    }
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
        ctx.fillStyle = "#333";
        ctx.fillRect(-fSize/2, -fSize/2, fSize, fSize);
        ctx.strokeStyle = "#555";
        const tileSizePx = 24 * INCH_TO_PX;
        for(let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tileSizePx, -fSize/2); ctx.lineTo(i * tileSizePx, fSize/2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-fSize/2, i * tileSizePx); ctx.lineTo(fSize/2, i * tileSizePx);
            ctx.stroke();
        }
    }

    // DRAW ROBOT
    ctx.save();
    ctx.translate(robot.x * INCH_TO_PX, robot.y * INCH_TO_PX);
    ctx.rotate(robot.angle);

    const rWidth = CONFIG.robotWidthInches * INCH_TO_PX;
    const rLength = CONFIG.robotLengthInches * INCH_TO_PX;

    if (robotImg.complete && robotImg.naturalWidth !== 0) {
        ctx.drawImage(robotImg, -rWidth/2, -rLength/2, rWidth, rLength);
    } else {
        ctx.fillStyle = "red";
        ctx.fillRect(-rWidth/2, -rLength/2, rWidth, rLength);
        ctx.fillStyle = "white";
        ctx.fillRect(rWidth/3, -2, rWidth/6, 4);
    }

    ctx.restore();
    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();