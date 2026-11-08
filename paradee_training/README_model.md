# MakHam (มะขาม) Paradee 1.1 ONNX (Thai TTS)

**MakHam (มะขาม)** is a standalone, single-voice Thai ONNX text-to-speech model distilled from **Kokoro-82M Thai** and **Paradee 1.1**, featuring the `newvoice_female` acoustic timbre.

- **HuggingFace Model**: [pythainlp/MakHamTTS](https://huggingface.co/pythainlp/MakHamTTS)
- **HuggingFace Dataset**: [pythainlp/MakHamTTS-dataset](https://huggingface.co/datasets/pythainlp/MakHamTTS-dataset)
- **Architecture**: Paradee 1.1 single-voice distillation (`TextStudent` s+mlp 4.23M + `VDecoder` vhead v2 3.65M)
- **Parameters**: **7.88M** (7,877,918 parameters)
- **Small File Size**: **8.07 MB** weight-only quantized INT8 ONNX file (vs 325 MB for Kokoro-82M)
- **Fast**: Over **45x real-time** on a single CPU thread without GPU

## Artifacts
- `paradee_thai_int8.onnx`: 8.07 MB weight-only quantized INT8 ONNX model with generated dynamic DFT bases (recommended).
- `paradee_thai.onnx`: 33.17 MB FP32 full-precision ONNX model.
- `config.json`: 115-token vocab configuration for 5-tone Thai phonemes (`language: "th"`, `num_parameters: 7877918`).
- `samples/`: Test WAV audio clips synthesized across greeting, numbers, tones, and minimal pairs.

## Model Interface
- **Inputs**:
  - `input_ids`: `[1, tokens]` (`int64`)
  - `speed`: `[1]` (`float32`, default 1.0)
- **Outputs**:
  - `waveform`: `[1, samples]` (`float32`, 24 kHz)

No external `ref_s` or `.npy` voicepack is required at runtime; the female timbre is baked directly into the model graph.

## Quick Python Example

```python
import json
import numpy as np
import onnxruntime as ort
import soundfile as sf
from fastthaig2p import G2P, ipa_to_kokoro

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

## Inference with Paradee Library

```bash
python -m paradee "สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา" \
    --model-path paradee/models/paradee_thai/paradee_thai_int8.onnx \
    --config-path paradee/models/paradee_thai/config.json \
    -o hello_thai.wav
```
