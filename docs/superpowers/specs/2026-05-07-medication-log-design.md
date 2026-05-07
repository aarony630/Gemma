# Medication Log Design

**Date:** 2026-05-07
**Goal:** Add a `/medications` page to the Next.js app where caregivers upload PDF prescriptions (parsed by Gemma 4) and family members view current + historical medication lists, backed by Supabase.

---

## Architecture

```
Next.js /medications page
        │
        ├── POST /prescriptions/upload  ──▶ pdfplumber (extract text)
        │                                        ↓
        │                                   Gemma 4 (parse structured meds)
        │                                        ↓
        │                                   Supabase prescriptions table
        │
        ├── POST /prescriptions/sync    ──▶ fake Epic data → Supabase
        │
        └── GET  /prescriptions         ──▶ Supabase → list by patient_id
```

`prescriptions.py` is a new module (parallel to `report.py`). `api.py` gains 3 new endpoints. `report.py` and existing JSON files are **not modified**.

---

## Supabase Schema

### Table: `prescriptions`

```sql
CREATE TABLE prescriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   TEXT NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source       TEXT NOT NULL CHECK (source IN ('upload', 'simulated_epic')),
  medications  JSONB NOT NULL
);

CREATE INDEX ON prescriptions (patient_id, uploaded_at DESC);
```

### Medication object shape (inside `medications` JSONB array)

```json
{
  "name": "Lisinopril",
  "dosage": "10mg once daily",
  "instructions": "Take in the morning with water. Do not skip doses.",
  "side_effects": ["dizziness", "dry cough", "elevated potassium"]
}
```

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prescriptions.py` | Create | Supabase client, PDF parsing, Gemma 4 extraction, PATIENT_ID constant |
| `tests/test_prescriptions.py` | Create | Unit tests for prescriptions.py |
| `nextjs/api.py` | Modify | Add 3 new endpoints: upload, sync, list |
| `nextjs/next-app/lib/api.ts` | Modify | Add 3 typed fetch wrappers |
| `nextjs/next-app/app/medications/page.tsx` | Create | Medications page UI |

---

## `prescriptions.py`

### Constants

```python
PATIENT_ID = "aaron"  # swap to per-user lookup when scaling to 3 users
```

### `parse_prescription(pdf_bytes: bytes) -> list[dict]`

1. Extract text from PDF using `pdfplumber`
2. Send text to Gemma 4 with a structured extraction prompt
3. Parse JSON response → return list of medication dicts

Each dict: `{name: str, dosage: str, instructions: str, side_effects: list[str]}`

Raises `ValueError` if Gemma returns unparseable output.

### `save_prescription(medications: list[dict], source: str) -> dict`

Insert a row into Supabase `prescriptions` table for `PATIENT_ID`. Returns the inserted row including `id` and `uploaded_at`.

### `list_prescriptions() -> list[dict]`

Query Supabase for all rows where `patient_id == PATIENT_ID`, ordered by `uploaded_at DESC`. Returns list of full row dicts.

### Supabase client

Created once at module level using `SUPABASE_URL` and `SUPABASE_KEY` environment variables.

---

## FastAPI Endpoints (additions to `nextjs/api.py`)

### `POST /prescriptions/upload`
- **Body:** raw PDF bytes (`application/pdf`)
- **Flow:** `parse_prescription(bytes)` → `save_prescription(meds, "upload")`
- **Response:** `{ "id": uuid, "uploaded_at": str, "medications": [...] }`
- **Errors:** HTTP 422 if PDF has no extractable text or Gemma parse fails

### `POST /prescriptions/sync`
- **Body:** none
- **Flow:** generate realistic fake prescription from `my_info.json` patient name → `save_prescription(fake_meds, "simulated_epic")`
- **Response:** same shape as upload response
- **Note:** fake data is a hardcoded realistic sample (2-3 common medications)

### `GET /prescriptions`
- **Response:** `{ "prescriptions": [ { id, uploaded_at, source, medications: [...] }, ... ] }` sorted newest first

---

## Next.js `/medications` Page

### Layout

```
[Upload PDF]  [Sync from Healthcare Database]

─── Current Prescription (source badge) ────────────
  Lisinopril · 10mg once daily
  Instructions: Take in the morning...
  Side effects: dizziness, dry cough

─── History ─────────────────────────────────────────
  2026-05-01  [upload]   ▶ (expand)
  2026-04-15  [epic]     ▶ (expand)
```

### Behaviors

- **Upload:** file input (PDF only) → POST → refresh list
- **Sync:** button → POST → refresh list → new entry labeled "From Healthcare Database"
- **Loading states:** spinner during upload/sync
- **Error states:** toast/inline message on failure
- **Mobile-first:** same Tailwind pattern as other pages — full-width cards, large tap targets

---

## Environment Variables

```
# .env (project root)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-anon-key

# nextjs/next-app/.env.local (already exists)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Simulated Epic Data

`POST /prescriptions/sync` uses this hardcoded sample (realistic for an elderly patient):

```python
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
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| PDF has no text (scanned image) | HTTP 422: "Could not extract text from PDF" |
| Gemma returns unparseable JSON | HTTP 422: "Could not parse prescription" |
| Supabase unreachable | HTTP 500: "Database error" |
| No prescriptions yet | Empty state on page with upload prompt |
| `SUPABASE_URL`/`SUPABASE_KEY` not set | `KeyError` at startup — fast fail |

---

## New Python Dependencies

Add to `requirements.txt`:
```
supabase
pdfplumber
```

**Supabase setup note:** Use the **anon/public key** (not service role). Disable Row Level Security on the `prescriptions` table in the Supabase dashboard — no auth is implemented, so RLS would block all queries.

---

## Out of Scope

- PDF storage (only text/structured data saved to Supabase, not the PDF file itself)
- Authentication / per-user login
- Editing or deleting prescriptions
- Real Epic FHIR OAuth2 integration
- Scanned image OCR (PDFs must have selectable text)
