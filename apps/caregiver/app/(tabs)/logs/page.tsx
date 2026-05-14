'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  IconBox,
  PressToSpeakButton,
  GradientBlob,
  PatientSwitcher,
  AudioBubble,
  TaskCard,
  ChatBubble,
  IconSearch,
  IconChatswitch,
  IconMicrophoneFilled,
  IconKeyboard,
  IconPlus,
  IconMicrophone,
  IconArrowUp,
} from '@alio/ui';
import {
  INITIAL_CONVERSATION,
  SAMPLE_PATIENTS,
  type ConversationTurn,
} from '@alio/mock-data';
import { api, ApiError, type CompiledReport } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const CAREGIVER_ID = 'caregiver-001';
const CAREGIVER_NAME = 'Sarah Mitchell';
const threadIdFor = (patientId: string) => `${CAREGIVER_ID}__${patientId}`;

type View = 'voice-idle' | 'voice-recording' | 'message';
type RecordState = 'idle' | 'recording' | 'transcribing' | 'summarizing';
type CompileState = 'idle' | 'compiling' | 'reviewing' | 'sending';

export default function LogsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('voice-idle');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>(INITIAL_CONVERSATION);
  const [activePatientId, setActivePatientId] = useState(SAMPLE_PATIENTS[0].id);
  const [error, setError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [compileState, setCompileState] = useState<CompileState>('idle');
  const [compiled, setCompiled] = useState<CompiledReport | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function persistLog(
    transcript: string,
    summary: Awaited<ReturnType<typeof api.summarize>>,
  ) {
    const { error: insertError } = await supabase.from('caregiver_logs').insert({
      caregiver_id: CAREGIVER_ID,
      patient_id: activePatientId,
      transcript,
      summary: summary.summary,
      mood: summary.mood,
      medications_noted: summary.medications_noted,
      urgent: summary.urgent,
    });
    if (insertError) console.warn('Failed to persist caregiver log:', insertError);
  }

  async function handleCompile() {
    if (compileState !== 'idle') return;
    setError('');
    setCompileState('compiling');
    setCompiled(null);
    try {
      const result = await api.compileLogs(
        CAREGIVER_ID,
        activePatientId,
        activePatient?.name ?? 'Patient',
      );
      setCompiled(result);
      setCompileState('reviewing');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not compile logs.');
      setCompileState('idle');
    }
  }

  async function handleSendToFamily() {
    if (!compiled || compileState !== 'reviewing') return;
    setCompileState('sending');
    setError('');
    const { error: sendError } = await supabase.from('family_messages').insert({
      thread_id: threadIdFor(activePatientId),
      sender: CAREGIVER_NAME,
      text: compiled.text,
    });
    if (sendError) {
      setError(`Could not send: ${sendError.message}`);
      setCompileState('reviewing');
      return;
    }
    setCompiled(null);
    setCompileState('idle');
  }

  function handleDiscardCompiled() {
    setCompiled(null);
    setCompileState('idle');
  }

  const activePatient = SAMPLE_PATIENTS.find((p) => p.id === activePatientId);
  const recording = view === 'voice-recording';
  const busyLabel =
    recordState === 'transcribing'
      ? 'Transcribing…'
      : recordState === 'summarizing'
        ? 'Logging…'
        : '';

  async function handlePressToSpeak() {
    if (recordState !== 'idle') return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = handleRecordingStop;
      recorder.start();
      recorderRef.current = recorder;
      setRecordState('recording');
      setView('voice-recording');
    } catch {
      setError('Microphone access denied.');
    }
  }

  function handleDone() {
    if (recordState !== 'recording' || !recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setRecordState('transcribing');
  }

  function handleSendText() {
    const text = draft.trim();
    if (!text) return;
    const ts = Date.now();
    setConversation((prev) => [
      ...prev,
      { kind: 'user-text', id: `turn-${ts}`, text },
    ]);
    setDraft('');
    setKeyboardOpen(false);
    setView('message');
  }

  async function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const ts = Date.now();
    try {
      const { transcript } = await api.transcribe(blob);
      setPartialTranscript(transcript);

      const audioTurn: ConversationTurn = {
        kind: 'user-audio',
        id: `turn-${ts}`,
        time: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
        }),
        transcript,
      };
      setConversation((prev) => [...prev, audioTurn]);

      setRecordState('summarizing');
      const summary = await api.summarize(
        activePatient?.name ?? 'Patient',
        transcript,
        '',
      );
      const aiTurn: ConversationTurn = {
        kind: 'ai-summary',
        id: `turn-${ts}-ai`,
        summary: summary.summary,
        mood: summary.mood,
        medicationsNoted: summary.medications_noted,
        urgent: summary.urgent,
      };
      setConversation((prev) => [...prev, aiTurn]);
      await persistLog(transcript, summary);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the AI service.');
    } finally {
      setPartialTranscript('');
      setRecordState('idle');
      setView('voice-idle');
    }
  }

  return (
    <div
      className="relative h-full min-h-screen overflow-hidden sm:h-[852px] sm:min-h-0"
      style={{
        background:
          'linear-gradient(135deg, #E3E5F1 0%, #EAEAF2 50%, #D3D5EC 100%)',
      }}
    >
      <header className="absolute left-[25px] right-[25px] top-[60px] z-10 flex items-center justify-between gap-3">
        <PatientSwitcher
          patients={SAMPLE_PATIENTS}
          activeId={activePatientId}
          onChange={setActivePatientId}
        />
        <div className="flex items-center gap-3">
          <IconBox size={42} aria-label="Search">
            <IconSearch className="size-6 text-gray-100" />
          </IconBox>
          {/* Mode-switch button — toggles voice ↔ message.
           * Voice mode  → shows IconChatswitch  → tap goes to message view.
           * Message mode → shows microphone icon → tap goes back to voice. */}
          <button
            type="button"
            aria-label={
              view === 'message' ? 'Switch to voice mode' : 'Switch to message mode'
            }
            onClick={() => setView(view === 'message' ? 'voice-idle' : 'message')}
            className="flex size-[42px] items-center justify-center rounded-[12px] bg-brand-primary transition-transform active:scale-95"
          >
            {view === 'message' ? (
              <IconMicrophoneFilled className="size-6 text-white" />
            ) : (
              <IconChatswitch className="size-6 text-white" />
            )}
          </button>
        </div>
      </header>

      {view !== 'message' ? (
        <VoiceView
          recording={recording}
          partialTranscript={partialTranscript}
          busyLabel={busyLabel}
          error={error}
        />
      ) : (
        <MessageView turns={conversation} />
      )}

      {view === 'message' || keyboardOpen ? (
        <div className="absolute bottom-[95px] left-[16px] right-[16px] z-10 flex items-center gap-[10px]">
          <div className="flex h-[44px] flex-1 items-center gap-[8px] rounded-full bg-white px-[14px] shadow-sm">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendText();
              }}
              placeholder="Type a note..."
              className="flex-1 bg-transparent text-[14px] text-gray-100 placeholder:text-gray-60 outline-none"
            />
            <button
              type="button"
              aria-label={keyboardOpen ? 'Back to voice mode' : 'Voice input'}
              onClick={keyboardOpen ? () => setKeyboardOpen(false) : undefined}
              className={`flex size-[24px] items-center justify-center ${
                keyboardOpen ? 'text-brand-primary' : 'text-gray-60'
              }`}
            >
              <IconMicrophone className="size-[18px]" />
            </button>
            <button
              type="button"
              aria-label="Send"
              onClick={handleSendText}
              disabled={!draft.trim()}
              className="flex size-[28px] items-center justify-center rounded-full bg-brand-primary transition-transform active:scale-95 disabled:opacity-50"
            >
              <IconArrowUp className="size-[16px] text-white" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Compile today's logs and review"
            onClick={handleCompile}
            className="flex size-[44px] items-center justify-center rounded-[12px] bg-white shadow-sm transition-colors active:bg-brand-tint-1"
          >
            <IconPlus className="size-[22px] text-gray-100" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-[95px] left-[25px] right-[25px] z-10 flex items-center justify-between">
          <IconBox
            size={48}
            aria-label="Open keyboard"
            onClick={() => setKeyboardOpen(true)}
          >
            <IconKeyboard className="size-6 text-gray-100" />
          </IconBox>
          {recording ? (
            <PressToSpeakButton variant="recording" onClick={handleDone} className="w-[216px]" />
          ) : (
            <PressToSpeakButton variant="idle" onClick={handlePressToSpeak} className="w-[216px]" />
          )}
          <IconBox
            size={48}
            aria-label="Compile today's logs and review"
            onClick={handleCompile}
          >
            <IconPlus className="size-6 text-gray-100" />
          </IconBox>
        </div>
      )}

      {compileState === 'compiling' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-lg">
            <p className="text-gray-100">Compiling today’s logs…</p>
          </div>
        </div>
      )}

      {(compileState === 'reviewing' || compileState === 'sending') && compiled && (
        <ReviewModal
          patientName={activePatient?.name ?? 'Patient'}
          compiled={compiled}
          sending={compileState === 'sending'}
          onDiscard={handleDiscardCompiled}
          onSend={handleSendToFamily}
          error={error}
        />
      )}
    </div>
  );
}

