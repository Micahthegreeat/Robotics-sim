const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// FTC REGULATION SETTINGS
// =====================
const FIELD_INCHES = 144;      // 12 feet
const ROBOT_INCHES = 18;       // 18 inches
const PIXELS_PER_TILE = 100;   // Each 2ft tile = 100px
const FIELD_PX = 600;          // Total field visual size (6 tiles * 100px)

// STARTING POSITION (0,0 is the center of the field)
// FTC Tiles are 24". To start in a tile center, use multiples of 24.
let startX = 0; 
let startY = 0; 
let startAngle = -90; // Facing "Up" towards the top of the screen

// Conversion Factor: 600px / 144in = ~4.16 pixels per inch
const INCH_TO_PX = FIELD_PX / FIELD_INCHES;

// =====================
// ROBOT STATE
// =====================
let robot = {
    x: startX,
    y: startY,
    angle: startAngle * (Math.PI / 180)
};

let paused = false;
let commandQueue = [];
let currentCommand = null;

// =====================
// ASSETS
// =====================
const robotImg = new Image();
robotImg.src = "image copy.png";

const fieldImg = new Image();
fieldImg.src = "image.png";

// =====================
// CORE FUNCTIONS
// =====================
function togglePause() {
    paused = !paused;
    document.getElementById("pauseBtn").innerText = paused ? "Resume" : "Pause";
}

function runCode() {
    // Reset to starting constants
    robot.x = startX;
    robot.y = startY;
    robot.angle = startAngle * (Math.PI / 180);
    
    commandQueue = parseCode(document.getElementById("code").value);
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
// ENGINE
// =====================
function update() {
    if (paused || !commandQueue.length && !currentCommand) return;

    if (!currentCommand) {
        currentCommand = commandQueue.shift();
    }

    const cmd = currentCommand;
    
    if (cmd.type === "forward") {
        let targetInches = cmd.args[0] || 0;
        let speed = cmd.args[1] || 1; // Inches per frame

        robot.x += Math.cos(robot.angle) * speed;
        robot.y += Math.sin(robot.angle) * speed;
        cmd.progress += speed;

        if (cmd.progress >= targetInches) currentCommand = null;
    }

    if (cmd.type === "turn") {
        let degrees = cmd.args[0] || 0;
        let targetRad = Math.abs(degrees * (Math.PI / 180));
        let turnSpeed = 0.03; 

        let direction = degrees > 0 ? 1 : -1;
        robot.angle += turnSpeed * direction;
        cmd.progress += turnSpeed;

        if (cmd.progress >= targetRad) currentCommand = null;
    }
}

// =====================
// RENDERER
// =====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center the origin (0,0) in the middle of the canvas
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // DRAW FIELD (144" represented by 600px)
    if (fieldImg.complete && fieldImg.naturalWidth !== 0) {
        ctx.drawImage(fieldImg, -FIELD_PX/2, -FIELD_PX/2, FIELD_PX, FIELD_PX);
    } else {
        // Fallback: Draw FTC Tile Grid (6x6 tiles)
        ctx.strokeStyle = "#444";
        for(let i = -3; i <= 3; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(i * 100, -300); ctx.lineTo(i * 100, 300);
            ctx.stroke();
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(-300, i * 100); ctx.lineTo(300, i * 100);
            ctx.stroke();
        }
    }

    // DRAW ROBOT (Scaled to 18")
    ctx.save();
    // Convert inch coordinates to pixels
    ctx.translate(robot.x * INCH_TO_PX, robot.y * INCH_TO_PX);
    ctx.rotate(robot.angle);

    const robotSizePx = ROBOT_INCHES * INCH_TO_PX; // Should be exactly 75px

    if (robotImg.complete && robotImg.naturalWidth !== 0) {
        ctx.drawImage(robotImg, -robotSizePx/2, -robotSizePx/2, robotSizePx, robotSizePx);
    } else {
        // Fallback: Red Robot with Front Heading
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        ctx.fillRect(-robotSizePx/2, -robotSizePx/2, robotSizePx, robotSizePx);
        ctx.fillStyle = "white";
        ctx.fillRect(robotSizePx/4, -2, robotSizePx/4, 4); // Front nose
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