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
  IconChatswitch,
  IconMicrophoneFilled,
  IconKeyboard,
  IconPlus,
} from '@alio/ui';
import {
  INITIAL_CONVERSATION,
  SIMULATED_TRANSCRIPT,
  SAMPLE_PATIENTS,
  type ConversationTurn,
} from '@alio/mock-data';

type View = 'voice-idle' | 'voice-recording' | 'message';

export default function LogsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('voice-idle');
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>(INITIAL_CONVERSATION);
  const [activePatientId, setActivePatientId] = useState(SAMPLE_PATIENTS[0].id);

  // Simulated transcript stream during recording
  useEffect(() => {
    if (view !== 'voice-recording') {
      setTranscript('');
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTranscript(SIMULATED_TRANSCRIPT.slice(0, i));
      if (i >= SIMULATED_TRANSCRIPT.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [view]);

  const handlePressToSpeak = () => {
    setView('voice-recording');
  };

  // Pressing Done saves the recording to the conversation BUT stays in voice mode.
  // To view the conversation, user toggles Message via the dropdown.
  const handleDone = () => {
    const ts = Date.now();
    const newTurn: ConversationTurn = {
      kind: 'user-audio',
      id: `turn-${ts}`,
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      }),
      transcript: transcript || SIMULATED_TRANSCRIPT,
    };
    const aiResponse: ConversationTurn = {
      kind: 'ai-tasks',
      id: `turn-${ts}-ai`,
      intro: 'Got it. Here are the rest of the to-dos for today.',
      tasks: [
        { id: `n${ts}-1`, label: 'Help Sarah shower', done: false },
        { id: `n${ts}-2`, label: 'Daily medication', done: false },
        { id: `n${ts}-3`, label: 'Check vitals at 4pm', done: false },
      ],
    };
    setConversation((prev) => [...prev, newTurn, aiResponse]);
    setView('voice-idle'); // stay in voice mode
  };

  // View toggle is now done via the chat icon at top-right (history list).
  // Voice idle ↔ message conversation can still be reached by tapping
  // history then back, or simply via the Done flow.

  return (
    <div
      className="relative h-full min-h-screen overflow-hidden sm:h-[852px] sm:min-h-0"
      style={{
        background:
          'linear-gradient(135deg, #E3E5F1 0%, #EAEAF2 50%, #D3D5EC 100%)',
      }}
    >
      {/* Top bar — patient switcher (left) + Search/Chat actions (right) */}
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

      {/* View body */}
      {view !== 'message' ? (
        <VoiceView view={view} transcript={transcript} />
      ) : (
        <MessageView turns={conversation} />
      )}

      {/* Bottom action bar — present in all states.
       * Sits closer to the tab bar than before — gap is now ~12px instead of 40px. */}
      <div className="absolute bottom-[95px] left-[25px] right-[25px] z-10 flex items-center justify-between">
        <IconBox size={48} aria-label="Open keyboard">
          <IconKeyboard className="size-6 text-gray-100" />
        </IconBox>
        {view === 'voice-recording' ? (
          <PressToSpeakButton variant="recording" onClick={handleDone} className="w-[216px]" />
        ) : (
          <PressToSpeakButton variant="idle" onClick={handlePressToSpeak} className="w-[216px]" />
        )}
        <IconBox size={48} aria-label="More actions">
          <IconPlus className="size-6 text-gray-100" />
        </IconBox>
      </div>
    </div>
  );
}

// ---------- Voice view (idle + recording) ----------
function VoiceView({ view, transcript }: { view: View; transcript: string }) {
  const recording = view === 'voice-recording';
  return (
    <>
      {/* "Hi, I am listening" — pure purple → pink gradient. Static (idle)
       * goes dark indigo → brand purple → light pink; recording animates the
       * same palette by sliding `background-position` across a 300%-wide grad. */}
      <p
        className={clsx(
          'absolute left-1/2 top-[180px] -translate-x-1/2 whitespace-nowrap bg-clip-text text-xl font-bold text-transparent',
          recording
            ? 'animate-[listening-gradient_3.6s_ease-in-out_infinite] bg-[length:300%_100%] bg-[linear-gradient(90deg,#2B1B72_0%,#5E69F6_22%,#A29BFE_45%,#F4B6C8_60%,#D496F5_78%,#2B1B72_100%)]'
            : 'bg-gradient-to-r from-[#2B1B72] from-[10%] via-[#5E69F6] via-[55%] to-[#F4B6C8] to-[100%]',
        )}
      >
        Hi, I am listening
      </p>

      {/* Wrapper handles positioning; GradientBlob's inner element handles the pulse */}
      <div className="absolute left-1/2 top-[220px] h-[310px] w-[311px] -translate-x-1/2">
        <GradientBlob active={recording} className="h-full w-full" />
      </div>

      {recording && transcript && (
        <p className="absolute left-[40px] right-[40px] top-[540px] text-center text-base leading-snug text-gray-100">
          {transcript.split(' ').map((word, i, arr) => {
            const isLastFew = i >= arr.length - 4;
            return (
              <span key={i} className={isLastFew ? 'text-gray-100' : 'text-gray-60'}>
                {word}{' '}
              </span>
            );
          })}
        </p>
      )}
    </>
  );
}

// ---------- Message view (conversation) ----------
function MessageView({ turns }: { turns: ConversationTurn[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new turns added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  return (
    <div
      ref={scrollRef}
      className="absolute left-0 right-0 top-[122px] bottom-[170px] overflow-y-auto px-4 py-2"
    >
      <div className="flex flex-col gap-3">
        {turns.map((turn) =>
          turn.kind === 'user-audio' ? (
            <AudioBubble
              key={turn.id}
              time={turn.time}
              transcript={turn.transcript}
            />
          ) : (
            <TaskCard key={turn.id} intro={turn.intro} tasks={turn.tasks} />
          ),
        )}
      </div>
    </div>
  );
}
