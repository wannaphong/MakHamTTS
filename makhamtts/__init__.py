"""MakHamTTS: Lightweight, high-performance Thai Text-to-Speech powered by Thai Paradee ONNX.

Based on FastThaiG2P (Copyright (c) 2026 Charin Polpanumas, Apache-2.0 license).
Model weights hosted at https://huggingface.co/pythainlp/MakHamTTS
"""

try:
    from makhamtts.g2p import G2P
    from makhamtts.kokoro import ipa_to_kokoro
    from makhamtts.normalizer import normalize
    from makhamtts.tokenizer import Tokenizer
except ImportError:
    from fastthaig2p.g2p import G2P
    from fastthaig2p.kokoro import ipa_to_kokoro
    from fastthaig2p.normalizer import normalize
    from fastthaig2p.tokenizer import Tokenizer

__version__ = "0.1.0"
__all__ = [
    "G2P",
    "Tokenizer",
    "normalize",
    "ipa_to_kokoro",
    "TTS",
    "AVAILABLE_MODELS",
    "DEFAULT_MODEL",
    "__version__",
]


def __getattr__(name):
    if name in ("TTS", "AVAILABLE_MODELS", "DEFAULT_MODEL"):
        try:
            import makhamtts.tts as tts_module
        except ImportError:
            import fastthaig2p.tts as tts_module
        return getattr(tts_module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
