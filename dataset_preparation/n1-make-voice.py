import os
os.environ["CUDA_VISIBLE_DEVICES"]="0"

from omnivoice import OmniVoice
import soundfile as sf
import torch
from tqdm.auto import tqdm
import pickle
root_dir="raw_sound"
with open("cc.pkl", "rb") as f:
    loaded_data = pickle.load(f)

model = OmniVoice.from_pretrained(
    "k2-fsa/OmniVoice",
    device_map="cuda",
    dtype=torch.float16
)
# Apple Silicon users: use device_map="mps" instead

def make_voice(text, path):
    audio = model.generate(
        ref_text="สวัสดีครับ เรากำลังทดสอบระบบแปลงข้อความเป็นเสียงภาษาไทย เพื่อตรวจสอบความชัดเจนของการออกเสียงวรรณยุกต์ และจังหวะการพูดที่ดูเป็นธรรมชาติที่สุด",
        instruct="female, middle-aged",
        ref_audio="out2.wav",
        text=text,
        # speed=https://github.com/k2-fsa/OmniVoice/blob/master/docs/generation-parameters.md
    )
    sf.write(path, audio[0], 24000)

j=0
for i in tqdm(loaded_data):
    path=os.path.join(root_dir,str(j)+".wav")
    if not os.path.exists(path):
        make_voice(i, path)
    j+=1