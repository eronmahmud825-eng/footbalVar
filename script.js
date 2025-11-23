// ----------------------------
// WHISTLE SOUNDS (Base64 audio)
// ----------------------------

// Short whistle
const whistleShort = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA…"
);

// Long whistle
const whistleLong = new Audio(
  "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA…"
);

function playWhistleShort() {
  whistleShort.currentTime = 0;
  whistleShort.play();
}

function playWhistleLong() {
  whistleLong.currentTime = 0;
  whistleLong.play();
}

// ----------------------------
// MAIN VAR SYSTEM
// ----------------------------

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const replay = document.getElementById("replay");
const ctx = canvas.getContext("2d");
const eventText = document.getElementById("event");

let detector, handDetector;
let replayFrames = [];

// TEXT-TO-SPEECH
function say(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.speak(u);
}

// ----------------------------
// SELFIE CAMERA ONLY (NO SWITCH)
// ----------------------------
// CAMERA SETUP (Back camera only)
// CAMERA SETUP
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise((resolve) => (video.onloadedmetadata = () => resolve(video)));
}
    // Try back camera
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // If back camera fails → try any camera (fallback)
    console.warn("Back camera not available, using default camera.");
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  }

  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

    // Try with explicit back camera
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    // If some phones don’t support "exact", fallback to "environment"
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
  }

  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}


// ----------------------------
// LOAD AI MODELS
// ----------------------------
async function loadModels() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "Lightning" }
  );

  handDetector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands
  );
}

// ----------------------------
// IMPROVED BALL DETECTOR
// Works with ANY color
// ----------------------------
function detectBall(img) {
  const w = canvas.width;
  const h = canvas.height;
  const d = img.data;

  let count = 0, x = 0, y = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // detect ROUND bright areas (ball)
    if (r + g + b > 450) {  
      const p = i / 4;
      x += p % w;
      y += Math.floor(p / w);
      count++;
    }
  }

  if (count < 40) return null;
  return { x: x / count, y: y / count };
}

// ----------------------------
// VAR REPLAY (SMOOTHER)
// ----------------------------
async function playSlowMotion() {
  replay.style.display = "block";

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const ctx2 = tempCanvas.getContext("2d");

  let chunks = [];
  const stream = tempCanvas.captureStream(20);
  const rec = new MediaRecorder(stream, { mimeType: "video/webm" });

  rec.ondataavailable = e => chunks.push(e.data);

  rec.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    replay.src = URL.createObjectURL(blob);
    replay.playbackRate = 0.35;
    replay.play();
  };

  rec.start();

  for (let f of replayFrames) {
    const img = new Image();
    img.src = f;
    await img.decode();

    ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
    await new Promise(r => setTimeout(r, 40));
  }

  rec.stop();
}

// ----------------------------
// MAIN LOOP
// ----------------------------
async function run() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);
  const hands = await handDetector.estimateHands(video);
  const ball = detectBall(ctx.getImageData(0, 0, canvas.width, canvas.height));

  replayFrames.push(canvas.toDataURL("image/webp"));
  if (replayFrames.length > 70) replayFrames.shift();

  // --------------- GOAL ---------------
  if (ball && ball.y < canvas.height * 0.12) {
    eventText.textContent = "GOAL!";
    say("Goal!");
    playWhistleLong();
    playSlowMotion();
  }

  // ------------- HAND BALL -------------
  if (hands.length > 0 && ball) {
    for (let h of hands) {
      const hx = h.keypoints[0].x;
      const hy = h.keypoints[0].y;

      if (Math.hypot(hx - ball.x, hy - ball.y) < 80) {
        eventText.textContent = "HAND BALL!";
        say("Handball!");
        playWhistleShort();
        playSlowMotion();
      }
    }
  }

  // --------------- FOUL ---------------
  if (poses.length >= 2) {
    const p1 = poses[0].keypoints[0];
    const p2 = poses[1].keypoints[0];

    if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 95) {
      eventText.textContent = "FOUL!";
      say("Foul!");
      playWhistleShort();
      playSlowMotion();
    }
  }

  requestAnimationFrame(run);
}

// ----------------------------
// START
// ----------------------------
async function main() {
  await setupCamera();
  await loadModels();
  run();
}

main();




