import json
import pytest
from unittest.mock import patch, MagicMock


def _make_mock_pdf(text: str):
    mock_page = MagicMock()
    mock_page.extract_text.return_value = text
    mock_pdf = MagicMock()
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)
    mock_pdf.pages = [mock_page]
    return mock_pdf


def test_parse_prescription_returns_medication_list():
    from prescriptions import parse_prescription

    fake_meds = [{"name": "Lisinopril", "dosage": "10mg once daily",
                  "instructions": "Take in the morning", "side_effects": ["dizziness"]}]
    fake_response = MagicMock()
    fake_response.text = json.dumps(fake_meds)
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = fake_response

    with patch("prescriptions.pdfplumber.open", return_value=_make_mock_pdf("Lisinopril 10mg")), \
         patch("prescriptions.genai.Client", return_value=mock_client), \
         patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}):
        result = parse_prescription(b"fake pdf bytes")

    assert len(result) == 1
    assert result[0]["name"] == "Lisinopril"


def test_parse_prescription_handles_markdown_fences():
    from prescriptions import parse_prescription

    fake_meds = [{"name": "Metformin", "dosage": "500mg twice daily",
                  "instructions": "Take with food", "side_effects": ["nausea"]}]
    fake_response = MagicMock()
    fake_response.text = f"```json\n{json.dumps(fake_meds)}\n```"
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = fake_response

    with patch("prescriptions.pdfplumber.open", return_value=_make_mock_pdf("Metformin 500mg")), \
         patch("prescriptions.genai.Client", return_value=mock_client), \
         patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}):
        result = parse_prescription(b"fake pdf bytes")

    assert result[0]["name"] == "Metformin"


def test_parse_prescription_raises_on_empty_pdf():
    from prescriptions import parse_prescription

    with patch("prescriptions.pdfplumber.open", return_value=_make_mock_pdf("")):
        with pytest.raises(ValueError, match="Could not extract text"):
            parse_prescription(b"empty pdf")


def test_save_prescription_inserts_row():
    from prescriptions import save_prescription

    expected_row = {"id": "uuid-123", "patient_id": "aaron",
                    "source": "upload", "medications": [], "uploaded_at": "2026-05-07T10:00:00"}
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [expected_row]

    with patch("prescriptions._get_client", return_value=mock_supabase):
        result = save_prescription([], "upload")

    assert result["id"] == "uuid-123"
    mock_supabase.table.assert_called_with("prescriptions")


def test_list_prescriptions_returns_rows():
    from prescriptions import list_prescriptions

    mock_data = [
        {"id": "uuid-1", "uploaded_at": "2026-05-07", "source": "upload", "medications": []},
        {"id": "uuid-2", "uploaded_at": "2026-05-06", "source": "simulated_epic", "medications": []},
    ]
    mock_supabase = MagicMock()
    (mock_supabase.table.return_value.select.return_value
     .eq.return_value.order.return_value.execute.return_value.data) = mock_data

    with patch("prescriptions._get_client", return_value=mock_supabase):
        result = list_prescriptions()

    assert len(result) == 2
    assert result[0]["id"] == "uuid-1"
