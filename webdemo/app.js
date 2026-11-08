/**
 * MakHamTTS Web Demo Application Controller
 * Supports WASM (CPU) and WebGPU (GPU) execution providers.
 */

import { ParadeeTTS, checkWebGPUSupport } from "./tts.js";

const tts = new ParadeeTTS();

// DOM Elements
const statusBox = document.getElementById("statusBox");
const statusIcon = document.getElementById("statusIcon");
const statusText = document.getElementById("statusText");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const clearBtn = document.getElementById("clearBtn");
const presetChips = document.querySelectorAll(".preset-chip");

const speedSlider = document.getElementById("speedSlider");
const speedVal = document.getElementById("speedVal");

const btnBackendWasm = document.getElementById("btnBackendWasm");
const btnBackendWebgpu = document.getElementById("btnBackendWebgpu");
const backendBadge = document.getElementById("backendBadge");
const webgpuNotice = document.getElementById("webgpuNotice");

const synthesizeBtn = document.getElementById("synthesizeBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

const outputCard = document.getElementById("outputCard");
const audioPlayer = document.getElementById("audioPlayer");
const downloadBtn = document.getElementById("downloadBtn");
const playOutputBtn = document.getElementById("playOutputBtn");

const metricBackend = document.getElementById("metricBackend");
const metricLatency = document.getElementById("metricLatency");
const metricDuration = document.getElementById("metricDuration");
const metricSpeedup = document.getElementById("metricSpeedup");

const phonemesBox = document.getElementById("phonemesBox");
const waveformCanvas = document.getElementById("waveformCanvas");

let currentAudioUrl = null;

// Initialize Web Demo
async function init() {
  updateStatus("loading", "กำลังโหลดโมเดลและพจนานุกรมภาษาไทย (Loading INT8 model & 62k dictionary)...");
  synthesizeBtn.disabled = true;

  // Check WebGPU hardware and browser support
  const gpuSupport = await checkWebGPUSupport();
  if (!gpuSupport.supported) {
    if (btnBackendWebgpu) {
      btnBackendWebgpu.disabled = true;
      btnBackendWebgpu.title = gpuSupport.reason;
    }
    if (webgpuNotice) {
      webgpuNotice.style.display = "block";
      webgpuNotice.textContent = `ℹ️ เครื่องหรือเบราว์เซอร์นี้ยังไม่รองรับ WebGPU (${gpuSupport.reason}) จะใช้ WASM (CPU) อัตโนมัติ`;
    }
  } else {
    if (webgpuNotice) {
      webgpuNotice.style.display = "none";
    }
  }

  try {
    await tts.init({
      modelPath: "paradee_thai_int8.onnx",
      configPath: "config.json",
      dictPath: "dict.json",
      backend: "wasm",
      onProgress: (p) => {
        if (p.status === "loading_config") {
          updateStatus("loading", "กำลังโหลดพจนานุกรม 62,112 คำ... (Loading dictionary...)");
        } else if (p.status === "loading_model") {
          updateStatus("loading", p.message || "กำลังคอมไพล์ ONNX Runtime WebAssembly...");
        }
      }
    });

    updateStatus("ready", "พร้อมใช้งาน! รันบนเบราว์เซอร์ 100% ด้วย ONNX Runtime Web (WASM CPU)");
    synthesizeBtn.disabled = false;
  } catch (err) {
    console.error("Initialization failed:", err);
    updateStatus("error", `เกิดข้อผิดพลาดในการโหลดโมเดล: ${err.message}`);
  }
}

function updateStatus(state, message) {
  statusBox.className = `status-box ${state}`;
  statusText.textContent = message;

  if (state === "loading") {
    statusIcon.innerHTML = `<div class="spinner"></div>`;
  } else if (state === "ready") {
    statusIcon.innerHTML = `<div class="dot"></div>`;
  } else if (state === "error") {
    statusIcon.innerHTML = `<span style="color:#ef4444;font-size:1.2rem;">⚠️</span>`;
  }
}

// Backend Switcher (WASM vs WebGPU)
async function switchBackend(newBackend) {
  if (tts.currentBackend === newBackend && tts.isReady) return;

  btnBackendWasm.classList.toggle("active", newBackend === "wasm");
  btnBackendWebgpu.classList.toggle("active", newBackend === "webgpu");
  backendBadge.textContent = newBackend === "webgpu" ? "GPU (WebGPU)" : "CPU (WASM)";

  synthesizeBtn.disabled = true;
  const backendLabel = newBackend === "webgpu" ? "WebGPU (GPU)" : "WASM (CPU)";
  updateStatus("loading", `กำลังสลับการประมวลผลเป็น ${backendLabel}...`);

  try {
    await tts.loadModel(newBackend, (p) => {
      updateStatus(p.status, p.message);
    });
    updateStatus("ready", `พร้อมใช้งาน! โมเดลทำงานบน ${backendLabel}`);
    synthesizeBtn.disabled = false;
  } catch (err) {
    console.error(`Failed to switch to ${newBackend}:`, err);
    updateStatus("error", `สลับไป ${backendLabel} ไม่สำเร็จ: ${err.message}`);
    // Revert active button
    btnBackendWasm.classList.toggle("active", tts.currentBackend === "wasm");
    btnBackendWebgpu.classList.toggle("active", tts.currentBackend === "webgpu");
    backendBadge.textContent = tts.currentBackend === "webgpu" ? "GPU (WebGPU)" : "CPU (WASM)";
    synthesizeBtn.disabled = !tts.isReady;
  }
}

if (btnBackendWasm) {
  btnBackendWasm.addEventListener("click", () => switchBackend("wasm"));
}
if (btnBackendWebgpu) {
  btnBackendWebgpu.addEventListener("click", () => switchBackend("webgpu"));
}

// Preset chips handler
presetChips.forEach(chip => {
  chip.addEventListener("click", () => {
    const text = chip.getAttribute("data-text");
    if (text) {
      textInput.value = text;
      updateCharCount();
      textInput.focus();
    }
  });
});

// Character counter & clear button
function updateCharCount() {
  const len = textInput.value.length;
  charCount.textContent = `${len} ตัวอักษร`;
  clearBtn.style.display = len > 0 ? "inline" : "none";
}

textInput.addEventListener("input", updateCharCount);
clearBtn.addEventListener("click", () => {
  textInput.value = "";
  updateCharCount();
  textInput.focus();
});

// Speed slider
speedSlider.addEventListener("input", () => {
  const spd = parseFloat(speedSlider.value);
  speedVal.textContent = `${spd.toFixed(1)}x`;
});

// Waveform visualizer
function drawWaveform(audioData) {
  if (!waveformCanvas || !audioData || audioData.length === 0) return;
  const ctx = waveformCanvas.getContext("2d");
  const width = waveformCanvas.width = waveformCanvas.parentElement.clientWidth || 700;
  const height = waveformCanvas.height = 60;

  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath();

  const step = Math.ceil(audioData.length / width);
  const midY = height / 2;

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = audioData[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    const y1 = midY + (min * midY * 0.95);
    const y2 = midY + (max * midY * 0.95);

    ctx.moveTo(i, y1);
    ctx.lineTo(i, y2);
  }
  ctx.stroke();
}

// Synthesize Action
async function synthesize() {
  const text = textInput.value.trim();
  if (!text) {
    textInput.focus();
    return;
  }

  synthesizeBtn.disabled = true;
  btnText.textContent = "กำลังสังเคราะห์เสียง...";
  btnSpinner.style.display = "inline-block";

  try {
    const speed = parseFloat(speedSlider.value) || 1.0;
    const result = await tts.synthesize(text, { speed });

    // Revoke previous URL to prevent memory leaks
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }

    currentAudioUrl = URL.createObjectURL(result.blob);
    audioPlayer.src = currentAudioUrl;

    // Setup download button
    downloadBtn.href = currentAudioUrl;
    downloadBtn.download = `paradee_thai_${Date.now()}.wav`;

    // Metrics
    if (metricBackend) {
      metricBackend.textContent = result.backend === "webgpu" ? "🚀 WebGPU (GPU)" : "⚡ WASM (CPU)";
    }
    metricLatency.textContent = `${result.elapsedMs.toFixed(0)} ms`;
    metricDuration.textContent = `${result.durationSec.toFixed(2)} วินาที`;
    const speedup = (result.durationSec / (result.elapsedMs / 1000)).toFixed(1);
    metricSpeedup.textContent = `${speedup}x เร็วกว่าเรียลไทม์`;

    // Phonemes
    phonemesBox.textContent = result.phonemes;

    // Draw visual waveform
    drawWaveform(result.audio);

    // Show output card
    outputCard.style.display = "flex";
    outputCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Play automatically or ready
    try {
      await audioPlayer.play();
    } catch {
      // Autoplay might be blocked by browser policy until interaction
    }

  } catch (err) {
    console.error("Synthesis error:", err);
    alert(`เกิดข้อผิดพลาดในการสังเคราะห์เสียง: ${err.message}`);
  } finally {
    synthesizeBtn.disabled = false;
    btnText.textContent = "สังเคราะห์เสียง (Synthesize)";
    btnSpinner.style.display = "none";
  }
}

synthesizeBtn.addEventListener("click", synthesize);

// Play Output Button
if (playOutputBtn) {
  playOutputBtn.addEventListener("click", () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  });
}

// Keyboard shortcut (Ctrl+Enter or Cmd+Enter to synthesize)
textInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (!synthesizeBtn.disabled) {
      synthesize();
    }
  }
});

// Run initialization
updateCharCount();
init();
