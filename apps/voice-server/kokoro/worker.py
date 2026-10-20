"""Offline speech worker. Only --download may contact model hosts."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
os.environ['HF_HOME'] = str(ROOT / '.local-voices' / 'huggingface')
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
DOWNLOAD = '--download' in sys.argv
if not DOWNLOAD:
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'

import base64
import io
import json
import re
import contextlib

# Keep model diagnostics out of the JSON transport and never log dialogue.
from loguru import logger
logger.remove()
import numpy as np
import soundfile as sf
import torch
import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path())
from kokoro import KPipeline

torch.set_num_threads(4)
VOICE_NAMES = {
    'bm_george': ('George', 'Bold, grounded therapist'),
    'af_heart': ('Heart', 'Warm and expressive'),
    'af_bella': ('Bella', 'Bright and confident'),
    'af_nicole': ('Nicole', 'Soft and conspiratorial'),
    'af_sarah': ('Sarah', 'Clear and composed'),
    'af_sky': ('Sky', 'Light and playful'),
    'am_fenrir': ('Fenrir', 'Strong and dramatic'),
    'am_michael': ('Michael', 'Measured and direct'),
    'am_puck': ('Puck', 'Lively and mischievous'),
    'bf_emma': ('Emma', 'Poised and articulate'),
    'bf_isabella': ('Isabella', 'Calm and polished'),
    'bm_fable': ('Fable', 'Storyteller'),
    'bm_lewis': ('Lewis', 'Dry and understated'),
}
# Kokoro has no emotion-tag API. Direct delivery with sentence pacing and pauses.
PROFILES = {
    'neutral': (1.00, 0.12, 0.92), 'happy': (1.07, 0.10, 0.98),
    'smug': (0.94, 0.25, 0.91), 'angry': (1.08, 0.08, 1.00),
    'shocked': (1.10, 0.23, 0.98), 'crying': (0.88, 0.30, 0.83),
    'suspicious': (0.93, 0.26, 0.88), 'victorious': (1.06, 0.16, 1.00),
    'therapist': (0.94, 0.22, 1.00),
}

def emit(data):
    print(json.dumps(data), flush=True)

with contextlib.redirect_stdout(sys.stderr):
    american = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', device='cpu')
    british = KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M', model=american.model)
    pipelines = {'a': american, 'b': british}
    for voice in VOICE_NAMES:
        pipelines[voice[0]].load_voice(voice)

if DOWNLOAD:
    emit({'downloaded': True, 'voices': len(VOICE_NAMES)})
    sys.exit(0)

emit({'ready': True, 'voices': [
    {'id': voice, 'name': name, 'labels': {'style': style, 'engine': 'kokoro'}}
    for voice, (name, style) in VOICE_NAMES.items()
]})

def synthesize(data):
    voice = data.get('voiceId')
    if voice not in VOICE_NAMES:
        raise ValueError('Unknown voice')
    text = data.get('text', '')
    if not isinstance(text, str) or not 0 < len(text) <= 1000:
        raise ValueError('Invalid text')
    text = re.sub(r'\[[^\]]*\]', '', text).replace('\u2014', '.').strip()
    emotion = 'therapist' if data.get('therapist') is True else data.get('emotion', 'neutral')
    speed, pause, gain = PROFILES[emotion]
    sentences = re.split(r'(?<=[.!?])\s+', text)
    pieces = []
    with torch.inference_mode(), contextlib.redirect_stdout(sys.stderr):
        for i, sentence in enumerate(sentences):
            if not sentence.strip():
                continue
            # A measured final sentence for the host; a short punchline pause for dry delivery.
            rate = speed * (0.98 if i == len(sentences)-1 and emotion in ('therapist', 'smug', 'suspicious') else 1)
            for result in pipelines[voice[0]](sentence, voice=voice, speed=rate):
                audio = result.audio.detach().cpu().numpy()
                if audio.size:
                    pieces.append(audio)
            pieces.append(np.zeros(int(24000 * pause), dtype=np.float32))
    if not pieces or sum(len(p) for p in pieces) < 1000:
        raise ValueError('No speech generated')
    audio = np.concatenate(pieces)
    # Preserve the voice's pitch and timbre. Apply restrained gain with clipping protection.
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    target_rms = 0.11 if emotion == 'therapist' else 0.085 * gain
    audio = audio * min(target_rms / max(rms, 0.001), 0.98 / max(peak, 0.001))
    out = io.BytesIO()
    sf.write(out, audio, 24000, format='WAV', subtype='PCM_16')
    return base64.b64encode(out.getvalue()).decode('ascii')

for line in sys.stdin:
    request = {}
    try:
        if len(line) > 16384:
            raise ValueError('Request too large')
        request = json.loads(line)
        emit({'id': request['id'], 'audio': synthesize(request)})
    except Exception:
        emit({'id': request.get('id'), 'error': 'Local speech failed. Retry with a shorter line or another voice.'})
