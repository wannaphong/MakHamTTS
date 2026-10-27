# MakHamTTS Web Demo (paradee_thai_int8.onnx)

A **100% client-side, zero-Python web demo** for [MakHamTTS](https://github.com/wannaphong/MakHamTTS) running the **`paradee_thai_int8.onnx`** model in the browser via **ONNX Runtime Web (WASM SIMD)**.

Input Thai text, synthesize natural 24 kHz speech in milliseconds directly in your browser, and click to **play** or **download as WAV**.

---

## ✨ Features

- **Zero Python Runtime**: All text processing, tokenization, G2P phonemization, and ONNX neural network inference are ported entirely to JavaScript.
- **Dual Execution Providers**: Supports both **⚡ WASM (CPU)** for universal compatibility and **🚀 WebGPU (GPU)** for hardware-accelerated synthesis on modern browsers (Chrome/Edge 113+, Safari 18+).
- **Ultra-Lightweight INT8 Model**: Uses `paradee_thai_int8.onnx` (8.07 MB) with speaker timbre baked directly into the graph.
- **High Performance**: Runs at **>15x–40x faster than real-time** on standard CPU browser threads using WebAssembly SIMD.
- **Complete Thai Text Normalization**:
  - Maiyamok (`ๆ`) expansion
  - Thai numeral conversion (`๑๒๓` → `123` → `หนึ่งร้อยยี่สิบสาม`)
  - Numbers, decimals, millions with Thai place values
  - Time patterns (`14:30 น.` → `สิบสี่นาฬิกาสามสิบนาที`)
  - Phone numbers (`081-234-5678`)
  - Currency, units, symbols, and abbreviations (`ม.ค.`, `กทม.`, `ดร.`)
  - Latin words and email reading
- **Accurate Thai Word Segmentation**: Maximal matching with Thai Character Cluster (TCC) boundary constraints using the 62k dictionary.
- **Tone-Annotated Kokoro Phonemization**: Supports all 5 Thai tones (`→` mid, `↓` low, `↘` falling, `↑` high, `↗` rising).
- **Interactive UI**:
  - Instant preset buttons for testing common phrases
  - Real-time speech speed slider (0.5x to 2.0x)
  - Audio waveform visualizer canvas
  - Built-in audio player with play/pause and download WAV action
  - Technical phoneme breakdown inspector

---

## 🚀 Running the Web Demo

Since modern browsers enforce CORS security policies for WebAssembly and local assets (`fetch`), serve `./webdemo` using any simple static web server.

### Option 1: Python HTTP Server (One-liner)

```bash
cd webdemo
python3 -m http.server 8000
```
Then open: **http://localhost:8000**

### Option 2: Node.js `npx serve` or `http-server`

```bash
cd webdemo
npx serve .
```

### Option 3: GitHub Pages / Cloudflare Pages / Vercel

Simply deploy the `./webdemo` directory as a static site. No build step or backend required.

---

## 📁 Directory Structure

```
webdemo/
├── index.html                 # Main web application entry point
├── style.css                  # Responsive modern stylesheet
├── app.js                     # UI controller & interaction handlers
├── tts.js                     # MakHamTTS engine (ONNX Runtime Web inference & WAV encoder)
├── g2p.js                     # Thai Grapheme-to-Phoneme converter
├── tokenizer.js               # Trie-based Thai word tokenizer with TCC constraints
├── normalizer.js              # Thai text normalizer (numbers, abbrevs, units)
├── paradee_thai_int8.onnx     # Quantized 8.07 MB single-voice ONNX model
├── config.json                # Model vocabulary and sample rate (24 kHz)
├── dict.json                  # 62k Thai word-to-phoneme dictionary
└── lib/                       # Vendor ONNX Runtime Web WASM binaries
    ├── ort.min.js
    ├── ort-wasm-simd-threaded.wasm
    ├── ort-wasm-simd-threaded.mjs
    ├── ort-wasm-simd-threaded.jsep.wasm
    └── ort-wasm-simd-threaded.jsep.mjs
```

---

## 🧪 Testing in Node.js

The JavaScript modules are written with standard ES module compatibility, so you can test them offline in Node.js:

```bash
node -e "
globalThis.ort = require('./webdemo/lib/ort.min.js');
ort.env.wasm.wasmPaths = process.cwd() + '/webdemo/lib/';
import('./webdemo/tts.js').then(async ({ ParadeeTTS }) => {
  const tts = new ParadeeTTS();
  await tts.init({
    modelPath: './webdemo/paradee_thai_int8.onnx',
    configPath: './webdemo/config.json',
    dictPath: './webdemo/dict.json',
  });
  const res = await tts.synthesize('สวัสดีค่ะ ยินดีต้อนรับสู่ MakHamTTS');
  console.log('Synthesized in', res.elapsedMs.toFixed(0), 'ms for', res.durationSec.toFixed(2), 's audio');
});
"
```

---

## 📜 License

Apache-2.0 License. Powered by [MakHamTTS](https://github.com/wannaphong/MakHamTTS).
