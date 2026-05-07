import io
import json
import os
import re
from datetime import date, datetime

import speech_recognition as sr
from google import genai
from google.genai import types

_REPORT_PREFIX = "report_"


def _report_path(date_str: str) -> str:
    return f"{_REPORT_PREFIX}{date_str}.json"


def save_report(data: dict) -> None:
    data["timestamp"] = datetime.now().isoformat(timespec="seconds")
    with open(_report_path(date.today().isoformat()), "w") as f:
        json.dump(data, f, indent=2)


def load_report(date_str: str) -> dict | None:
    path = _report_path(date_str)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def list_report_dates() -> list[str]:
    files = [
        f for f in os.listdir(".")
        if f.startswith(_REPORT_PREFIX) and f.endswith(".json")
    ]
    return sorted([f[len(_REPORT_PREFIX):-5] for f in files], reverse=True)


def transcribe_audio(wav_bytes: bytes) -> str:
    recognizer = sr.Recognizer()
    with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
        audio = recognizer.record(source)
    return recognizer.recognize_google(audio)
