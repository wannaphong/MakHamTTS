"""MakHamTTS: High-performance Thai Text-to-Speech powered by Thai Paradee ONNX.

This module is based on and extends FastThaiG2P (Copyright (c) 2026 Charin Polpanumas, Apache-2.0 license),
adapted for standalone single-voice Paradee ONNX models trained on Thai phonology.

Model weights:
  Hosted on HuggingFace at https://huggingface.co/pythainlp/MakHamTTS
  - paradee_thai (default):
    - INT8 (8.07 MB):  https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/paradee_thai_int8.onnx
    - FP32 (33.17 MB): https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/paradee_thai.onnx
    - Config:          https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/config.json
    - Run script:      https://huggingface.co/pythainlp/MakHamTTS/resolve/main/paradee_thai/run.py
  - makham_female_thai:
    - INT8 (82.7 MB):  https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/makham_female_thai_int8.onnx
    - FP32 (325.5 MB): https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/makham_female_thai.onnx
    - Config:          https://huggingface.co/pythainlp/MakHamTTS/resolve/main/fastthaig2p_single_model/config.json

Features:
  - Self-contained single-voice ONNX: No external voicepack required at runtime.
  - Zero-arg TTS(): Automatically downloads the lightweight INT8 model on first call.
  - Generates 24 kHz mono float32 audio.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.request
import wave
from pathlib import Path
from typing import Optional, Union

import numpy as np

try:
    from makhamtts.g2p import G2P
    from makhamtts.kokoro import ipa_to_kokoro
except ImportError:
    from fastthaig2p.g2p import G2P
    from fastthaig2p.kokoro import ipa_to_kokoro

logger = logging.getLogger("MakHamTTS")

# HuggingFace repository and asset paths
HF_REPO = "pythainlp/MakHamTTS"
HF_RESOLVE_BASE = f"https://huggingface.co/{HF_REPO}/resolve/main"

AVAILABLE_MODELS = {
    "paradee_thai": {
        "int8_model": "paradee_thai/paradee_thai_int8.onnx",
        "fp32_model": "paradee_thai/paradee_thai.onnx",
        "config": "paradee_thai/config.json",
        "run_script": "paradee_thai/run.py",
        "name": "Paradee Thai Female (Paradee 1.1)",
        "description": "8.07 MB INT8 / 33.17 MB FP32, ultra-fast distillation (>45x RT)",
    },
    "makham_female_thai": {
        "int8_model": "fastthaig2p_single_model/makham_female_thai_int8.onnx",
        "fp32_model": "fastthaig2p_single_model/makham_female_thai.onnx",
        "config": "fastthaig2p_single_model/config.json",
        "name": "Makham Female Thai (Kokoro-82M Thai single-voice)",
        "description": "82.7 MB INT8 / 325.5 MB FP32",
    },
}

DEFAULT_MODEL = "paradee_thai"
DEFAULT_ASSETS = AVAILABLE_MODELS[DEFAULT_MODEL]

# Local candidate search paths (useful when working inside the labtts workspace)
LOCAL_SEARCH_DIRS = [
    Path("/workspace/labtts/paradee/models/paradee_thai"),
    Path("./paradee_thai"),
    Path("./models/paradee_thai"),
    Path("/workspace/labtts/dist/paradee_thai"),
    Path("./dist/paradee_thai"),
    Path("../dist/paradee_thai"),
]


def _get_cache_dir() -> Path:
    """Return the default cache directory for MakHamTTS."""
    cache = Path(os.environ.get("MAKHAMTTS_HOME", Path.home() / ".cache" / "makhamtts"))
    cache.mkdir(parents=True, exist_ok=True)
    return cache


def _resolve_asset(filename: str) -> Path:
    """Resolve an asset file path, checking local workspace, cache, or downloading from HF."""
    cache_dir = _get_cache_dir()
    dest = cache_dir / filename
    if dest.exists() and dest.stat().st_size > 0:
        return dest

    base_name = Path(filename).name

    # 1. Exact match check in local search directories
    for search_dir in LOCAL_SEARCH_DIRS:
        candidate = search_dir / base_name
        if candidate.exists() and candidate.stat().st_size > 0:
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                import shutil
                shutil.copy2(candidate, dest)
                return dest
            except Exception:
                return candidate

    # 2. Check alternative alias names if not found by exact name
    alias_names = []
    if "paradee_thai_int8" in base_name:
        alias_names.append("makham_female_thai_int8.onnx")
    elif "makham_female_thai_int8" in base_name:
        alias_names.append("paradee_thai_int8.onnx")
    elif "paradee_thai" in base_name:
        alias_names.append("makham_female_thai.onnx")
    elif "makham_female_thai" in base_name:
        alias_names.append("paradee_thai.onnx")

    for search_dir in LOCAL_SEARCH_DIRS:
        for candidate_name in alias_names:
            candidate = search_dir / candidate_name
            if candidate.exists() and candidate.stat().st_size > 0:
                dest.parent.mkdir(parents=True, exist_ok=True)
                try:
                    import shutil
                    shutil.copy2(candidate, dest)
                    return dest
                except Exception:
                    return candidate

    # 3. Download from HuggingFace Hub
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        from huggingface_hub import hf_hub_download
        downloaded = hf_hub_download(
            repo_id=HF_REPO,
            filename=filename,
            local_dir=cache_dir,
            local_dir_use_symlinks=False,
        )
        return Path(downloaded)
    except Exception as hf_err:
        logger.debug(f"hf_hub_download failed ({hf_err}), falling back to direct URL download...")

    # 4. Fallback direct download via HTTP
    url = f"{HF_RESOLVE_BASE}/{filename}"
    print(f"Downloading {filename} from {url} → {dest} ...")
    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MakHamTTS/0.1.0"})
        with urllib.request.urlopen(req) as response, open(tmp, "wb") as f:
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded_bytes = 0
            while chunk := response.read(1 << 20):  # 1 MB chunks
                f.write(chunk)
                downloaded_bytes += len(chunk)
                if total_size > 0:
                    pct = downloaded_bytes / total_size * 100
                    print(f"\rDownloading {base_name}: {pct:.1f}% ({downloaded_bytes / 1e6:.1f}/{total_size / 1e6:.1f} MB)", end="")
            if total_size > 0:
                print()
        tmp.rename(dest)
        return dest
    except Exception as dl_err:
        if tmp.exists():
            tmp.unlink()
        raise RuntimeError(
            f"Failed to download {filename} from HuggingFace ({dl_err}). "
            f"Please ensure internet connectivity or pass explicit local model_path."
        ) from dl_err


class TTS:
    """Thai Text-to-Speech powered by MakHamTTS (Paradee ONNX).

    Based on FastThaiG2P (Copyright (c) 2026 Charin Polpanumas, Apache-2.0 license).
    Models hosted at https://huggingface.co/pythainlp/MakHamTTS

    Usage:
        from makhamtts import TTS

        # Zero-arg: automatically downloads the 82.7 MB INT8 model
        tts = TTS()

        # Generate float32 numpy audio array (24 kHz)
        audio = tts.generate("สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา")

        # Directly save to WAV file
        tts.synthesize("ยอดเงินคงเหลือสามพันห้าร้อยบาทถ้วน", "out.wav")

        # Or use callable shorthand
        audio = tts("ยินดีต้อนรับค่ะ")
    """

    MAX_PHONEMES = 510  # Context length limit per chunk
    SAMPLE_RATE = 24000

    def __init__(
        self,
        model_path: Optional[Union[str, Path]] = None,
        config_path: Optional[Union[str, Path]] = None,
        model: Optional[str] = None,
        quantized: bool = True,
        speed: float = 1.0,
        intra_op_threads: int = 0,
    ):
        """Initialize MakHamTTS session.

        Args:
            model_path: Path to local ONNX model, model name preset, or None to download/resolve.
            config_path: Path to local config.json, or None to download/resolve.
            model: Model preset name ("paradee_thai" or "makham_female_thai", default: "paradee_thai").
            quantized: If True (default), downloads the lightweight INT8 model; if False, FP32 model.
            speed: Speech speed multiplier (default 1.0).
            intra_op_threads: CPU thread count for onnxruntime (0 = automatic).
        """
        import onnxruntime as ort

        # Support passing model preset as first positional argument
        if isinstance(model_path, str) and model_path in AVAILABLE_MODELS:
            model = model_path
            model_path = None

        selected_model_name = model or DEFAULT_MODEL
        model_assets = AVAILABLE_MODELS.get(selected_model_name, AVAILABLE_MODELS[DEFAULT_MODEL])
        self.model_name = selected_model_name

        # Resolve model path
        if model_path is None:
            model_key = "int8_model" if quantized else "fp32_model"
            model_path = _resolve_asset(model_assets[model_key])
        else:
            model_path = Path(model_path)
            if not model_path.exists():
                # Check if it was passed as a filename relative to default assets
                model_path = _resolve_asset(str(model_path))

        # Resolve config path
        if config_path is None:
            config_path = _resolve_asset(model_assets["config"])
        else:
            config_path = Path(config_path)
            if not config_path.exists():
                config_path = _resolve_asset(str(config_path))

        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not config_path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")

        options = ort.SessionOptions()
        if intra_op_threads > 0:
            options.intra_op_num_threads = intra_op_threads
        options.inter_op_num_threads = 1

        self.model_path = model_path
        self.config_path = config_path
        self.speed = float(speed)

        self._session = ort.InferenceSession(
            str(model_path), options, providers=["CPUExecutionProvider"]
        )
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        self._vocab = cfg["vocab"]
        self._g2p = G2P()
        self.sample_rate = cfg.get("sample_rate", self.SAMPLE_RATE)

    def text_to_phonemes(self, text: str) -> str:
        """Convert Thai text to tone-annotated Kokoro phonemes."""
        return ipa_to_kokoro(self._g2p.convert(text))

    def generate_from_phonemes(self, phonemes: str, speed: Optional[float] = None) -> np.ndarray:
        """Generate audio from phoneme string."""
        if not phonemes:
            return np.array([], dtype=np.float32)

        spd = float(speed if speed is not None else self.speed)
        ids = [0] + [self._vocab[c] for c in phonemes if c in self._vocab][:self.MAX_PHONEMES] + [0]
        feed = {
            "input_ids": np.array([ids], dtype=np.int64),
            "speed": np.array([spd], dtype=np.float32),
        }
        res = self._session.run(None, feed)
        waveform = res[0]
        if waveform.ndim == 2:
            waveform = waveform[0]
        return waveform

    def _split_chunks(self, text: str) -> list[str]:
        """Split text into manageable chunks respecting sentence boundaries."""
        sentences = [s.strip() for s in re.split(r"(?<=[.!?…])\s+|\n+", text.strip()) if s.strip()]
        chunks = []
        for s in sentences:
            ps = self.text_to_phonemes(s)
            while len(ps) > self.MAX_PHONEMES:
                cut = ps.rfind(" ", 0, self.MAX_PHONEMES)
                cut = cut if cut > 0 else self.MAX_PHONEMES
                chunks.append(ps[:cut])
                ps = ps[cut:].lstrip()
            if ps:
                chunks.append(ps)
        return chunks

    def generate(self, text: str, speed: Optional[float] = None) -> np.ndarray:
        """Convert Thai text to a float32 24 kHz audio array."""
        chunks = self._split_chunks(text)
        if not chunks:
            return np.array([], dtype=np.float32)

        audio_parts = [self.generate_from_phonemes(p, speed=speed) for p in chunks]
        audio_parts = [a for a in audio_parts if len(a) > 0]
        return np.concatenate(audio_parts) if audio_parts else np.array([], dtype=np.float32)

    def synthesize(
        self,
        text: str,
        output_path: Union[str, Path],
        speed: Optional[float] = None,
    ) -> Path:
        """Convert Thai text to audio and save directly as a 24 kHz WAV file."""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        audio = self.generate(text, speed=speed)
        pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
        with wave.open(str(output_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(pcm.tobytes())
        return output_path

    def __call__(self, text: str, speed: Optional[float] = None) -> np.ndarray:
        """Shorthand for self.generate(text, speed)."""
        return self.generate(text, speed=speed)
