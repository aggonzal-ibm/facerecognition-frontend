const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const result = document.getElementById("result");

const BACKEND_URL = "/api";
const MODEL_URL = "/models";

let lastSearchTime = 0;
const SEARCH_INTERVAL_MS = 3000;
let currentLabel = "";

async function loadModels() {
  result.textContent = "🔄 Cargando modelos...";
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  result.textContent = "✅ Modelos cargados. Iniciando cámara...";
  startVideo();
}

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => {
      result.textContent = "❌ No se pudo acceder a la cámara";
      console.error(err);
    });
}

video.addEventListener("play", () => {
  const detect = async () => {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      const { box } = detection.detection;
      context.strokeStyle = "red";
      context.lineWidth = 2;
      context.strokeRect(box.x, box.y, box.width, box.height);

      const now = Date.now();
      if (now - lastSearchTime > SEARCH_INTERVAL_MS) {
        lastSearchTime = now;
        const embedding = Array.from(detection.descriptor);
        result.textContent = "🔍 Buscando coincidencia...";

        try {
          const response = await fetch(`${BACKEND_URL}/search-vector`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embedding }),
          });
          const data = await response.json();
          currentLabel = `${data.name} (${data.score?.toFixed(2)}%)`;
          result.textContent = `✅ Coincidencia: ${currentLabel}`;
        } catch (err) {
          console.error(err);
          result.textContent = "❌ Error en la búsqueda";
          currentLabel = "Error";
        }
      }

      // Dibuja fondo para el texto
      if (currentLabel) {
        context.fillStyle = "rgba(0, 0, 0, 0.7)";
        context.fillRect(box.x, box.y - 24, context.measureText(currentLabel).width + 10, 20);
        context.fillStyle = "white";
        context.font = "16px Arial";
        context.fillText(currentLabel, box.x + 5, box.y - 10);
      }
    } else {
      result.textContent = "🕵️ No se detectó rostro";
      currentLabel = "";
    }

    requestAnimationFrame(detect);
  };

  detect();
});

loadModels();

// Manejador para formulario de registro
const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    registerStatus.textContent = "⏳ Registrando...";

    try {
      const res = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      registerStatus.textContent = data.registered
        ? "✅ Registrado correctamente"
        : "⚠️ No se detectó rostro en la imagen";
    } catch (err) {
      console.error(err);
      registerStatus.textContent = "❌ Error al registrar";
    }
  });
}
