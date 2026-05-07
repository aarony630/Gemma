# Medication Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/medications` page to the Next.js app where caregivers upload PDF prescriptions (parsed by Gemma 4) and family views current + past medication lists, backed by Supabase.

**Architecture:** `prescriptions.py` (project root, parallel to `report.py`) handles PDF parsing with pdfplumber, Gemma 4 extraction, and Supabase CRUD. Three new FastAPI endpoints in `nextjs/api.py` expose it. A new `/medications` Next.js page handles upload, Epic simulation, and display.

**Tech Stack:** Python 3.11, pdfplumber, supabase-py, google-genai (existing), FastAPI (existing), Next.js 14, TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `requirements.txt` | Modify | Add supabase, pdfplumber |
| `prescriptions.py` | Create | PATIENT_ID constant, Supabase client, parse_prescription, save_prescription, list_prescriptions, SIMULATED_EPIC_MEDS |
| `tests/test_prescriptions.py` | Create | Unit tests for prescriptions.py |
| `nextjs/api.py` | Modify | Add POST /prescriptions/upload, POST /prescriptions/sync, GET /prescriptions |
| `tests/test_api.py` | Modify | Add tests for 3 new endpoints |
| `nextjs/next-app/lib/api.ts` | Modify | Add Medication, Prescription types + 3 fetch wrappers |
| `nextjs/next-app/app/page.tsx` | Modify | Add Medications button to home page |
| `nextjs/next-app/app/medications/page.tsx` | Create | Upload UI, sync button, current + history display |

`report.py`, `streamlit/`, and existing JSON files are **not modified**.

---

### Task 1: Install Python dependencies

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add supabase and pdfplumber to requirements.txt**

Open `requirements.txt` and add two lines:
```
supabase
pdfplumber
```

Full file should now be:
```
google-genai
streamlit>=1.29.0
SpeechRecognition
fastapi
uvicorn[standard]
python-multipart
pydub
httpx
pytest
supabase
pdfplumber
```

- [ ] **Step 2: Install dependencies**

```powershell
pip install -r requirements.txt
```

Expected: installs without error.

- [ ] **Step 3: Verify imports**

```powershell
python -c "import supabase; import pdfplumber; print('ok')"
```

Expected: `ok`

- [ ] **Step 4: Verify .env has Supabase credentials**

```powershell
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(bool(os.environ.get('SUPABASE_URL')))"
```

If this prints `False`, add `python-dotenv` to requirements.txt and re-run `pip install -r requirements.txt`.

Note: when running uvicorn manually, load the .env first:
```powershell
Get-Content .env | ForEach-Object { $k,$v = $_ -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v,'Process') }
```

- [ ] **Step 5: Commit**

```
git add requirements.txt
git commit -m "chore: add supabase and pdfplumber dependencies"
```

---

### Task 2: Implement prescriptions.py

**Files:**
- Create: `prescriptions.py`
- Create: `tests/test_prescriptions.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_prescriptions.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
python -m pytest tests/test_prescriptions.py -v
```

Expected: `ModuleNotFoundError: No module named 'prescriptions'`

- [ ] **Step 3: Create prescriptions.py**

```python
import io
import json
import os
import re

import pdfplumber
from google import genai
from supabase import create_client, Client

PATIENT_ID = "aaron"

SIMULATED_EPIC_MEDS = [
    {
        "name": "Lisinopril",
        "dosage": "10mg once daily",
        "instructions": "Take in the morning. Avoid potassium supplements.",
        "side_effects": ["dizziness", "dry cough", "elevated potassium"],
    },
    {
        "name": "Metformin",
        "dosage": "500mg twice daily",
        "instructions": "Take with meals to reduce stomach upset.",
        "side_effects": ["nausea", "diarrhea", "stomach upset"],
    },
    {
        "name": "Atorvastatin",
        "dosage": "20mg at bedtime",
        "instructions": "Take at the same time each night.",
        "side_effects": ["muscle pain", "liver enzyme changes", "headache"],
    },
]

_EXTRACTION_PROMPT = """\
Extract all medications from the following prescription text.

Return ONLY a JSON array with no extra text. Each object must have exactly these fields:
- "name": medication name (string)
- "dosage": dose and frequency (string)
- "instructions": how to take it (string)
- "side_effects": list of side effects (array of strings)

If a field is not mentioned, use an empty string or empty array.

Prescription text:
{text}"""

_supabase_client: Client | None = None


def _get_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )
    return _supabase_client


def parse_prescription(pdf_bytes: bytes) -> list[dict]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    if not text.strip():
        raise ValueError("Could not extract text from PDF")

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    response = client.models.generate_content(
        model="gemma-4-31b-it",
        contents=_EXTRACTION_PROMPT.format(text=text),
    )

    raw = response.text.strip()
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        raise ValueError(f"Could not parse medications from model response: {raw}")
    return json.loads(match.group())


def save_prescription(medications: list[dict], source: str) -> dict:
    result = (
        _get_client()
        .table("prescriptions")
        .insert({"patient_id": PATIENT_ID, "source": source, "medications": medications})
        .execute()
    )
    return result.data[0]


def list_prescriptions() -> list[dict]:
    result = (
        _get_client()
        .table("prescriptions")
        .select("*")
        .eq("patient_id", PATIENT_ID)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return result.data
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
python -m pytest tests/test_prescriptions.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```
git add prescriptions.py tests/test_prescriptions.py
git commit -m "feat: add prescriptions module with PDF parsing and Supabase storage"
```

---

### Task 3: Add prescription endpoints to FastAPI

**Files:**
- Modify: `nextjs/api.py`
- Modify: `tests/test_api.py`

- [ ] **Step 1: Append failing tests to tests/test_api.py**

Add these tests at the bottom of `tests/test_api.py`:

```python
def test_upload_prescription(client):
    fake_meds = [{"name": "Lisinopril", "dosage": "10mg", "instructions": "Daily", "side_effects": []}]
    fake_row = {"id": "uuid-123", "uploaded_at": "2026-05-07T10:00:00",
                "source": "upload", "medications": fake_meds, "patient_id": "aaron"}

    with patch("nextjs.api.parse_prescription", return_value=fake_meds), \
         patch("nextjs.api.save_prescription", return_value=fake_row):
        response = client.post(
            "/prescriptions/upload",
            content=b"fake pdf",
            headers={"Content-Type": "application/pdf"},
        )

    assert response.status_code == 200
    assert response.json()["id"] == "uuid-123"


