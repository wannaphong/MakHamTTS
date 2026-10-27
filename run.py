"""Run script for paradee_thai ONNX model.

Matches HuggingFace: https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/run.py
"""

import json
from pathlib import Path
import numpy as np
import onnxruntime as ort
import soundfile as sf

try:
    from makhamtts import G2P, ipa_to_kokoro
    from makhamtts.tts import _resolve_asset, AVAILABLE_MODELS
except ImportError:
    from fastthaig2p import G2P, ipa_to_kokoro
    _resolve_asset = None
    AVAILABLE_MODELS = None

# Locate config and model files (local directory first, then resolve from cache/HF)
cfg_path = Path("config.json")
if not cfg_path.exists():
    if Path("paradee_thai/config.json").exists():
        cfg_path = Path("paradee_thai/config.json")
    elif _resolve_asset:
        cfg_path = _resolve_asset("paradee_thai/config.json")

model_path = Path("paradee_thai_int8.onnx")
if not model_path.exists():
    if Path("paradee_thai/paradee_thai_int8.onnx").exists():
        model_path = Path("paradee_thai/paradee_thai_int8.onnx")
    elif _resolve_asset:
        model_path = _resolve_asset("paradee_thai/paradee_thai_int8.onnx")

g2p = G2P()
cfg = json.load(open(cfg_path, encoding="utf-8"))
sess = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

text = "สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา"
phonemes = ipa_to_kokoro(g2p.convert(text))
ids = [0] + [cfg["vocab"][c] for c in phonemes if c in cfg["vocab"]] + [0]

audio = sess.run(None, {
    "input_ids": np.array([ids], dtype=np.int64),
    "speed": np.array([1.0], dtype=np.float32),
})[0][0]

sf.write("output.wav", audio, 24000)
print(f"Generated audio saved to output.wav ({len(audio)/24000:.2f}s)")
