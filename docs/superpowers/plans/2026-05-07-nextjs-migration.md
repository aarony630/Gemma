# Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Streamlit frontend with a mobile-first Next.js app backed by a FastAPI server that wraps the existing `report.py` module.

**Architecture:** `nextjs/api.py` is a FastAPI server exposing 6 endpoints that delegate to `report.py` (unchanged). A Next.js 14 app in `nextjs/next-app/` provides the mobile-first UI. Both run locally; the Next.js frontend calls the FastAPI backend via `NEXT_PUBLIC_API_URL`.

**Tech Stack:** Python 3.11, FastAPI, uvicorn, pydub (audio conversion), httpx (test client), Next.js 14 (App Router), TypeScript, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `requirements.txt` | Modify | Add fastapi, uvicorn[standard], python-multipart, pydub, httpx |
| `nextjs/api.py` | Create | FastAPI server — 6 endpoints wrapping report.py |
| `tests/test_api.py` | Create | Unit tests for all 6 FastAPI endpoints |
| `nextjs/next-app/` | Create | Next.js 14 app (scaffolded via create-next-app) |
| `nextjs/next-app/lib/api.ts` | Create | Typed fetch wrappers for all 6 endpoints |
| `nextjs/next-app/app/layout.tsx` | Modify | Root layout — mobile viewport, Tailwind |
| `nextjs/next-app/app/page.tsx` | Create | Home page — two large tap buttons |
| `nextjs/next-app/app/caregiver/page.tsx` | Create | Caregiver: record audio + notes + submit |
| `nextjs/next-app/app/family/page.tsx` | Create | Family: report viewer + auto-refresh |

`report.py`, `my_info.json`, and `streamlit/` are **not modified**.

---

### Task 1: Install Python dependencies

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Update requirements.txt**

Replace the current content with:

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
```

- [ ] **Step 2: Install dependencies**

Run from project root:
```powershell
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 3: Install ffmpeg (required by pydub for WebM→WAV conversion)**

Run:
```powershell
winget install ffmpeg
```

Then open a **new** PowerShell window and verify:
```powershell
ffmpeg -version
```

Expected: prints `ffmpeg version ...`

- [ ] **Step 4: Verify imports**

```powershell
python -c "import fastapi; import pydub; import httpx; print('ok')"
```

Expected: `ok`

- [ ] **Step 5: Commit**

```
git add requirements.txt
git commit -m "chore: add FastAPI, pydub, httpx dependencies"
```

---

### Task 2: Implement FastAPI server

**Files:**
- Create: `nextjs/api.py`
- Create: `tests/test_api.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_api.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
python -m pytest tests/test_api.py -v
```

Expected: `ModuleNotFoundError: No module named 'nextjs.api'`

- [ ] **Step 3: Create nextjs/api.py**

```python
import io
import json
from datetime import date

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydub import AudioSegment

from report import (
    load_report,
    list_report_dates,
    save_report,
    summarize_report,
    transcribe_audio,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/patient")
def get_patient():
    try:
        with open("my_info.json", encoding="utf-8") as f:
            return {"name": json.load(f)["name"]}
    except (FileNotFoundError, KeyError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe(request: Request):
    audio_bytes = await request.body()
    try:
        segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
        wav_buffer = io.BytesIO()
        segment.export(wav_buffer, format="wav")
        transcript = transcribe_audio(wav_buffer.getvalue())
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


class SummarizeRequest(BaseModel):
    patient_name: str
    transcript: str
    notes: str


@app.post("/summarize")
def summarize(req: SummarizeRequest):
    try:
        return summarize_report(req.patient_name, req.transcript, req.notes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReportBody(BaseModel):
    summary: str
    mood: str
    medications_noted: list[str]
    urgent: bool


@app.post("/reports")
def create_report(body: ReportBody):
    save_report(body.model_dump())
    return {"date": date.today().isoformat()}


@app.get("/reports")
def get_reports():
    return {"dates": list_report_dates()}


@app.get("/reports/{report_date}")
def get_report(report_date: str):
    report = load_report(report_date)
    if report is None:
        raise HTTPException(status_code=404, detail="No report for this date")
    return report
```

Also create `nextjs/__init__.py` (empty, makes `nextjs` a package):

```powershell
New-Item -ItemType File nextjs\__init__.py
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
python -m pytest tests/test_api.py -v
```

Expected: 10 tests pass.

- [ ] **Step 5: Verify server starts**

```powershell
uvicorn nextjs.api:app --port 8000
```

