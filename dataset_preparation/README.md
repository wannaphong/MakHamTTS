# Som TTS dataset: Open Data Thai TTS (v1.0.0)

Som TTS dataset is a Open Data Thai TTS. It was created by open-weight TTS model that support Thai and use voice clone that voice was created by voice design system.

This repository collects scripts for creating Thai TTS dataset.

HuggingFace dataset: [https://huggingface.co/datasets/pythainlp/som_tts_dataset](https://huggingface.co/datasets/pythainlp/som_tts_dataset)

TTS Model that use this dataset: [https://github.com/awslabs/FastThaiG2P](https://github.com/awslabs/FastThaiG2P)


## Steps to creating dataset:

1. We was doing the voice design to creating new voice that don't exist. See voice-design.ipynb and give out2.wav file for doing dataset.
2. Cleaning text from many sources. See n0-clean-text.ipynb
3. Make voice dataset by using voice cloning to creating dataset. See n1-make-voice.py
4. Filter dataset. See n2-filter_dataset.py, n3-filter2-and-count.py and n4-clean-text.ipynb.
5. Upload to HuggingFace dataset. See up2hub.ipynb


We use OmniVoice weight that still be Apache license 2.0 to creating this dataset. [https://huggingface.co/wannaphong/OmniVoice](https://huggingface.co/wannaphong/OmniVoice)


**Don't forget clearing by ASR model before use the dataset because some voice are missing or isn't complete**

## Citation

> Phatthiyaphaibun, W. (2026). Som TTS dataset: Open Data Thai TTS (Version 1.0.0) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.21530909

See more: https://zenodo.org/records/21530909
