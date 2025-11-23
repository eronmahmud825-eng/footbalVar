let video = document.getElementById("camera");
let canvas = document.getElementById("output");
let ctx = canvas.getContext("2d");

let goalLineX = 50; // Adjust goal line
let p1 = 0, p2 = 0;
let detecting = false;

let whistle = new Audio("whistle.mp3");

let poseModel, handModel, ballModel;

// Load all AI models
async function loadModels() {
    poseModel = await posenet.load();
    handModel = await handpose.load();
    ballModel = await cocoSsd.load();
    console.log("Models Loaded ✔");
}

async function startCamera() {
    let stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    };
}

async function detectFrame() {
    if (!detecting) return;

    ctx.drawImage(video, 0, 0);

    let poses = await poseModel.estimateSinglePose(video);
    let hands = await handModel.estimateHands(video);
    let objects = await ballModel.detect(video);

    let ball = objects.find(o => o.class === "sports ball");

    // DRAW BALL
    if (ball) {
        ctx.beginPath();
        ctx.rect(ball.bbox[0], ball.bbox[1], ball.bbox[2], ball.bbox[3]);
        ctx.strokeStyle = "yellow";
        ctx.stroke();
    }

    // --------------------------------------------------
    // ✔ HAND BALL DETECTION
    // --------------------------------------------------
    if (hands.length > 0 && ball) {
        let hx = hands[0].boundingBox.topLeft[0];
        let hy = hands[0].boundingBox.topLeft[1];

        let bx = ball.bbox[0];
        let by = ball.bbox[1];

        let dx = Math.abs(hx - bx);
        let dy = Math.abs(hy - by);

        if (dx < 60 && dy < 60) {
            whistle.play();
            decision("HANDBALL ❌");
        }
    }

    // --------------------------------------------------
    // ✔ FOUL DETECTION (leg contact)
    // --------------------------------------------------
    let legs = poses.keypoints.filter(p => p.part === "leftKnee" || p.part === "rightKnee");

    if (legs.length >= 2) {
        let dx = Math.abs(legs[0].position.x - legs[1].position.x);
        let dy = Math.abs(legs[0].position.y - legs[1].position.y);

        if (dx < 40 && dy < 40) {
            whistle.play();
            decision("FOUL ❌");
        }
    }

    // --------------------------------------------------
    // ✔ GOAL DETECTION (ball crosses line)
    // --------------------------------------------------
    if (ball) {
        let bx = ball.bbox[0];

        if (bx < goalLineX) {
            p2++;
            document.getElementById("p2").innerText = p2;
            decision("GOAL ✔");
        }
    }

    requestAnimationFrame(detectFrame);
}

function decision(text) {
    document.getElementById("decision").innerText = text;
}

document.getElementById("start").onclick = () => {
    detecting = true;
    detectFrame();
};

document.getElementById("stop").onclick = () => {
    detecting = false;
};

loadModels();
startCamera();