def test_upload_prescription_parse_failure(client):
    with patch("nextjs.api.parse_prescription", side_effect=ValueError("Could not extract text")):
        response = client.post(
            "/prescriptions/upload",
            content=b"bad pdf",
            headers={"Content-Type": "application/pdf"},
        )
    assert response.status_code == 422


def test_sync_prescription(client):
    fake_row = {"id": "uuid-456", "uploaded_at": "2026-05-07T10:00:00",
                "source": "simulated_epic", "medications": [], "patient_id": "aaron"}

    with patch("nextjs.api.save_prescription", return_value=fake_row):
        response = client.post("/prescriptions/sync")

    assert response.status_code == 200
    assert response.json()["source"] == "simulated_epic"


def test_get_prescriptions_list(client):
    mock_data = [{"id": "uuid-1", "uploaded_at": "2026-05-07", "source": "upload",
                  "medications": [], "patient_id": "aaron"}]

    with patch("nextjs.api.list_prescriptions", return_value=mock_data):
        response = client.get("/prescriptions")

    assert response.status_code == 200
    assert len(response.json()["prescriptions"]) == 1
```

- [ ] **Step 2: Run new tests to verify they fail**

```powershell
python -m pytest tests/test_api.py::test_upload_prescription tests/test_api.py::test_sync_prescription tests/test_api.py::test_get_prescriptions_list -v
```

Expected: `AttributeError` — routes not defined yet.

- [ ] **Step 3: Add imports and endpoints to nextjs/api.py**

At the top of `nextjs/api.py`, add to the existing imports:

```python
from prescriptions import parse_prescription, save_prescription, list_prescriptions, SIMULATED_EPIC_MEDS
```

At the bottom of `nextjs/api.py`, append:

```python
@app.post("/prescriptions/upload")
async def upload_prescription(request: Request):
    pdf_bytes = await request.body()
    try:
        medications = parse_prescription(pdf_bytes)
        row = save_prescription(medications, "upload")
        return row
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/prescriptions/sync")
def sync_prescription():
    try:
        return save_prescription(SIMULATED_EPIC_MEDS, "simulated_epic")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/prescriptions")
