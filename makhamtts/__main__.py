"""CLI for MakHamTTS: python -m makhamtts "สวัสดีครับ" -o out.wav"""

import argparse
import sys
from pathlib import Path

from makhamtts.tts import TTS, AVAILABLE_MODELS, DEFAULT_MODEL


def main():
    parser = argparse.ArgumentParser(
        prog="makhamtts",
        description="Speak Thai text with MakHamTTS (Paradee ONNX) and save a WAV file.",
    )
    parser.add_argument("text", nargs="?", help="Thai text to speak (reads stdin if omitted)")
    parser.add_argument("-o", "--out", default="out.wav", help="Output WAV path (default: out.wav)")
    parser.add_argument(
        "-m",
        "--model",
        default=DEFAULT_MODEL,
        choices=list(AVAILABLE_MODELS.keys()),
        help=f"Model preset to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier (default: 1.0)")
    parser.add_argument("--fp32", action="store_true", help="Use full-precision FP32 model instead of INT8")
    parser.add_argument("--model-path", default=None, help="Custom local path to ONNX model")
    parser.add_argument("--config-path", default=None, help="Custom local path to config.json")
    args = parser.parse_args()

    text = args.text if args.text is not None else sys.stdin.read().strip()
    if not text:
        parser.error("No text provided.")

    tts = TTS(
        model_path=args.model_path,
        config_path=args.config_path,
        model=args.model,
        quantized=not args.fp32,
        speed=args.speed,
    )
    out_file = tts.synthesize(text, args.out)
    print(f"Generated audio saved to {out_file}")


if __name__ == "__main__":
    main()
