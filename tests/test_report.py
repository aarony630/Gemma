import json
import os
import pytest
from datetime import date


@pytest.fixture(autouse=True)
def tmp_working_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)


def test_save_report_creates_file():
    from report import save_report
    save_report({"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False})
    assert os.path.exists(f"report_{date.today().isoformat()}.json")


def test_save_report_adds_timestamp():
    from report import save_report
    save_report({"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False})
    with open(f"report_{date.today().isoformat()}.json") as f:
        data = json.load(f)
    assert "timestamp" in data


def test_load_report_returns_data():
    from report import save_report, load_report
    save_report({"summary": "ok", "mood": "calm", "medications_noted": [], "urgent": False})
    result = load_report(date.today().isoformat())
    assert result["summary"] == "ok"


def test_load_report_returns_none_for_missing():
    from report import load_report
    assert load_report("1900-01-01") is None


def test_list_report_dates_returns_sorted_desc():
    from report import list_report_dates
    for d in ["2026-04-01", "2026-05-01"]:
        with open(f"report_{d}.json", "w") as f:
            json.dump({"summary": "x"}, f)
    assert list_report_dates() == ["2026-05-01", "2026-04-01"]
