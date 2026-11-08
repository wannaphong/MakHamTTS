/**
 * MakHamTTS Web Engine - runs Paradee Thai ONNX in browser with ONNX Runtime Web.
 * Supports both WASM (CPU) and WebGPU (GPU) execution providers.
 */

import { G2P } from "./g2p.js";

export function float32ToWavBlob(samples, sampleRate = 24000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  // fmt subchunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate (24000)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (24000 * 1 * 16/8)
  view.setUint16(32, 2, true);  // BlockAlign (1 * 16/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data subchunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  if (typeof Blob !== "undefined") {
    return new Blob([buffer], { type: "audio/wav" });
  }
  return buffer;
}

export async function checkWebGPUSupport() {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    return { supported: false, reason: "เบราว์เซอร์ไม่รองรับ WebGPU (navigator.gpu is undefined)" };
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { supported: false, reason: "ไม่พบการ์ดจอที่รองรับ WebGPU (No WebGPU adapter found)" };
    }
    return { supported: true, adapter };
  } catch (err) {
    return { supported: false, reason: err.message };
  }
}

export class ParadeeTTS {
  constructor() {
    this.session = null;
    this.vocab = null;
    this.sampleRate = 24000;
    this.g2p = new G2P();
    this.maxPhonemes = 510;
    this.isReady = false;
    this.currentBackend = "wasm";
    this.modelPath = "paradee_thai_int8.onnx";
    this.modelBuffer = null;
  }

  async init({
    modelPath = "paradee_thai_int8.onnx",
    configPath = "config.json",
    dictPath = "dict.json",
    backend = "wasm",
    onProgress = null,
  } = {}) {
    if (typeof ort === "undefined") {
      throw new Error("ONNX Runtime Web (ort) is not loaded.");
    }

    this.modelPath = modelPath;

    // Configure WASM paths (detect local lib or default to CDN)
    const CDN_WASM_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
    if (ort.env && ort.env.wasm) {
      if (typeof window !== "undefined") {
        let selectedWasmPath = CDN_WASM_PATH;
        try {
          // Probe if local lib is available (returns 200 OK without 404)
          const localCheckUrl = new URL("./lib/ort-wasm-simd-threaded.mjs", window.location.href).href;
          const checkRes = await fetch(localCheckUrl, { method: "HEAD" });
          if (checkRes.ok) {
            selectedWasmPath = new URL("./lib/", window.location.href).href;
          }
        } catch {
          selectedWasmPath = CDN_WASM_PATH;
        }
        ort.env.wasm.wasmPaths = selectedWasmPath;
      }
      if (typeof self !== "undefined" && self.crossOriginIsolated) {
        ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
      } else {
        ort.env.wasm.numThreads = 1;
      }
    }

    if (onProgress) onProgress({ status: "loading_config", message: "กำลังโหลดพจนานุกรม 62,112 คำ... (Loading dictionary...)" });

    // 1. Fetch config and dict
    let configData;
    let dictData;

    const isBrowser = typeof window !== "undefined";
    if (isBrowser) {
      const [cfgRes, dictRes] = await Promise.all([
        fetch(configPath),
        fetch(dictPath)
      ]);
      configData = await cfgRes.json();
      dictData = await dictRes.json();
    } else {
      // Node.js fallback
      const fs = await import("fs");
      configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      dictData = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    }

    this.vocab = configData.vocab;
    this.sampleRate = configData.sample_rate || 24000;
    this.g2p.setDictionary(dictData);

    // 2. Load model with requested backend
    await this.loadModel(backend, onProgress);
    return this;
  }

