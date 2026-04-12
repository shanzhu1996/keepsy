"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface VoiceCaptureProps {
  studentFirstName: string;
  lang?: string;
  onComplete: (transcript: string) => void;
  onStartOver?: () => void;
  onRecordingStart?: () => void;
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
  onRecordingStart,
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
    onRecordingStart?.();
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
        <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
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
        className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 w-full max-w-lg mx-auto"
      >
        {isRecording ? (
          /* ─── Recording state ─── */
          <>
            {/* Waveform visualizer */}
            <div className="flex gap-[7px] items-end h-10 justify-center mt-6 mb-5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="inline-block w-[5px] rounded-full bg-[var(--accent)]"
                  style={{
                    height: `${14 + ((i * 7) % 20)}px`,
                    animation: `keepsy-pulse 1.1s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
            <p
              className="text-base leading-relaxed whitespace-pre-wrap text-center"
              style={{ color: "var(--ink-primary)" }}
            >
              {finalText}
              {interim && (
                <span style={{ color: "var(--ink-tertiary)" }}> {interim}</span>
              )}
            </p>
          </>
        ) : finalText ? (
          /* ─── Post-recording review ─── */
          <div className="w-full pt-6">
            <p
              className="text-[11px] uppercase tracking-wide mb-2 text-center"
              style={{ color: "var(--ink-tertiary)", letterSpacing: "0.06em" }}
            >
              review your notes
            </p>
            <textarea
              value={finalText}
              onChange={(e) => {
                setFinalText(e.target.value);
                finalTextRef.current = e.target.value;
              }}
              className="w-full min-h-[200px] text-base leading-relaxed rounded-lg p-3 outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--ink-primary)",
                border: "1px solid var(--line-strong)",
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom actions */}
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
            <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
              listening…
            </p>
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
              write the report
            </Button>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleStart}
                className="text-xs"
                style={{ color: "var(--accent-ink)" }}
              >
                + continue recording
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs transition-colors"
                style={{ color: "var(--ink-tertiary)" }}
              >
                start over
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Waveform above button in idle state */}
            <div className="flex gap-[7px] items-end h-10 justify-center mb-4" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="inline-block w-[5px] rounded-full bg-[var(--accent)]"
                  style={{
                    height: `${14 + ((i * 7) % 20)}px`,
                    animation: `keepsy-idle-pulse 2.4s ease-in-out ${i * 0.18}s infinite`,
                    opacity: 0.55,
                  }}
                />
              ))}
            </div>
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
              start recording
            </Button>
            <p className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
              talk naturally — 30 seconds is plenty
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes keepsy-pulse {
          0%, 100% { transform: scaleY(0.6); opacity: 0.5; }
          50% { transform: scaleY(1.4); opacity: 1; }
        }
        @keyframes keepsy-idle-pulse {
          0%, 100% { transform: scaleY(1); opacity: 0.45; }
          50% { transform: scaleY(1.15); opacity: 0.65; }
        }
      `}</style>

      <span className="sr-only">Recording note for {studentFirstName}</span>
    </div>
  );
}
