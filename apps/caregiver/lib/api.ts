const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => d.detail)
      .catch(() => res.statusText);
    throw new ApiError(res.status, String(detail));
  }
  return res.json() as Promise<T>;
}

export interface VisitSummary {
  summary: string;
  mood: string;
  medications_noted: string[];
  urgent: boolean;
}

export const api = {
  transcribe: (audio: Blob) =>
    request<{ transcript: string }>('/transcribe', {
      method: 'POST',
      body: audio,
      headers: { 'Content-Type': 'application/octet-stream' },
    }),

  summarize: (patient_name: string, transcript: string, notes = '') =>
    request<VisitSummary>('/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_name, transcript, notes }),
    }),
};
