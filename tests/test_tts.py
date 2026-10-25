import pytest
from makhamtts import TTS


def test_tts_initialization_and_synthesis(tmp_path):
    tts = TTS()
    text = "สวัสดีครับ ยินดีต้อนรับครับ"
    audio = tts.generate(text)
    assert len(audio) > 0
    assert audio.dtype.name == "float32"

    out_wav = tmp_path / "test.wav"
    saved = tts.synthesize(text, out_wav)
    assert saved.exists()
    assert saved.stat().st_size > 0
