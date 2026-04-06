const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// FTC SCALE CONSTANTS
// =====================
const FIELD_INCHES = 144;      // 12 feet
const ROBOT_INCHES = 18;       // 18 inches
const FIELD_PX = 600;          // The field is a 600x600 square
const INCH_TO_PX = FIELD_PX / FIELD_INCHES; // Exactly 4.1666...

// STARTING POSITION (In Inches, 0,0 is Center)
// To start in a corner, you could use -60, 60
let startX = 0; 
let startY = 0; 
let startAngle = -90; // Facing "Up"

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
// LOGIC
// =====================
function togglePause() {
    paused = !paused;
    document.getElementById("pauseBtn").innerText = paused ? "Resume" : "Pause";
}

function runCode() {
    // Reset robot to start on every "Run"
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
// ENGINE (Inches based)
// =====================
function update() {
    if (paused) return;

    if (!currentCommand && commandQueue.length > 0) {
        currentCommand = commandQueue.shift();
        currentCommand.progress = 0; // Reset progress for new command
    }

    if (!currentCommand) return;
    const cmd = currentCommand;
    
    if (cmd.type === "forward") {
        let targetInches = cmd.args[0] || 0;
        let speedInchesPerFrame = 0.5; // Roughly 30 inches per second at 60fps

        // Move the robot
        robot.x += Math.cos(robot.angle) * speedInchesPerFrame;
        robot.y += Math.sin(robot.angle) * speedInchesPerFrame;
        
        // Track progress in inches
        cmd.progress += speedInchesPerFrame;

        if (cmd.progress >= targetInches) {
            currentCommand = null;
        }
    }

    if (cmd.type === "turn") {
        let degrees = cmd.args[0] || 0;
        let targetRad = Math.abs(degrees * (Math.PI / 180));
        let turnSpeedRad = 0.03; 

        let direction = degrees > 0 ? 1 : -1;
        robot.angle += turnSpeedRad * direction;
        cmd.progress += turnSpeedRad;

        if (cmd.progress >= targetRad) {
            currentCommand = null;
        }
    }
}

// =====================
// RENDERER
// =====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Center the origin (0,0) on the canvas
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // 2. Draw Field Background (144" x 144" represented by 600px x 600px)
    if (fieldImg.complete && fieldImg.naturalWidth !== 0) {
        ctx.drawImage(fieldImg, -FIELD_PX/2, -FIELD_PX/2, FIELD_PX, FIELD_PX);
    } else {
        // Gray square if image fails
        ctx.fillStyle = "#333";
        ctx.fillRect(-FIELD_PX/2, -FIELD_PX/2, FIELD_PX, FIELD_PX);
        
        // Draw TILE GRID (6 tiles across, 24" each)
        ctx.strokeStyle = "#555";
        for(let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 100, -300); ctx.lineTo(i * 100, 300);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-300, i * 100); ctx.lineTo(300, i * 100);
            ctx.stroke();
        }
    }

    // 3. Draw Robot (18" scaled to Pixels)
    ctx.save();
    // Move to robot's inch position converted to pixels
    ctx.translate(robot.x * INCH_TO_PX, robot.y * INCH_TO_PX);
    ctx.rotate(robot.angle);

    // The robot size in pixels is 18 * (600/144) = 75 pixels.
    const rSize = ROBOT_INCHES * INCH_TO_PX; 

    if (robotImg.complete && robotImg.naturalWidth !== 0) {
        ctx.drawImage(robotImg, -rSize/2, -rSize/2, rSize, rSize);
    } else {
        ctx.fillStyle = "red";
        ctx.fillRect(-rSize/2, -rSize/2, rSize, rSize);
        // Front indicator
        ctx.fillStyle = "white";
        ctx.fillRect(rSize/3, -2, rSize/6, 4);
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