def get_prescriptions():
    try:
        return {"prescriptions": list_prescriptions()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 4: Run all API tests**

```powershell
python -m pytest tests/test_api.py -v
```

Expected: all 14 tests pass (10 existing + 4 new).

- [ ] **Step 5: Commit**

```
git add nextjs/api.py tests/test_api.py
git commit -m "feat: add prescription upload, sync, and list endpoints"
```

---

### Task 4: Add types and fetch wrappers to lib/api.ts + home page link

**Files:**
- Modify: `nextjs/next-app/lib/api.ts`
- Modify: `nextjs/next-app/app/page.tsx`

- [ ] **Step 1: Add Medication and Prescription types to lib/api.ts**

After the `Report` interface in `nextjs/next-app/lib/api.ts`, add:

```typescript
export interface Medication {
  name: string;
  dosage: string;
  instructions: string;
  side_effects: string[];
}

export interface Prescription {
  id: string;
  patient_id: string;
  uploaded_at: string;
  source: "upload" | "simulated_epic";
  medications: Medication[];
}
```

- [ ] **Step 2: Add 3 fetch wrappers to the api object in lib/api.ts**

Inside the `api` object (after `getReport`), add:

```typescript
  uploadPrescription: (pdf: File) =>
    request<Prescription>("/prescriptions/upload", {
      method: "POST",
      body: pdf,
      headers: { "Content-Type": "application/pdf" },
    }),

  syncPrescription: () =>
    request<Prescription>("/prescriptions/sync", { method: "POST" }),

  listPrescriptions: () =>
    request<{ prescriptions: Prescription[] }>("/prescriptions"),
```

- [ ] **Step 3: Verify TypeScript compiles**

```powershell
cd nextjs\next-app; npx tsc --noEmit; cd ..\..
```

Expected: no errors.

- [ ] **Step 4: Add Medications button to home page**

Replace the contents of `nextjs/next-app/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800">Health Assistant</h1>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/caregiver"
          className="block text-center bg-blue-600 text-white text-xl font-semibold py-6 rounded-2xl shadow active:bg-blue-700"
        >
          Caregiver
        </Link>
        <Link
          href="/family"
          className="block text-center bg-green-600 text-white text-xl font-semibold py-6 rounded-2xl shadow active:bg-green-700"
        >
          Family
        </Link>
        <Link
          href="/medications"
          className="block text-center bg-purple-600 text-white text-xl font-semibold py-6 rounded-2xl shadow active:bg-purple-700"
        >
          Medications
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```
git add nextjs/next-app/lib/api.ts nextjs/next-app/app/page.tsx
git commit -m "feat: add prescription API client and medications nav link"
```

---

### Task 5: Implement medications page

**Files:**
- Create: `nextjs/next-app/app/medications/page.tsx`

- [ ] **Step 1: Create nextjs/next-app/app/medications/page.tsx**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { api, Prescription, Medication } from "@/lib/api";

export default function MedicationsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchPrescriptions() {
    try {
      const { prescriptions: p } = await api.listPrescriptions();
      setPrescriptions(p);
    } catch {
      setError("Could not load prescriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await api.uploadPrescription(file);
      await fetchPrescriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      await api.syncPrescription();
      await fetchPrescriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  const current = prescriptions[0] ?? null;
  const history = prescriptions.slice(1);

  return (
    <main className="flex flex-col gap-6 p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Medications</h1>

      <div className="flex gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || syncing}
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 text-sm"
        >
          {uploading ? "Uploading..." : "Upload Prescription"}
        </button>
        <button
          onClick={handleSync}
          disabled={uploading || syncing}
          className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 text-sm"
        >
          {syncing ? "Syncing..." : "Sync from Healthcare DB"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : current ? (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Current Prescription</h2>
              <SourceBadge source={current.source} />
            </div>
            <MedicationList medications={current.medications} />
            <p className="text-xs text-gray-400 mt-3">
              {new Date(current.uploaded_at).toLocaleDateString()}
            </p>
          </div>

          {history.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-semibold text-gray-700">History</h2>
              {history.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow">
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 text-sm">
                        {new Date(p.uploaded_at).toLocaleDateString()}
                      </span>
                      <SourceBadge source={p.source} />
                    </div>
                    <span className="text-gray-400 text-sm">
                      {expanded === p.id ? "▲" : "▼"}
                    </span>
                  </button>
                  {expanded === p.id && (
                    <div className="px-4 pb-4">
                      <MedicationList medications={p.medications} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No prescriptions yet.</p>
          <p className="text-sm">
            Upload a PDF or sync from the healthcare database.
          </p>
        </div>
      )}
    </main>
  );
}

function SourceBadge({ source }: { source: "upload" | "simulated_epic" }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        source === "simulated_epic"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {source === "simulated_epic" ? "Healthcare DB" : "Upload"}
    </span>
  );
}

function MedicationList({ medications }: { medications: Medication[] }) {
  if (!medications.length) {
    return <p className="text-gray-400 text-sm">No medications listed.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {medications.map((med, i) => (
        <div key={i} className="border-l-4 border-blue-400 pl-3">
          <div className="font-semibold text-gray-800">{med.name}</div>
          <div className="text-sm text-gray-600">{med.dosage}</div>
          {med.instructions && (
            <div className="text-sm text-gray-500 mt-1">{med.instructions}</div>
          )}
          {med.side_effects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {med.side_effects.map((se, j) => (
                <span
                  key={j}
                  className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full"
                >
                  {se}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manually test the medications page**

Start both servers (with .env loaded):

```powershell
# Terminal 1
Get-Content .env | ForEach-Object { $k,$v = $_ -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v,'Process') }
uvicorn nextjs.api:app --reload --port 8000

# Terminal 2
cd nextjs\next-app && npm run dev
```

1. Open `http://localhost:3000`
2. Verify purple "Medications" button appears on home page
3. Open `http://localhost:3000/medications`
4. Click "Sync from Healthcare DB" — verify 3 medications appear with side effect chips
5. Verify the entry is saved in Supabase (check Table Editor at supabase.com)
6. Upload a real prescription PDF — verify medications are extracted and displayed
7. Sync again — verify history accordion appears with the older entry

- [ ] **Step 3: Commit**

```
git add nextjs/next-app/app/medications/
git commit -m "feat: add medications page with PDF upload and Epic simulation"
```