function VoiceView({
  recording,
  partialTranscript,
  busyLabel,
  error,
}: {
  recording: boolean;
  partialTranscript: string;
  busyLabel: string;
  error: string;
}) {
  return (
    <>
      <p
        className={clsx(
          'absolute left-1/2 top-[180px] -translate-x-1/2 whitespace-nowrap bg-clip-text text-xl font-bold text-transparent',
          recording
            ? 'animate-[listening-gradient_3.6s_ease-in-out_infinite] bg-[length:300%_100%] bg-[linear-gradient(90deg,#2B1B72_0%,#5E69F6_22%,#A29BFE_45%,#F4B6C8_60%,#D496F5_78%,#2B1B72_100%)]'
            : 'bg-gradient-to-r from-[#2B1B72] from-[10%] via-[#5E69F6] via-[55%] to-[#F4B6C8] to-[100%]',
        )}
      >
        {busyLabel || 'Hi, I am listening'}
      </p>

      <div className="absolute left-1/2 top-[220px] h-[310px] w-[311px] -translate-x-1/2">
        <GradientBlob active={recording || Boolean(busyLabel)} className="h-full w-full" />
      </div>

      {partialTranscript && (
        <p className="absolute left-[40px] right-[40px] top-[540px] text-center text-base leading-snug text-gray-100">
          {partialTranscript}
        </p>
      )}

      {error && (
        <p className="absolute left-[40px] right-[40px] top-[600px] text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

function MessageView({ turns }: { turns: ConversationTurn[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length]);

  return (
    <div
      ref={scrollRef}
      className="absolute left-0 right-0 top-[122px] bottom-[170px] overflow-y-auto px-4 py-2"
    >
      <div className="flex flex-col gap-3">
        {turns.map((turn) => {
          if (turn.kind === 'user-audio') {
            return (
              <AudioBubble
                key={turn.id}
                time={turn.time}
                transcript={turn.transcript}
              />
            );
          }
          if (turn.kind === 'user-text') {
            return (
              <ChatBubble
                key={turn.id}
                message={{ id: turn.id, sender: 'me', text: turn.text }}
              />
            );
          }
          if (turn.kind === 'ai-tasks') {
            return <TaskCard key={turn.id} intro={turn.intro} tasks={turn.tasks} />;
          }
          return <SummaryBubble key={turn.id} turn={turn} />;
        })}
      </div>
    </div>
  );
}

function ReviewModal({
  patientName,
  compiled,
  sending,
  onDiscard,
  onSend,
  error,
}: {
  patientName: string;
  compiled: CompiledReport;
  sending: boolean;
  onDiscard: () => void;
  onSend: () => void;
  error: string;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80%] w-full max-w-[420px] flex-col rounded-3xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-60">Compiled shift report</p>
            <p className="text-lg font-semibold text-gray-100">{patientName}</p>
            <p className="text-xs text-gray-60">
              {compiled.log_count} log{compiled.log_count === 1 ? '' : 's'} from {compiled.visit_date}
            </p>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            className="text-2xl leading-none text-gray-60 hover:text-gray-100"
            aria-label="Discard"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
            {compiled.text}
          </p>
        </div>

        {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onDiscard}
            disabled={sending}
            className="flex-1 rounded-full border border-gray-300 py-3 font-semibold text-gray-100 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="flex-1 rounded-full bg-[#C0DA5A] py-3 font-semibold text-[#1F2782] disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send to family'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryBubble({
  turn,
}: {
  turn: Extract<ConversationTurn, { kind: 'ai-summary' }>;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      {turn.urgent && (
        <div className="mb-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          Urgent — review now
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-60">Visit logged</p>
      <p className="mt-1 text-base leading-relaxed text-gray-100">{turn.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-60">Mood</p>
          <p className="text-gray-100">{turn.mood || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-60">Medications</p>
          <p className="text-gray-100">
            {turn.medicationsNoted.length ? turn.medicationsNoted.join(', ') : 'None'}
          </p>
        </div>
      </div>
    </div>
  );
}
