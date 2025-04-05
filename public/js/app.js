const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const photoPreview = document.getElementById("photoPreview");
const imageInfo = document.getElementById("imageInfo");

const BACKEND_URL = "/api";
let lastSearchTime = 0;
let currentMatch = { name: "", score: 0 };

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  startVideo();
}

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
  });
}

video.addEventListener("play", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const detect = async () => {
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (detection) {
      const { x, y, width, height } = detection.box;
      context.strokeStyle = "red";
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);

      if (currentMatch.name) {
        const label = `${currentMatch.name} (${currentMatch.score.toFixed(1)}%)`;
        context.fillStyle = "rgba(0,0,0,0.7)";
        context.fillRect(x, y - 24, context.measureText(label).width + 20, 20);
        context.fillStyle = "white";
        context.font = "16px Arial";
        context.fillText(label, x + 10, y - 10);
      }

      const now = Date.now();
      if (now - lastSearchTime > 3000) {
        lastSearchTime = now;
        await sendFrameToBackend();
      }
    } else {
      currentMatch = { name: "", score: 0 };
    }

    requestAnimationFrame(detect);
  };

  detect();
});

async function sendFrameToBackend() {
  const canvasFull = document.createElement("canvas");
  canvasFull.width = video.videoWidth;
  canvasFull.height = video.videoHeight;
  const ctx = canvasFull.getContext("2d");
  ctx.drawImage(video, 0, 0, canvasFull.width, canvasFull.height);

  canvasFull.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await fetch(`${BACKEND_URL}/search`, { method: "POST", body: formData });
      const data = await res.json();
      currentMatch = {
        name: data.name || "Unknown",
        score: data.score || 0.0,
      };
    } catch (err) {
      console.error("❌ Error al buscar:", err);
    }
  }, "image/jpeg", 0.95);
}

loadModels();

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("nameInput").value;

  const canvasSnap = document.createElement("canvas");
  canvasSnap.width = video.videoWidth;
  canvasSnap.height = video.videoHeight;
  const snapCtx = canvasSnap.getContext("2d");
  snapCtx.drawImage(video, 0, 0, canvasSnap.width, canvasSnap.height);

  photoPreview.hidden = false;
  photoPreview.src = canvasSnap.toDataURL("image/jpeg");
  imageInfo.textContent = `Resolución: ${canvasSnap.width}x${canvasSnap.height}`;

  canvasSnap.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", blob, "snapshot.jpg");

    const res = await fetch(`${BACKEND_URL}/register`, { method: "POST", body: formData });
    const data = await res.json();
    document.getElementById("registerStatus").textContent = data.message;
  }, "image/jpeg", 0.95);
});

// Registro desde archivo
document.getElementById("registerFileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = document.getElementById("fileRegisterInput").files[0];
  const name = document.getElementById("nameInputFile").value;
  const status = document.getElementById("registerFileStatus");

  if (!file) return (status.textContent = "⚠️ Debes seleccionar una imagen.");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/register`, { method: "POST", body: formData });
  const data = await res.json();
  status.textContent = data.message || "✅ Registro exitoso.";
});

// Búsqueda desde archivo
document.getElementById("uploadInput").addEventListener("change", async () => {
  const file = document.getElementById("uploadInput").files[0];
  const status = document.getElementById("uploadResult");

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  status.textContent = "🔍 Buscando...";

  const res = await fetch(`${BACKEND_URL}/search`, { method: "POST", body: formData });
  const data = await res.json();

  status.textContent = `✅ Resultado: ${data.name} (${data.score?.toFixed(1)}%)`;
});


