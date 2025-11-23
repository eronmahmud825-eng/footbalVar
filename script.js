const video = document.getElementById("camera");
const output = document.getElementById("output");
const whistle = document.getElementById("whistle");

// Start BACK CAMERA only
navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } },
    audio: false
})
.then(stream => {
    video.srcObject = stream;
})
.catch(err => {
    output.innerText = "Camera error: " + err;
});

// AI Models (uses browser vision API)
const detector = new ObjectDetector({
    model: "object_detector",
    maxResults: 5
});

async function analyseFrame() {
    if (!video.srcObject) return;

    const results = await detector.detect(video);

    let ball = null;
    let hand = null;
    let person = null;

    // read objects
    results.forEach(r => {
        if (r.label.toLowerCase().includes("ball") || r.label.includes("sports ball"))
            ball = r;
        if (r.label.includes("hand"))
            hand = r;
        if (r.label.includes("person"))
            person = r;
    });

    // ---- HANDBALL ----
    if (ball && hand) {
        const dx = Math.abs(ball.x - hand.x);
        const dy = Math.abs(ball.y - hand.y);

        if (dx < 80 && dy < 80) {
            whistle.play();
            output.innerText = "❌ HANDBALL!";
            return;
        }
    }

    // ---- GOAL ----
    if (ball) {
        // If ball reaches top 15% of screen
        if (ball.y < video.videoHeight * 0.15) {
            whistle.play();
            output.innerText = "✅ GOAL!";
            return;
        }
    }

    // ---- FOUL (Kick, shoulder, push) ----
    if (person && ball) {
        const tooClose = Math.abs(person.x - ball.x) < 50;
        const fastDown = ball.y > video.videoHeight * 0.70;

        if (tooClose && fastDown) {
            whistle.play();
            output.innerText = "❌ FOUL! (Kick / Push)";
            return;
        }
    }

    // Nothing detected
    output.innerText = "Watching...";
}

setInterval(analyseFrame, 200);
