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
  IconSearch,
  IconChat,
  IconKeyboard,
  IconPlus,
} from '@alio/ui';
import {
  INITIAL_CONVERSATION,
  SAMPLE_PATIENTS,
  type ConversationTurn,
} from '@alio/mock-data';
import { api, ApiError } from '@/lib/api';

type View = 'voice-idle' | 'voice-recording' | 'message';
type RecordState = 'idle' | 'recording' | 'transcribing' | 'summarizing';

export default function LogsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('voice-idle');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>(INITIAL_CONVERSATION);
  const [activePatientId, setActivePatientId] = useState(SAMPLE_PATIENTS[0].id);
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    // View stays 'voice-recording' visually until we resolve, then flips below.
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
          <IconBox
            size={42}
            aria-label="Open chat history"
            onClick={() => router.push('/logs/history')}
          >
            <IconChat className="size-6 text-gray-100" />
          </IconBox>
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

      <div className="absolute bottom-[95px] left-[25px] right-[25px] z-10 flex items-center justify-between">
        <IconBox size={48} aria-label="Open keyboard">
          <IconKeyboard className="size-6 text-gray-100" />
        </IconBox>
        {recording ? (
          <PressToSpeakButton
            variant="recording"
            onClick={handleDone}
            className="w-[216px]"
          />
        ) : (
          <PressToSpeakButton
            variant="idle"
            onClick={handlePressToSpeak}
            className="w-[216px]"
          />
        )}
        <IconBox size={48} aria-label="More actions">
          <IconPlus className="size-6 text-gray-100" />
        </IconBox>
      </div>
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
            ? 'animate-[listening-gradient_3.6s_ease-in-out_infinite] bg-[length:300%_100%] bg-[linear-gradient(90deg,#1F2782_0%,#6F7FF5_25%,#F472B6_50%,#C0DA5A_75%,#1F2782_100%)]'
            : 'bg-gradient-to-r from-[#1F2782] from-[45%] to-[#6F7FF5]/70',
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
            return <AudioBubble key={turn.id} time={turn.time} transcript={turn.transcript} />;
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
