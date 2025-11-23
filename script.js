// ----------------------------
// WHISTLE SOUNDS (Base64 audio, works offline)
// ----------------------------

// Short whistle (foul/handball)
const whistleShort = new Audio(
    "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA…(shortened for clarity)…"
);

// Long whistle (goal)
const whistleLong = new Audio(
    "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA…(shortened)…"
);

function playWhistleShort() {
    whistleShort.currentTime = 0;
    whistleShort.play();
}

function playWhistleLong() {
    whistleLong.currentTime = 0;
    whistleLong.play();
}


// --------------------------------------
// (REST OF YOUR SCRIPT — ADD WHISTLE HERE)
// --------------------------------------

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const replay = document.getElementById("replay");
const ctx = canvas.getContext("2d");
const eventText = document.getElementById("event");

let detector, handDetector;

// Replay buffer (last 3 sec)
let replayFrames = [];

// SPEAK EVENT
function say(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.speak(u);
}

// CAMERA SETUP
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => (video.onloadedmetadata = () => resolve(video)));
}

// LOAD MODELS
async function loadModels() {
    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet, { modelType: "Lightning" }
    );

    handDetector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands
    );
}

// SIMPLE BALL DETECTION
function detectBall(imageData) {
    let count = 0;
    let posX = 0,
        posY = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        if (r > 200 && g > 200 && b > 200) {
            const p = i / 4;
            posX += p % canvas.width;
            posY += Math.floor(p / canvas.width);
            count++;
        }
    }

    if (count < 30) return null;

    return { x: posX / count, y: posY / count };
}

// VAR SLOW MOTION REPLAY
async function playSlowMotion() {
    replay.style.display = "block";

    const canvas2 = document.createElement("canvas");
    canvas2.width = canvas.width;
    canvas2.height = canvas.height;

    const ctx2 = canvas2.getContext("2d");

    let chunks = [];
    const stream = canvas2.captureStream(20);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });

    rec.ondataavailable = (e) => chunks.push(e.data);

    rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        replay.src = URL.createObjectURL(blob);
        replay.playbackRate = 0.3;
        replay.play();
    };

    rec.start();

    for (let frame of replayFrames) {
        const img = new Image();
        img.src = frame;
        await new Promise((r) => (img.onload = r));
        ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
        await new Promise((r) => setTimeout(r, 50));
    }

    rec.stop();
}

// MAIN LOOP
async function run() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const poses = await detector.estimatePoses(video);
    const hands = await handDetector.estimateHands(video);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const ball = detectBall(
        ctx.getImageData(0, 0, canvas.width, canvas.height)
    );

    replayFrames.push(canvas.toDataURL("image/webp"));
    if (replayFrames.length > 60) replayFrames.shift();

    // ----------- GOAL DETECTION -----------
    if (ball && ball.y < canvas.height * 0.1) {
        eventText.textContent = "GOAL!";
        say("Goal!");
        playWhistleLong(); // 🔊 long whistle
        playSlowMotion();
    }

    // ----------- HAND BALL DETECTION -----------
    if (hands.length > 0 && ball) {
        for (let h of hands) {
            const hx = h.keypoints[0].x;
            const hy = h.keypoints[0].y;

            if (Math.hypot(hx - ball.x, hy - ball.y) < 70) {
                eventText.textContent = "HAND BALL!";
                say("Hand Ball!");
                playWhistleShort(); // 🔊 short whistle
                playSlowMotion();
            }
        }
    }

    // ----------- FOUL DETECTION -----------
    if (poses.length >= 2) {
        const p1 = poses[0].keypoints[0];
        const p2 = poses[1].keypoints[0];

        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 90) {
            eventText.textContent = "FOUL!";
            say("Foul!");
            playWhistleShort(); // 🔊 short whistle
            playSlowMotion();
        }
    }

    requestAnimationFrame(run);
}

// START
async function main() {
    await setupCamera();
    await loadModels();
    run();
}

main();