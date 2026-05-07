import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from nextjs.api import app
    return TestClient(app)


def test_get_patient(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "my_info.json").write_text(json.dumps({"name": "Aaron"}))
    response = client.get("/patient")
    assert response.status_code == 200
    assert response.json()["name"] == "Aaron"


def test_get_patient_missing_file(client, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    response = client.get("/patient")
    assert response.status_code == 500


def test_transcribe(client):
    mock_segment = MagicMock()
    def fake_export(buf, **kwargs):
        buf.write(b"fake_wav_bytes")
    mock_segment.export.side_effect = fake_export

    with patch("nextjs.api.AudioSegment.from_file", return_value=mock_segment), \
         patch("nextjs.api.transcribe_audio", return_value="patient had a good day"):
        response = client.post(
            "/transcribe",
            content=b"fake audio",
            headers={"Content-Type": "application/octet-stream"},
        )

    assert response.status_code == 200
    assert response.json()["transcript"] == "patient had a good day"


def test_transcribe_failure(client):
    with patch("nextjs.api.AudioSegment.from_file", side_effect=Exception("bad audio")):
        response = client.post(
            "/transcribe",
            content=b"bad",
            headers={"Content-Type": "application/octet-stream"},
        )
    assert response.status_code == 422


def test_summarize(client):
    fake_result = {"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False}
    with patch("nextjs.api.summarize_report", return_value=fake_result):
        response = client.post(
            "/summarize",
            json={"patient_name": "Aaron", "transcript": "hello", "notes": ""},
        )
    assert response.status_code == 200
    assert response.json()["mood"] == "calm"


def test_summarize_empty_inputs(client):
    with patch("nextjs.api.summarize_report", side_effect=ValueError("At least one")):
        response = client.post(
            "/summarize",
            json={"patient_name": "Aaron", "transcript": "", "notes": ""},
        )
    assert response.status_code == 422


def test_create_report(client):
    with patch("nextjs.api.save_report"):
        response = client.post(
            "/reports",
            json={"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False},
        )
    assert response.status_code == 200
    assert "date" in response.json()


def test_get_reports(client):
    with patch("nextjs.api.list_report_dates", return_value=["2026-05-07", "2026-05-06"]):
        response = client.get("/reports")
    assert response.status_code == 200
    assert response.json()["dates"] == ["2026-05-07", "2026-05-06"]


def test_get_report(client):
    fake = {"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False, "timestamp": "2026-05-07T10:00:00"}
    with patch("nextjs.api.load_report", return_value=fake):
        response = client.get("/reports/2026-05-07")
    assert response.status_code == 200
    assert response.json()["mood"] == "calm"


def test_get_report_not_found(client):
    with patch("nextjs.api.load_report", return_value=None):
        response = client.get("/reports/1900-01-01")
    assert response.status_code == 404
