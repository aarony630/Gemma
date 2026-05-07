import json
import streamlit as st
from report import transcribe_audio, summarize_report, save_report


def _load_patient_name() -> str:
    with open("my_info.json") as f:
        return json.load(f)["name"]


st.title("Caregiver Report")
patient_name = _load_patient_name()

audio = st.audio_input("Record voice notes")
notes = st.text_area("Written notes (optional)")

can_submit = audio is not None or bool(notes.strip())

if st.button("Submit Report", disabled=not can_submit):
    with st.spinner("Processing report..."):
        transcript = ""
        if audio is not None:
            try:
                transcript = transcribe_audio(audio.read())
            except Exception:
                st.warning("Could not transcribe audio — using written notes only.")
        result = summarize_report(patient_name, transcript, notes.strip())
        save_report(result)
    st.success("Report submitted.")
