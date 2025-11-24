const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const eventText = document.getElementById("event");
const whistle = document.getElementById("whistle");

// Access webcam
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        console.error("Camera not available:", err);
    });

// Example overlay: goal area
const goalArea = { x: 200, y: 100, w: 200, h: 200 };

function drawOverlay() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;
    ctx.strokeRect(goalArea.x, goalArea.y, goalArea.w, goalArea.h);
    requestAnimationFrame(drawOverlay);
}

drawOverlay();

// Example score/event updates (simulate from Python backend later)
function goalScored() {
    eventText.textContent = "GOAL!!!";
    whistle.play();
    scoreText.textContent = "Player1: 1 | Player2: 0";
    setTimeout(() => eventText.textContent = "Waiting for ball...", 2000);
}