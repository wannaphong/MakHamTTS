import os
os.environ["CUDA_VISIBLE_DEVICES"]="0"

import os
import shutil
import torch
import warnings
from speechbrain.inference.speaker import SpeakerRecognition
from tqdm.auto import tqdm

# Suppress the PyTorch FutureWarnings to keep your console clean
warnings.filterwarnings("ignore", category=FutureWarning)

# --- Configuration ---
root_dir = "raw_sound"
filter_dir = "filter_dir"
ref_audio = "out2.wav"
custom_threshold = 0.25 

# --- Setup ---
os.makedirs(filter_dir, exist_ok=True)

print("Loading Speaker Verification Model (ECAPA-TDNN)...")
verification = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", 
    savedir="pretrained_models/spkrec-ecapa-voxceleb",
    run_opts={"device": "cuda"} 
)

generated_files = [f for f in os.listdir(root_dir) if f.endswith(".wav")]
print(f"Found {len(generated_files)} files in '{root_dir}'. Starting filtering process...")

passed_count = 0
failed_count = 0
broken_count = 0 # To track empty/corrupted files

# --- Filtering Loop ---
for file in tqdm(generated_files):
    gen_audio_path = os.path.join(root_dir, file)
    
    # 1. Skip files that are essentially empty (a standard WAV header is 44 bytes)
    if os.path.getsize(gen_audio_path) <= 44:
        failed_count += 1
        broken_count += 1
        continue
    
    # 2. Try-Except block to catch any PyTorch/Audio loading errors
    try:
        score, prediction = verification.verify_files(ref_audio, gen_audio_path)
        similarity_score = score.item()
        
        if similarity_score >= custom_threshold:
            dest_path = os.path.join(filter_dir, file)
            shutil.copy2(gen_audio_path, dest_path) 
            passed_count += 1
        else:
            failed_count += 1
            
    except RuntimeError:
        # Catches the specific "tensor of 0 elements" or resampling errors
        failed_count += 1
        broken_count += 1
    except Exception:
        # Catches any other random errors so your 58,000 loop doesn't die halfway
        failed_count += 1
        broken_count += 1

# --- Summary ---
print("\n--- FILTERING COMPLETE ---")
print(f"Target Directory: ./{filter_dir}/")
print(f"Total Files Checked: {len(generated_files)}")
print(f"✅ Passed & Copied: {passed_count}")
print(f"❌ Failed (Doesn't match): {failed_count - broken_count}")
print(f"⚠️  Failed (Empty/Broken files): {broken_count}")