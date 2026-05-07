# Next.js Migration Design

**Date:** 2026-05-06
**Goal:** Replace Streamlit frontend with a mobile-first Next.js app backed by a FastAPI server wrapping the existing `report.py` module.

---

## Architecture

```
Android browser
      │
      ▼
Next.js (port 3000)        FastAPI (port 8000)
  /caregiver    ──POST /transcribe──▶  transcribe_audio()
  /family       ──POST /summarize──▶   summarize_report()
                ──POST /reports──▶     save_report()
                ──GET  /reports──▶     list_report_dates()
                ──GET  /reports/{date}▶ load_report()
                                           │
                                      report.py (unchanged)
                                      report_*.json files
```

`report.py` is **not modified**. `api.py` is a thin FastAPI wrapper that imports from it.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `api.py` | Create | FastAPI server — 5 endpoints wrapping report.py |
| `next-app/` | Create | Next.js app root |
| `next-app/app/page.tsx` | Create | Home page — links to /caregiver and /family |
| `next-app/app/caregiver/page.tsx` | Create | Caregiver input: audio recorder + text area + submit |
| `next-app/app/family/page.tsx` | Create | Family view: report display + auto-refresh |
| `next-app/app/layout.tsx` | Create | Root layout with Tailwind, mobile viewport meta |
| `next-app/lib/api.ts` | Create | Typed fetch wrappers for all 6 API endpoints |

Streamlit files (`app.py`, `pages/`) are left in place but no longer the primary UI.

---

## API (`api.py`)

**Stack:** FastAPI + uvicorn. CORS enabled for `localhost:3000`.

### Endpoints

#### `GET /patient`
- **Response:** `{ "name": "Aaron" }` — reads `name` from `my_info.json`

#### `POST /transcribe`
- **Body:** raw audio bytes (`application/octet-stream`) — any format browser sends (WebM, OGG, WAV)
- **Server converts** to WAV using `pydub` before passing to `speech_recognition`
- **Response:** `{ "transcript": "..." }`
- **Error:** `{ "detail": "..." }` with HTTP 422 if transcription fails

#### `POST /summarize`
- **Body:** `{ "patient_name": str, "transcript": str, "notes": str }`
- **Response:** `{ "summary": str, "mood": str, "medications_noted": [str], "urgent": bool }`
- **Error:** HTTP 422 if both transcript and notes are empty; HTTP 500 for API/model errors

#### `POST /reports`
- **Body:** `{ "summary": str, "mood": str, "medications_noted": [str], "urgent": bool }`
- **Response:** `{ "date": "YYYY-MM-DD" }`

#### `GET /reports`
- **Response:** `{ "dates": ["YYYY-MM-DD", ...] }` sorted descending

#### `GET /reports/{date}`
- **Response:** full report dict including `timestamp`
- **Error:** HTTP 404 if no report for that date

---

## Next.js App

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS.

### `/` — Home
Two large tap-friendly buttons: "Caregiver" and "Family". Simple, works on a phone.

### `/caregiver` — Caregiver Page

1. Record button — uses browser `MediaRecorder` API to capture audio; shows waveform or recording timer while active
2. Stop button — sends audio blob to `POST /transcribe`; shows transcript in a read-only text box
3. Notes text area — optional typed notes
4. Submit button — enabled when transcript or notes are non-empty; calls `POST /summarize` then `POST /reports`
5. Loading state during API calls (spinner)
6. Success message on completion; error message if API fails

### `/family` — Family Page

1. Date selector — populated from `GET /reports`; defaults to most recent
2. Report card — summary text, mood badge, medications list, urgent banner (red) if flagged
3. Submitted timestamp at bottom
4. Auto-refresh every 30s via `setInterval` + re-fetch (no full page reload)
5. "No reports yet" empty state

### `lib/api.ts`

Typed fetch wrappers — one function per endpoint. All functions throw a typed `ApiError` on non-2xx responses so pages can catch and display cleanly.

---

## Data Flow

### Caregiver submits a report

```
User records audio
  → MediaRecorder → Blob
  → POST /transcribe (octet-stream)
  → { transcript }
  → user reviews transcript (read-only)
  → user types notes (optional)
  → POST /summarize { patient_name, transcript, notes }
  → { summary, mood, medications_noted, urgent }
  → POST /reports { summary, mood, medications_noted, urgent }
  → { date }
  → "Report submitted" confirmation
```

### Family views a report

```
GET /reports → { dates }
→ select date (default: first)
→ GET /reports/{date} → report dict
→ render report card
→ setInterval(30s) → re-fetch report + dates
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Transcription fails | Show warning, continue with notes only |
| Both transcript and notes empty | Submit button disabled (cannot happen) |
| Summarize API fails | Show error message, allow retry |
| No reports exist | Empty state on family page, polls every 30s |
| Report not found for date | "No report for this date" message |
| `GOOGLE_API_KEY` not set | FastAPI returns 500; frontend shows "Could not generate report" |

---

## Running Locally

```powershell
# Terminal 1 — Python API
pip install fastapi uvicorn python-multipart pydub
# Also requires ffmpeg installed: winget install ffmpeg
uvicorn api:app --reload --port 8000

# Terminal 2 — Next.js
cd next-app
npm install
npm run dev   # http://localhost:3000
```

Android access: open `http://<PC-local-IP>:3000` in mobile browser. API calls from Next.js go to `http://<PC-local-IP>:8000` — configure via `NEXT_PUBLIC_API_URL` env var.

---

## Out of Scope

- Authentication
- Database (JSON files remain)
- Deployment beyond local network
- Removing the existing Streamlit pages