Expected: `Uvicorn running on http://127.0.0.1:8000`. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```
git add nextjs/api.py nextjs/__init__.py tests/test_api.py
git commit -m "feat: add FastAPI server wrapping report.py"
```

---

### Task 3: Scaffold Next.js app

**Files:**
- Create: `nextjs/next-app/` (scaffolded by create-next-app)

- [ ] **Step 1: Scaffold the Next.js app**

```powershell
cd nextjs
npx create-next-app@latest next-app --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*"
cd ..
```

When prompted, accept all defaults.

- [ ] **Step 2: Create .env.local for API URL**

Create `nextjs/next-app/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For Android access, change `localhost` to your PC's local IP (e.g., `192.168.1.x`).

- [ ] **Step 3: Verify app starts**

```powershell
cd nextjs\next-app
npm run dev
```

Expected: `ready on http://localhost:3000`. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```
git add nextjs/next-app
git commit -m "chore: scaffold Next.js app with Tailwind"
```

---

### Task 4: Implement API client

**Files:**
- Create: `nextjs/next-app/lib/api.ts`

- [ ] **Step 1: Create nextjs/next-app/lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => d.detail)
      .catch(() => res.statusText);
    throw new ApiError(res.status, String(detail));
  }
  return res.json() as Promise<T>;
}

export interface Report {
  summary: string;
  mood: string;
  medications_noted: string[];
  urgent: boolean;
  timestamp?: string;
}

export const api = {
  getPatient: () => request<{ name: string }>("/patient"),

  transcribe: (audio: Blob) =>
    request<{ transcript: string }>("/transcribe", {
      method: "POST",
      body: audio,
      headers: { "Content-Type": "application/octet-stream" },
    }),

  summarize: (patient_name: string, transcript: string, notes: string) =>
    request<Report>("/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_name, transcript, notes }),
    }),

  saveReport: (report: Omit<Report, "timestamp">) =>
    request<{ date: string }>("/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    }),

  listReports: () => request<{ dates: string[] }>("/reports"),

  getReport: (date: string) => request<Report>(`/reports/${date}`),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
cd nextjs\next-app
npx tsc --noEmit
cd ..\..
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add nextjs/next-app/lib/api.ts
git commit -m "feat: add typed API client for FastAPI backend"
```

---

### Task 5: Implement home page

**Files:**
- Modify: `nextjs/next-app/app/page.tsx`

- [ ] **Step 1: Replace nextjs/next-app/app/page.tsx**

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
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update layout.tsx to set mobile viewport title**

Replace `nextjs/next-app/app/layout.tsx` content with:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Assistant",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify app runs and home page shows two buttons**

```powershell
cd nextjs\next-app && npm run dev
```

Open `http://localhost:3000` — verify two large buttons appear. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```
git add nextjs/next-app/app/page.tsx nextjs/next-app/app/layout.tsx
git commit -m "feat: add home page with caregiver/family nav"
```

---

### Task 6: Implement caregiver page

**Files:**
- Create: `nextjs/next-app/app/caregiver/page.tsx`

- [ ] **Step 1: Create nextjs/next-app/app/caregiver/page.tsx**

```tsx
"use client";

import { useState, useRef } from "react";
import { api, ApiError } from "@/lib/api";

type State = "idle" | "recording" | "transcribing" | "submitting" | "done";

export default function CaregiverPage() {
  const [state, setState] = useState<State>("idle");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [transcribeWarning, setTranscribeWarning] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const busy = state === "recording" || state === "transcribing" || state === "submitting";
  const canSubmit = (transcript.trim() !== "" || notes.trim() !== "") && !busy;

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = handleRecordingStop;
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("Microphone access denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setState("transcribing");
  }

  async function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    try {
      const { transcript: t } = await api.transcribe(blob);
      setTranscript(t);
      setTranscribeWarning("");
    } catch {
      setTranscribeWarning(
        "Could not transcribe audio — add written notes to continue."
      );
    }
    setState("idle");
  }

  async function handleSubmit() {
    setState("submitting");
    setError("");
    try {
      const { name } = await api.getPatient();
      const result = await api.summarize(name, transcript, notes.trim());
      await api.saveReport(result);
      setState("done");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate report.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
        <p className="text-green-600 text-2xl font-bold">Report submitted!</p>
        <button
          onClick={() => {
            setState("idle");
            setTranscript("");
            setNotes("");
            setError("");
          }}
          className="bg-blue-600 text-white py-4 px-10 rounded-2xl text-lg font-semibold"
        >
          Submit another
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Caregiver Report</h1>

      <div className="flex flex-col gap-2">
        <label className="font-semibold text-gray-700">Voice Notes</label>
        {state === "recording" ? (
          <button
            onClick={stopRecording}
            className="bg-red-500 text-white py-4 rounded-2xl text-lg font-semibold"
          >
            ■ Stop Recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={busy}
            className="bg-blue-600 text-white py-4 rounded-2xl text-lg font-semibold disabled:opacity-50"
          >
            {state === "transcribing" ? "Transcribing..." : "● Record"}
          </button>
        )}
        {transcribeWarning && (
          <p className="text-yellow-600 text-sm">{transcribeWarning}</p>
        )}
        {transcript && (
          <p className="bg-gray-100 rounded-xl p-3 text-gray-700 text-sm">
            {transcript}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-semibold text-gray-700">
          Written Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          disabled={busy}
          placeholder="Type notes here..."
          className="border border-gray-300 rounded-xl p-3 text-gray-800 resize-none disabled:opacity-50"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="bg-blue-600 text-white py-4 rounded-2xl text-lg font-semibold disabled:opacity-40"
      >
        {state === "submitting" ? "Submitting..." : "Submit Report"}
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Manually test the caregiver page**

Start both servers:

```powershell
# Terminal 1
uvicorn nextjs.api:app --reload --port 8000

