# 1. Prepare two-voice dataset (all 94,275 verified pairs)
python3 train_two_voices.py --stage prepare

# 2. Run full training pipeline on GPU 0
EPOCHS_1ST=5 EPOCHS_2ND=3 GPU=0 bash train_two_voices.sh all | tee -a train.log

# 3. Quick smoke test (100 samples per voice, 1 epoch)
bash train_two_voices.sh smoke