  async loadModel(backend = "wasm", onProgress = null) {
    if (this.session) {
      try {
        await this.session.release();
      } catch {
        // ignore release error
      }
      this.session = null;
    }

    this.isReady = false;
    const backendLabel = backend === "webgpu" ? "WebGPU (GPU)" : "WASM (CPU)";
    if (onProgress) {
      onProgress({ status: "loading_model", message: `กำลังโหลดโมเดลด้วย ${backendLabel}... (Loading model with ${backendLabel}...)` });
    }

    const executionProviders = backend === "webgpu" ? ["webgpu", "wasm"] : ["wasm"];
    const sessionOptions = {
      executionProviders,
      graphOptimizationLevel: "all",
    };

    let session;
    const isBrowser = typeof window !== "undefined";

    if (isBrowser) {
      // Cache modelBuffer in memory to make backend switching instant without re-fetching
      if (!this.modelBuffer) {
        const resp = await fetch(this.modelPath);
        this.modelBuffer = await resp.arrayBuffer();
      }
      try {
        session = await ort.InferenceSession.create(this.modelBuffer, sessionOptions);
      } catch (localErr) {
        console.warn(`${backend} session creation failed, retrying with CDN fallback...`, localErr);
        if (ort.env && ort.env.wasm) {
          ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
        }
        session = await ort.InferenceSession.create(this.modelBuffer, sessionOptions);
      }
    } else {
      // Node.js
      const fs = await import("fs");
      if (!this.modelBuffer) {
        this.modelBuffer = fs.readFileSync(this.modelPath);
      }
      session = await ort.InferenceSession.create(this.modelBuffer, sessionOptions);
    }

    this.session = session;
    this.currentBackend = backend;
    this.isReady = true;

    if (onProgress) {
      onProgress({ status: "ready", message: `พร้อมใช้งาน! โมเดลทำงานบน ${backendLabel}` });
    }
    return session;
  }

  textToPhonemes(text) {
    return this.g2p.convert(text);
  }

  phonemesToInputIds(phonemes) {
    const ids = [0];
    for (const char of phonemes) {
      if (this.vocab && this.vocab[char] !== undefined) {
        ids.push(this.vocab[char]);
      }
    }
    ids.push(0);
    return ids;
  }

  _splitChunks(text) {
    const rawSentences = text.split(/(?<=[.!?…\n])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const chunks = [];

    for (const s of rawSentences) {
      let ps = this.textToPhonemes(s);
      while (ps.length > this.maxPhonemes) {
        let cut = ps.lastIndexOf(" ", this.maxPhonemes);
        if (cut <= 0) cut = this.maxPhonemes;
        chunks.push(ps.substring(0, cut).trim());
        ps = ps.substring(cut).trim();
      }
      if (ps) chunks.push(ps);
    }

    return chunks.length > 0 ? chunks : [this.textToPhonemes(text)];
  }

  async generatePhonemes(phonemes, speed = 1.0) {
    if (!this.session) {
      throw new Error("TTS session not initialized. Call init() first.");
    }
    if (!phonemes) {
      return new Float32Array(0);
    }

    let ids = this.phonemesToInputIds(phonemes);
    if (ids.length > this.maxPhonemes + 2) {
      ids = ids.slice(0, this.maxPhonemes + 1);
      ids.push(0);
    }

    const inputIdsData = BigInt64Array.from(ids.map(x => BigInt(x)));
    const inputIdsTensor = new ort.Tensor("int64", inputIdsData, [1, ids.length]);
    const speedTensor = new ort.Tensor("float32", new Float32Array([speed]), [1]);

    const feeds = {
      input_ids: inputIdsTensor,
      speed: speedTensor
    };

    const results = await this.session.run(feeds);
    const outputName = this.session.outputNames[0];
    const waveformTensor = results.waveform || results[outputName];
    return waveformTensor.data; // Float32Array
  }

  async synthesize(text, { speed = 1.0, onChunk = null } = {}) {
    const startTime = performance.now();
    const chunks = this._splitChunks(text);
    const fullPhonemes = chunks.join(" ");

    const audioParts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkAudio = await this.generatePhonemes(chunks[i], speed);
      if (chunkAudio && chunkAudio.length > 0) {
        audioParts.push(chunkAudio);
      }
      if (onChunk) {
        onChunk({ current: i + 1, total: chunks.length });
      }
    }

    // Concatenate audio chunks
    const totalSamples = audioParts.reduce((acc, cur) => acc + cur.length, 0);
    const mergedAudio = new Float32Array(totalSamples);
    let offset = 0;
    for (const part of audioParts) {
      mergedAudio.set(part, offset);
      offset += part.length;
    }

    const elapsedMs = performance.now() - startTime;
    const durationSec = totalSamples / this.sampleRate;
    const rtf = elapsedMs / 1000 / (durationSec || 1);

    const wavBlob = float32ToWavBlob(mergedAudio, this.sampleRate);

    return {
      audio: mergedAudio,
      blob: wavBlob,
      sampleRate: this.sampleRate,
      phonemes: fullPhonemes,
      durationSec,
      elapsedMs,
      rtf,
      backend: this.currentBackend,
    };
  }
}
