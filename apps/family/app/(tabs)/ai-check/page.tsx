'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  IconBox,
  PressToSpeakButton,
  GradientBlob,
  PatientSwitcher,
  ChatBubble,
  IconSearch,
  IconChat,
  IconKeyboard,
  IconPlus,
  IconMicrophone,
  IconArrowUp,
  IconChevronDown,
} from '@alio/ui';
import {
  SAMPLE_PATIENTS,
  SAMPLE_AI_CONVERSATION,
  SIMULATED_TRANSCRIPT,
  type ChatMessage,
} from '@alio/mock-data';

type View = 'voice-idle' | 'voice-recording' | 'message';

/**
 * Family AI Check — voice + message + image recognition.
 * Migrates the Caregiver Logs flow with two key Family-side additions:
 *   1) Top-left switches between "Alio voice ▾" (voice mode) and the active
 *      patient (e.g., "Dorothy Chen ▾") in message mode.
 *   2) Message mode has a TEXT INPUT bar (not just Press to Speak) so families
 *      can type questions or send images for AI to recognize.
 */
export default function FamilyAICheckPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('voice-idle');
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<ChatMessage[]>(SAMPLE_AI_CONVERSATION);
  const [activePatientId, setActivePatientId] = useState(SAMPLE_PATIENTS[0].id);
  const [draft, setDraft] = useState('');

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

  const handlePressToSpeak = () => setView('voice-recording');

  const handleDone = () => {
    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'me',
      text: transcript || SIMULATED_TRANSCRIPT,
    };
    const aiReply: ChatMessage = {
      id: `m-${Date.now()}-ai`,
      sender: 'them',
      text: 'Got it. Logged and analyzed against Dorothy\'s recent vitals.',
    };
    setConversation((prev) => [...prev, newMessage, aiReply]);
    setView('message');
  };

  const handleSendText = () => {
    const text = draft.trim();
    if (!text) return;
    setConversation((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, sender: 'me', text },
    ]);
    setDraft('');
  };

  return (
    <div
      className="relative h-full min-h-screen overflow-hidden sm:h-[852px] sm:min-h-0"
      style={{
        background:
          'linear-gradient(135deg, #E3E5F1 0%, #EAEAF2 50%, #D3D5EC 100%)',
      }}
    >
      {/* Top bar — switches between "Alio voice ▾" (voice modes) and Patient name (message) */}
      <header className="absolute left-[25px] right-[25px] top-[60px] z-10 flex items-center justify-between gap-3">
        {view === 'message' ? (
          <PatientSwitcher
            patients={SAMPLE_PATIENTS}
            activeId={activePatientId}
            onChange={setActivePatientId}
          />
        ) : (
          <AlioVoicePill />
        )}

        <div className="flex items-center gap-3">
          <IconBox size={42} aria-label="Search">
            <IconSearch className="size-6 text-gray-100" />
          </IconBox>
          <IconBox size={42} aria-label="Open chat history" onClick={() => router.push('/chat')}>
            <IconChat className="size-6 text-gray-100" />
          </IconBox>
        </div>
      </header>

      {/* View body */}
      {view !== 'message' ? (
        <VoiceView view={view} transcript={transcript} />
      ) : (
        <MessageView turns={conversation} />
      )}

      {/* Bottom — Press to Speak (voice modes) OR text input (message mode) */}
      {view !== 'message' ? (
        <div className="absolute bottom-[95px] left-[25px] right-[25px] z-10 flex items-center justify-between">
          <IconBox size={48} aria-label="Open keyboard">
            <IconKeyboard className="size-6 text-brand-primary" />
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
      ) : (
        <MessageInput
          value={draft}
          onChange={setDraft}
          onSend={handleSendText}
        />
      )}
    </div>
  );
}

// ----- Top-left pills ------------------------------------------------------

function AlioVoicePill() {
  return (
    <button
      type="button"
      className="flex h-[42px] items-center gap-2 rounded-[10px] bg-brand-tint-1 px-3 transition-colors active:bg-brand-border"
    >
      <span className="text-xl font-bold text-gray-100">Alio</span>
      <span className="text-md text-gray-100">voice</span>
      <IconChevronDown className="size-4 text-gray-100" strokeWidth={2.2} />
    </button>
  );
}

// ----- Voice view (idle + recording) ---------------------------------------

function VoiceView({ view, transcript }: { view: View; transcript: string }) {
  const recording = view === 'voice-recording';
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
        Hi, I am listening
      </p>

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

// ----- Message view (conversation with image-recognition support) ----------

function MessageView({ turns }: { turns: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length]);
  return (
    <div
      ref={scrollRef}
      className="absolute left-0 right-0 top-[122px] bottom-[180px] overflow-y-auto px-4 py-3"
    >
      <div className="flex flex-col gap-3">
        {turns.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}

// ----- Message-mode input bar ----------------------------------------------

function MessageInput({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  const hasText = value.trim().length > 0;
  return (
    <div className="absolute bottom-[95px] left-[16px] right-[16px] z-10 flex items-center gap-[10px]">
      <div className="flex h-[44px] flex-1 items-center gap-[8px] rounded-full bg-white px-[14px] shadow-sm">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend();
          }}
          placeholder="I want you to..."
          className="flex-1 bg-transparent text-[14px] text-gray-100 placeholder:text-gray-60 outline-none"
        />
        <button
          type="button"
          aria-label="Voice input"
          className="flex size-[24px] items-center justify-center text-gray-60"
        >
          <IconMicrophone className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Send"
          onClick={onSend}
          className="flex size-[28px] items-center justify-center rounded-full bg-brand-primary transition-transform active:scale-95"
          disabled={!hasText}
        >
          <IconArrowUp className="size-[16px] text-white" />
        </button>
      </div>
      <button
        type="button"
        aria-label="More actions"
        className="flex size-[44px] items-center justify-center rounded-[12px] bg-white shadow-sm transition-colors active:bg-brand-tint-1"
      >
        <IconPlus className="size-[22px] text-gray-100" />
      </button>
    </div>
  );
}
