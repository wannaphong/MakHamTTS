# MakHam (มะขาม) - Thai Text-to-Speech (TTS) Suite

**MakHam (มะขาม)** is a high-performance open-source Thai Text-to-Speech (TTS) model family based on **Kokoro-82M** and **Paradee 1.1** distillation, supporting 5-tone Thai phonology and standalone single-voice ONNX deployment.

- Online demo: [https://github.wannaphong.com/MakHamTTS/webdemo/](https://github.wannaphong.com/MakHamTTS/webdemo/)
- **HuggingFace Model**: [pythainlp/MakHamTTS](https://huggingface.co/pythainlp/MakHamTTS)
- **HuggingFace Dataset**: [pythainlp/MakHamTTS-dataset](https://huggingface.co/datasets/pythainlp/MakHamTTS-dataset)

---

## Directory Overview

```
github/
├── text_dataset/            # Raw text corpora, verified utterance metadata, and training split manifests
│   ├── raw_text/            # Source Thai text corpora across domains
│   │   ├── call_center_conversations.txt
│   │   ├── everyday_conversations.txt
│   │   ├── en_th_code-switching.txt
│   │   ├── ja_th_code-switching.txt
│   │   ├── news.txt
│   │   ├── sentence-collector.txt
│   │   ├── thai_wiki.txt
│   │   ├── thsentences.txt
│   │   └── Wannaphong.txt
│   ├── metadata/            # Verified utterance CSV manifests with text, duration, and CER scores
│   │   ├── newvoice_female_data_ok.csv  (45,600+ entries)
│   │   └── newvoice_male_data_ok.csv    (48,600+ entries)
│   └── training_splits/     # Formatted StyleTTS2 / Kokoro training, validation, and OOD manifests
│       ├── train_list.txt   (89,563 training pairs)
│       ├── val_list.txt     (4,712 validation pairs)
│       └── OOD_texts.txt    (2,000 out-of-domain sentences)
│
├── dataset_preparation/     # Scripts & notebooks for audio/text curation & OmniVoice dataset generation
│   ├── create_voice_dataset.py
│   ├── extract_thai_wiki.py
│   ├── voice-design.ipynb
│   ├── n0-clean-text.ipynb
│   ├── n1-make-voice.py
│   ├── n2-filter_dataset.py
│   ├── n3-filter2-and-count.py
│   ├── n4-clean-text.ipynb
│   ├── old-n1-clean-text.ipynb
│   ├── up2hub.ipynb
│   ├── requirements.txt
│   └── README.md
│
├── kokoro_training/         # StyleTTS2 multi-voice MakHam Kokoro-82M training scripts & guides
│   ├── train_two_voices.py  # End-to-end pipeline (prepare, stage1, stage2, package, test)
│   ├── train_two_voices.sh  # Bash execution runner
│   └── TRAINING_TWO_VOICES.md
│
├── paradee_training/        # MakHam Paradee distillation & ONNX export suite
│   ├── train_thai_paradee.py   # Distills Kokoro teacher into MakHam single-voice student
│   ├── export_thai_paradee.py  # ONNX graph export & INT8 quantization
│   ├── README_model.md         # MakHam Paradee model specs & usage
│   ├── README.md               # Paradee training documentation
│   ├── pyproject.toml / uv.lock
│   └── scripts/                # Architecture definitions & training modules
│       ├── common.py
│       ├── discriminators.py
│       ├── eval_full.py
│       ├── export_paradee.py
│       ├── export_paradee_v1_1.py
│       ├── gen_teacher.py
│       ├── onnx_eval.py
│       ├── phase_lock.py
│       ├── quantize_student.py
│       ├── regen_audio.py
│       ├── rtf.py
│       ├── student.py
│       ├── student_decoder.py
│       ├── train_decoder.py
│       ├── train_text.py
│       ├── train_vhead.py
│       ├── utmos.py
│       ├── vh_ab.py
│       ├── vhead.py
│       └── wer.py
│
├── configs/                 # Model and vocabulary configurations
│   ├── thai_two_voices.yml  # StyleTTS2 training configuration
│   └── vocab_config.json    # 115-token Kokoro Thai vocab specification
│
├── inference_examples/      # Minimal inference test scripts
│   ├── infer_paradee.py     # Standalone MakHam Paradee ONNX inference
│   └── quick_commands.sh
│
└── logs/                    # Training and execution logs
    ├── train.log            # Full end-to-end execution log (excluded from Git repo via .gitignore)
    ├── train_stage1_two_voices.log
    ├── train_stage2_two_voices.log
    └── styleTTS2_train.log
```

---

## 1. Text Dataset (`text_dataset/`)
Hosted on HuggingFace: [pythainlp/MakHamTTS-dataset](https://huggingface.co/datasets/pythainlp/MakHamTTS-dataset)
- **Raw Text Corpora (`raw_text/`)**: Source texts collected from Common Voice sentence collector, Thai Wikipedia, conversational transcripts, code-switching logs, and news text.
- **Utterance Metadata (`metadata/`)**: CSV manifests for `newvoice_female` and `newvoice_male` filtered by audio integrity (>2.0s), speaker verification (ECAPA-TDNN), and Whisper CER.
- **Training Splits (`training_splits/`)**: Format-ready phoneme lists with audio paths, 5-tone phonetic transcriptions, and speaker IDs for Kokoro training (`train_list.txt`, `val_list.txt`, `OOD_texts.txt`).

## 2. Dataset Preparation (`dataset_preparation/`)
- `create_voice_dataset.py`: Full dataset generation runner with OmniVoice synthesis, ECAPA-TDNN speaker verification, audio duration trimming, and Whisper CER validation.
- `extract_thai_wiki.py`: Extracts clean Wikipedia articles and splits sentences.
- `n0-clean-text.ipynb` & `n4-clean-text.ipynb`: Text cleaning, deduplication, and tone normalization.
- `n1-make-voice.py`, `n2-filter_dataset.py`, `n3-filter2-and-count.py`: Utterance generation, length filtering, and statistics.

## 3. MakHam Kokoro-82M Multi-Voice Training (`kokoro_training/`)
- `train_two_voices.py`: Automated orchestration script supporting `prepare`, `stage1`, `stage2`, `package`, and `test`.
- `train_two_voices.sh`: Bash wrapper script with environment overrides.

## 4. MakHam Paradee Distillation & Export (`paradee_training/`)
Hosted on HuggingFace: [pythainlp/MakHamTTS](https://huggingface.co/pythainlp/MakHamTTS)
- `train_thai_paradee.py`: Distills teacher Kokoro (`kokoro_thai.pth` + female style vector) into single-voice Paradee 1.1 architecture (`TextStudent` 4.23M + `VDecoder` 3.65M, total ~7.88M parameters).
- `export_thai_paradee.py`: Bakes the female timbre directly into the ONNX graph with static/dynamic DFT bases, generating FP32 (~33 MB) and INT8 (~8 MB) models.
- `scripts/`: Implementation modules including student networks, discriminators, phase lock, and audio regeneration.

## 5. Execution Logs (`logs/`)
- `train_stage1_two_voices.log`: Stage 1 loss tracking.
- `train_stage2_two_voices.log`: Stage 2 adversarial fine-tuning tracking.
- `styleTTS2_train.log`: StyleTTS2 internal worker logs.
