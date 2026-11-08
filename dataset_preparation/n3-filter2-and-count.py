import os
import wave
import time
import datetime
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from tqdm import tqdm
import shutil

filter_dir="filter2_dir/"
os.makedirs(filter_dir, exist_ok=True)

def get_wav_duration(file_path):
    """Reads only the WAV header to instantly calculate duration in seconds."""
    try:
        with wave.open(str(file_path), 'rb') as w:
            frames = w.getnframes()
            rate = w.getframerate()
            n= frames / float(rate)
            if n>2:
                shutil.copy(str(file_path), filter_dir)
                return n
            return 0.0
    except Exception as e:
        # Catch corrupted or empty files without crashing the pool
        # print(f"Error reading {file_path}: {e}")
        return 0.0

def calculate_dataset_duration(dataset_dir, max_workers=None):
    print(f"Scanning directory: {dataset_dir} for .wav files...")
    
    # pathlib.rglob is fast and handles nested directories recursively
    wav_files = list(Path(dataset_dir).rglob("*.wav"))
    total_files = len(wav_files)
    
    if total_files == 0:
        print("No .wav files found!")
        return

    print(f"Found {total_files} files. Calculating total duration...")
    start_time = time.time()
    total_duration_seconds = 0.0

    # ProcessPoolExecutor bypasses the GIL to use multiple CPU cores.
    # We use executor.map with a chunksize to drastically reduce IPC overhead.
    chunk_size = max(1, total_files // (os.cpu_count() * 4))

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Map the function to the files
        results = executor.map(get_wav_duration, wav_files, chunksize=chunk_size)
        
        # Wrap the results in tqdm for a progress bar
        for duration in tqdm(results, total=total_files, desc="Processing"):
            total_duration_seconds += duration

    # Formatting the output
    calc_time = time.time() - start_time
    total_timedelta = datetime.timedelta(seconds=total_duration_seconds)
    
    # Calculate specific units
    hours = total_duration_seconds / 3600
    
    print("\n" + "="*40)
    print("🎯 DATASET DURATION SUMMARY")
    print("="*40)
    print(f"Total Files: {total_files:,}")
    print(f"Total Time (HH:MM:SS): {str(total_timedelta).split('.')[0]}")
    print(f"Total Time (Hours): {hours:.2f} hours")
    print(f"Processed in: {calc_time:.2f} seconds")
    print("="*40)

if __name__ == "__main__":
    # Point this to your directory (e.g., "cc_sound" from your previous script)
    DATASET_DIRECTORY = "filter_dir" 
    
    # Run the calculator
    calculate_dataset_duration(DATASET_DIRECTORY,max_workers=16)