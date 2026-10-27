# MakHamTTS (มะขาม TTS)

[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-MakHamTTS-blue)](https://huggingface.co/pythainlp/MakHamTTS)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

**MakHamTTS** is a lightweight, high-performance Thai Text-to-Speech library powered by **Thai Paradee ONNX**. It runs fully offline on CPU without requiring GPU or heavy dependencies, generating natural 24 kHz speech at **over 45x–75x faster than real-time**.

Unlike standard multi-voice Kokoro architectures that require external voicepack tensors at runtime, MakHamTTS uses a **standalone single-voice ONNX model** where the speaker timbre is baked directly into the graph.

---

## Features

- **Self-Contained Single-Voice ONNX**: No external `.npy` or `.pt` voicepack file needed at runtime. Just pass text and speech speed.
- **Ultra-Lightweight & Fast**:
  - **`paradee_thai` INT8 Model (Default)**: Only **8.07 MB** on disk (7.88M parameters), running at **>45x–75x real-time** on a standard CPU thread.
  - **`paradee_thai` FP32 Full Precision**: **33.17 MB** for full-precision output.
  - **`makham_female_thai` Model**: 82.7 MB INT8 / 325.5 MB FP32 full Kokoro architecture.
- **Accurate 5-Tone Thai Phonology**: Incorporates dictionary-based and rule-based G2P with explicit pitch contour markers (`→` mid, `↓` low, `↘` falling, `↑` high, `↗` rising).
- **Zero-Configuration Download**: Automatically downloads the recommended INT8 model from Hugging Face on first call.

---

## Installation

```bash
pip install git+https://github.com/wannaphong/MakHamTTS.git
```

Or clone and install in editable mode:

```bash
git clone https://github.com/wannaphong/MakHamTTS.git
cd MakHamTTS
pip install -e .
```

---

## Quick Start

### 1. Python API

```python
from makhamtts import TTS

# Initialize TTS (automatically resolves or downloads paradee_thai INT8 from Hugging Face)
tts = TTS()  # or TTS(model="paradee_thai")

# Synthesize directly to a 24 kHz WAV file
tts.synthesize("สวัสดีค่ะ ยินดีต้อนรับสู่ระบบเสียงภาษาไทย", "output.wav")

# Or generate a float32 numpy audio array (24 kHz mono)
audio = tts.generate("ยอดเงินคงเหลือสามพันห้าร้อยบาทถ้วน")

# Shorthand callable
audio = tts("ยินดีต้อนรับค่ะ", speed=1.1)
```

### 2. Standalone Python Run Script (`run.py`)

You can also run inference directly with `onnxruntime` and `soundfile` using [`run.py`](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/run.py):

```python
import json
import numpy as np
import onnxruntime as ort
import soundfile as sf
from makhamtts import G2P, ipa_to_kokoro

g2p = G2P()
cfg = json.load(open("config.json", encoding="utf-8"))
sess = ort.InferenceSession("paradee_thai_int8.onnx", providers=["CPUExecutionProvider"])

text = "สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา"
phonemes = ipa_to_kokoro(g2p.convert(text))
ids = [0] + [cfg["vocab"][c] for c in phonemes if c in cfg["vocab"]] + [0]

audio = sess.run(None, {
    "input_ids": np.array([ids], dtype=np.int64),
    "speed": np.array([1.0], dtype=np.float32),
})[0][0]

sf.write("output.wav", audio, 24000)
```

Execute with:
```bash
python run.py
```

### 3. Command Line (CLI)

```bash
# Speak text and save to output WAV
makhamtts "สวัสดีครับ ยินดีต้อนรับสู่ MakHamTTS" -o hello.wav

# Adjust speech rate (e.g. 1.25x speed)
makhamtts "กรุณารอสักครู่ค่ะ" --speed 1.25 -o fast.wav

# Use full-precision FP32 model instead of INT8
makhamtts "ทดสอบเสียงคุณภาพสูง" --fp32 -o test_fp32.wav
```

---

## Model Artifacts

Model weights and configurations are hosted on Hugging Face at [**pythainlp/MakHamTTS**](https://huggingface.co/pythainlp/MakHamTTS):

### `paradee_thai` (Default & Recommended)

Distilled Thai Paradee 1.1 model (7.88M parameters, `TextStudent` + `VDecoder`).

| Artifact | File Size | Description | Download Link |
|---|---|---|---|
| **`paradee_thai_int8.onnx`** *(Default)* | **8.07 MB** | Weight-only quantized INT8 ONNX model (>45x RT) | [Download INT8 ONNX](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/paradee_thai_int8.onnx) |
| **`paradee_thai.onnx`** | 33.17 MB | Full-precision FP32 ONNX model | [Download FP32 ONNX](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/paradee_thai.onnx) |
| **`config.json`** | 2.67 KB | 115-token Thai vocabulary configuration | [Download config.json](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/config.json) |
| **`run.py`** | 0.69 KB | Standalone Python inference script | [Download run.py](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/run.py) |

### `makham_female_thai`

Full Kokoro architecture single-voice Thai model.

| Artifact | File Size | Description | Download Link |
|---|---|---|---|
| **`makham_female_thai_int8.onnx`** | 82.7 MB | Weight-only quantized ONNX model | [Download INT8 ONNX](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/makham_female_thai_int8.onnx) |
| **`makham_female_thai.onnx`** | 325.5 MB | Full-precision FP32 ONNX model | [Download FP32 ONNX](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/makham_female_thai.onnx) |
| **`config.json`** | 2.68 KB | 115-token Thai vocabulary configuration | [Download config.json](https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/config.json) |

### ONNX Model Contract

- **Input 1 (`input_ids`)**: `int64 [1, tokens]` — Tokenized Thai phonemes with BOS (`0`) and EOS (`0`).
- **Input 2 (`speed`)**: `float32 [1]` — Speed multiplier (default: 1.0).
- **Output (`waveform`)**: `float32 [1, samples]` — 24 kHz single-channel audio waveform.

---

## Performance & Benchmarks

Tested on a single CPU thread (x86_64 / Linux) using `paradee_thai_int8.onnx`:

| Sentence | Meaning / Category | Audio Duration | Generation Time | Speed |
|---|---|---|---|---|
| สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา | Greeting / Service | 3.12 s | ~40 ms | **>75x RT** |
| ยอดเงินคงเหลือสามพันห้าร้อยบาทถ้วน | Banking / Numbers | 3.08 s | ~40 ms | **>75x RT** |
| ใครขายไข่ไก่ ใกล้ๆ บ้านเรา | 5-Tone Stress Test | 2.82 s | ~38 ms | **>70x RT** |
| มาใหม่ ไม้ใหม่ ไม่ไหม้ ไหม | Minimal Pairs / Tones | 2.15 s | ~30 ms | **>70x RT** |

---

## Credits & Acknowledgments

MakHamTTS builds upon several open-source breakthroughs:

1. **[FastThaiG2P](https://github.com/awslabs/FastThaiG2P)** (Apache-2.0 license, Copyright (c) 2026 Charin Polpanumas):
   The G2P engine, tokenizer, Thai text normalizer, and dictionary-based fallback implementation in MakHamTTS are directly adapted from FastThaiG2P. Special thanks to Charin Polpanumas and contributors for their pioneering work on high-speed Thai grapheme-to-phoneme conversion.

2. **[Paradee](https://github.com/sahilmahendrakar/paradee)** (Apache-2.0 License, Sahil Mahendrakar):
   The standalone single-voice ONNX architecture, channel-wise `DequantizeLinear` weight quantization, and graph contracts are inspired by Sahil Mahendrakar's research on distilling single-voice models from Kokoro ([arXiv:2610.06817](https://arxiv.org/abs/2610.06817)).

3. **[Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)** (Apache-2.0 License, hexgrad):
   Base neural acoustic and iSTFTNet vocoder architecture.

4. **[Som TTS Dataset](https://doi.org/10.5281/zenodo.21530909)** (Wannaphong Phatthiyaphaibun, PyThaiNLP):
   Voice design, dataset curation, and two-stage StyleTTS2 acoustic fine-tuning on open Thai speech corpora.

---

## License

- Code: [Apache License 2.0](LICENSE) (with FastThaiG2P components under [Apache-2.0 license](https://github.com/awslabs/FastThaiG2P/blob/main/LICENSE)).
- Model weights: [Apache License 2.0](https://huggingface.co/pythainlp/MakHamTTS).
