"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface VoiceCaptureProps {
  studentFirstName: string;
  lang?: string;
  onComplete: (transcript: string) => void;
  onStartOver?: () => void;
}

interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SREvent extends Event {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
interface SRInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SRCtor = new () => SRInstance;

type Phase = "idle" | "recording";

export default function VoiceCapture({
  studentFirstName,
  lang = "en-US",
  onComplete,
  onStartOver,
}: VoiceCaptureProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SRInstance | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const finalTextRef = useRef("");
  const interimRef = useRef("");
  const stoppedRef = useRef(true);

  useEffect(() => {
    finalTextRef.current = finalText;
    interimRef.current = interim;
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [finalText, interim]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SRCtor;
      webkitSpeechRecognition?: SRCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let interimChunk = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt = r[0].transcript;
        if (r.isFinal) finalChunk += txt;
        else interimChunk += txt;
      }
      if (finalChunk) {
        setFinalText((prev) => (prev ? prev + " " : "") + finalChunk.trim());
        setInterim("");
      }
      if (interimChunk) setInterim(interimChunk);
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (stoppedRef.current) return;
      // Auto-restart to keep continuous mode alive across iOS gaps.
      try {
        rec.start();
      } catch {
        /* ignore */
      }
    };

    recRef.current = rec;

    return () => {
      stoppedRef.current = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function handleStart() {
    if (!recRef.current) return;
    stoppedRef.current = false;
    setPhase("recording");
    try {
      recRef.current.start();
    } catch {
      /* already started */
    }
  }

  function handleStop() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    // Fold any trailing interim text into finalText so it's editable.
    if (interimRef.current.trim()) {
      const merged =
        (finalTextRef.current ? finalTextRef.current + " " : "") +
        interimRef.current.trim();
      finalTextRef.current = merged;
      setFinalText(merged);
      setInterim("");
      interimRef.current = "";
    }
    setPhase("idle");
  }

  function handleStartOver() {
    stoppedRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setFinalText("");
    setInterim("");
    finalTextRef.current = "";
    interimRef.current = "";
    setPhase("idle");
    onStartOver?.();
  }

  if (!supported) {
    return (
      <div className="text-center p-6">
        <p className="text-sm text-gray-600 mb-4">
          Voice capture isn&apos;t supported in this browser. Switch to Type mode.
        </p>
      </div>
    );
  }

  const isRecording = phase === "recording";

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-6 pb-4 w-full max-w-lg mx-auto"
      >
        {!finalText && !interim && (
          <p className="text-center text-sm text-gray-500 leading-relaxed mb-8">
            What you worked on · how it went · what&apos;s next
          </p>
        )}
        <div className="flex gap-1.5 items-end h-8 justify-center mb-6" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block w-1.5 rounded-full bg-[var(--accent)]"
              style={{
                height: `${12 + ((i * 7) % 18)}px`,
                animation: isRecording
                  ? `keepsy-pulse 1.1s ease-in-out ${i * 0.12}s infinite`
                  : "none",
                opacity: isRecording ? 1 : 0.3,
              }}
            />
          ))}
        </div>
        {isRecording ? (
          <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap text-center">
            {finalText}
            {interim && <span className="text-gray-400"> {interim}</span>}
          </p>
        ) : finalText ? (
          <div className="w-full">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2 text-center">
              Review — edit any mistakes
            </p>
            <textarea
              value={finalText}
              onChange={(e) => {
                setFinalText(e.target.value);
                finalTextRef.current = e.target.value;
              }}
              className="w-full min-h-[200px] text-base leading-relaxed text-gray-800 bg-white rounded-lg border border-amber-200 p-3 outline-none focus:border-amber-400"
            />
          </div>
        ) : null}
      </div>

      <div
        className="shrink-0 bg-[var(--bg-canvas)] flex flex-col items-center gap-2 w-full max-w-lg mx-auto px-4 py-4"
        style={{ borderTop: "1px solid var(--line-subtle)" }}
      >
        {isRecording ? (
          <>
            <Button
              size="lg"
              className="w-full h-12 text-[15px] font-semibold"
              style={{
                backgroundColor: "var(--accent)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-cta)",
                letterSpacing: "-0.005em",
              }}
              onClick={handleStop}
            >
              ■ Stop
            </Button>
            <p className="text-xs text-gray-500">listening…</p>
          </>
        ) : finalText ? (
          <>
            <Button
              size="lg"
              className="w-full h-12 text-[15px] font-semibold"
              style={{
                backgroundColor: "var(--accent)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-cta)",
                letterSpacing: "-0.005em",
              }}
              onClick={() => {
                const text = finalTextRef.current.trim();
                if (text) onComplete(text);
              }}
            >
              Generate ✨
            </Button>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleStart}
                className="text-xs text-amber-700"
              >
                + Continue recording
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Start over
              </button>
            </div>
          </>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full h-12 text-[15px] font-semibold"
              style={{
                backgroundColor: "var(--accent)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-cta)",
                letterSpacing: "-0.005em",
              }}
              onClick={handleStart}
            >
              🎙 Start recording
            </Button>
            <p className="text-xs text-gray-500">tap when ready</p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes keepsy-pulse {
          0%, 100% { transform: scaleY(0.6); opacity: 0.5; }
          50% { transform: scaleY(1.4); opacity: 1; }
        }
      `}</style>

      <span className="sr-only">Recording note for {studentFirstName}</span>
    </div>
  );
}
