# MakHamTTS (มะขาม TTS)

[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-MakHamTTS-blue)](https://huggingface.co/pythainlp/MakHamTTS)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

**MakHamTTS** is a lightweight, high-performance Thai Text-to-Speech library powered by **Thai Paradee ONNX**. It runs fully offline on CPU without requiring GPU or heavy dependencies, generating natural 24 kHz speech at **4x–7x faster than real-time**.

Unlike standard multi-voice Kokoro architectures that require external voicepack tensors at runtime, MakHamTTS uses a **standalone single-voice ONNX model** where the speaker timbre is baked directly into the graph.

---

## Features

- **Self-Contained Single-Voice ONNX**: No external `.npy` or `.pt` voicepack file needed at runtime. Just pass text and speech speed.
- **Ultra-Lightweight & Fast**:
  - **INT8 Quantized Model**: Only **82.7 MB** on disk, running at **4.1x–6.8x real-time** on a standard CPU thread.
  - **FP32 Full Precision**: 325.5 MB for studio-grade reproduction.
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

# Initialize TTS (automatically downloads the 82.7 MB INT8 model from Hugging Face on first run)
tts = TTS()

# Synthesize directly to a 24 kHz WAV file
tts.synthesize("สวัสดีค่ะ ยินดีต้อนรับสู่ระบบเสียงภาษาไทย", "output.wav")

# Or generate a float32 numpy audio array
audio = tts.generate("ยอดเงินคงเหลือสามพันห้าร้อยบาทถ้วน")

# Shorthand callable
audio = tts("ยินดีต้อนรับค่ะ", speed=1.1)
```

### 2. Command Line (CLI)

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

| Artifact | File Size | Description | Download Link |
|---|---|---|---|
| **makham_female_thai_int8.onnx** *(Default)* | **82.7 MB** | Weight-only quantized ONNX model for CPU serving | [Download INT8 ONNX](https://huggingface.co/pythainlp/MakHamTTS/blob/main/paradee_thai/makham_female_thai_int8.onnx) |
| **makham_female_thai.onnx** | 325.5 MB | Full-precision FP32 ONNX model | [Download FP32 ONNX](https://huggingface.co/pythainlp/MakHamTTS/blob/main/paradee_thai/makham_female_thai.onnx) |
| **config.json** | 2.7 KB | 115-token Thai vocabulary configuration | [Download config.json](https://huggingface.co/pythainlp/MakHamTTS/blob/main/paradee_thai/config.json) |

### ONNX Model Contract

- **Input 1 (`input_ids`)**: `int64 [1, tokens]` — Tokenized Thai phonemes with BOS (`0`) and EOS (`0`).
- **Input 2 (`speed`)**: `float32 [1]` — Speed multiplier.
- **Output (`waveform`)**: `float32 [1, samples]` — 24 kHz single-channel audio waveform.

---

## Performance & Benchmarks

Tested on a single CPU thread (x86_64 / Linux):

| Sentence | Meaning / Category | Duration | INT8 Speed |
|---|---|---|---|
| สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา | Greeting / Service | 3.17 s | 4.1x RT |
| ยอดเงินคงเหลือสามพันห้าร้อยบาทถ้วน | Banking / Numbers | 3.10 s | 4.2x RT |
| ใครขายไข่ไก่ ใกล้ๆ บ้านเรา | 5-Tone Stress Test | 2.85 s | 4.2x RT |
| มาใหม่ ไม้ใหม่ ไม่ไหม้ ไหม | Minimal Pairs / Tones | 2.17 s | 4.1x RT |

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
