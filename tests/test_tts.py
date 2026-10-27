import pytest
from makhamtts import TTS, AVAILABLE_MODELS, DEFAULT_MODEL


def test_tts_initialization_and_synthesis(tmp_path):
    tts = TTS()
    assert tts.model_name == "paradee_thai"
    text = "สวัสดีครับ ยินดีต้อนรับครับ"
    audio = tts.generate(text)
    assert len(audio) > 0
    assert audio.dtype.name == "float32"

    out_wav = tmp_path / "test.wav"
    saved = tts.synthesize(text, out_wav)
    assert saved.exists()
    assert saved.stat().st_size > 0


def test_tts_paradee_thai_model():
    assert DEFAULT_MODEL == "paradee_thai"
    assert "paradee_thai" in AVAILABLE_MODELS
    assert "int8_model" in AVAILABLE_MODELS["paradee_thai"]
    assert "paradee_thai_int8.onnx" in AVAILABLE_MODELS["paradee_thai"]["int8_model"]

    tts = TTS(model="paradee_thai")
    assert tts.model_name == "paradee_thai"
    audio = tts("สวัสดีค่ะ")
    assert len(audio) > 0
    assert audio.dtype.name == "float32"


def test_tts_text_to_phonemes():
    tts = TTS()
    phonemes = tts.text_to_phonemes("สวัสดี")
    assert len(phonemes) > 0
    assert isinstance(phonemes, str)