# Terminal 2
cd nextjs\next-app && npm run dev
```

1. Open `http://localhost:3000/caregiver`
2. Type a note and click Submit Report
3. Verify "Report submitted!" screen appears
4. Verify `report_<today>.json` was created in the project root

- [ ] **Step 3: Commit**

```
git add nextjs/next-app/app/caregiver/
git commit -m "feat: add caregiver page with audio recording and report submission"
```

---

### Task 7: Implement family page

**Files:**
- Create: `nextjs/next-app/app/family/page.tsx`

- [ ] **Step 1: Create nextjs/next-app/app/family/page.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Report } from "@/lib/api";

export default function FamilyPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    try {
      setReport(await api.getReport(date));
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDates = useCallback(async () => {
    const { dates: d } = await api.listReports();
    setDates(d);
    if (d.length > 0) {
      setSelected((prev) => prev || d[0]);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDates();
    const interval = setInterval(() => {
      fetchDates();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDates]);

  useEffect(() => {
    if (selected) fetchReport(selected);
  }, [selected, fetchReport]);

  if (!dates.length && !loading) {
    return (
      <main className="flex items-center justify-center min-h-screen p-8">
        <p className="text-gray-500 text-lg text-center">
          No reports submitted yet.
          <br />
          <span className="text-sm">Checking every 30 seconds…</span>
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Family Report</h1>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border border-gray-300 rounded-xl p-3 text-gray-800 bg-white"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading…</p>
      ) : report ? (
        <div className="flex flex-col gap-4">
          {report.urgent && (
            <div className="bg-red-100 border border-red-400 text-red-700 rounded-xl p-4 font-semibold text-center">
              Urgent: Please contact the caregiver
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-semibold text-gray-600 mb-2 text-sm uppercase tracking-wide">
              Summary
            </h2>
            <p className="text-gray-800 leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Mood</div>
              <div className="font-semibold text-gray-800 text-sm">
                {report.mood || "—"}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Medications</div>
              <div className="font-semibold text-gray-800 text-sm">
                {report.medications_noted?.length
                  ? report.medications_noted.join(", ")
                  : "None"}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div
                className={`font-semibold text-sm ${
                  report.urgent ? "text-red-600" : "text-green-600"
                }`}
              >
                {report.urgent ? "Urgent" : "All Good"}
              </div>
            </div>
          </div>

          {report.timestamp && (
            <p className="text-xs text-gray-400 text-right">
              Submitted: {report.timestamp}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">
          No report for this date.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Manually test the family page**

With both servers running:

1. Open `http://localhost:3000/family`
2. Verify today's report is displayed with summary, mood, medications, status
3. Change date in dropdown — verify it loads that report
4. Edit `report_<today>.json`, set `"urgent": true`, wait 30s or refresh — verify red banner appears

- [ ] **Step 3: Test on Android**

1. Find your PC's local IP: `ipconfig` → look for IPv4 Address (e.g., `192.168.1.50`)
2. Update `nextjs/next-app/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://192.168.1.50:8000
   ```
3. Restart Next.js: `npm run dev -- --hostname 0.0.0.0`
4. Open `http://192.168.1.50:3000` on Android browser
5. Verify both pages work on mobile

- [ ] **Step 4: Commit**

```
git add nextjs/next-app/app/family/
git commit -m "feat: add family report page with date selector and auto-refresh"
```
