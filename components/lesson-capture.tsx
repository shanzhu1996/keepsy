"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VoiceCapture from "@/components/voice-capture";
import LessonResult from "@/components/lesson-result";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedNote } from "@/lib/types";

interface LessonCaptureProps {
  lessonId: string;
  studentName: string;
  timeLabel: string;
  initialNote: GeneratedNote | null;
  initialMode?: "voice" | "type";
  nextLessonLabel?: string | null;
}

type Phase = "capture" | "processing" | "result";

const LANGUAGES = [
  { code: "en-US", label: "EN", name: "English" },
  { code: "zh-CN", label: "中文", name: "Chinese (Mandarin)" },
  { code: "es-ES", label: "ES", name: "Spanish" },
  { code: "fr-FR", label: "FR", name: "French" },
  { code: "de-DE", label: "DE", name: "German" },
  { code: "ja-JP", label: "日本語", name: "Japanese" },
  { code: "ko-KR", label: "한국어", name: "Korean" },
  { code: "pt-BR", label: "PT", name: "Portuguese" },
  { code: "it-IT", label: "IT", name: "Italian" },
];

export default function LessonCapture({
  lessonId,
  studentName,
  timeLabel,
  initialNote,
  initialMode = "voice",
  nextLessonLabel,
}: LessonCaptureProps) {
  const router = useRouter();
  const firstName = studentName.split(" ")[0] || studentName;

  const [mode, setMode] = useState<"voice" | "type">(initialMode);
  const [phase, setPhase] = useState<Phase>(initialNote ? "result" : "capture");
  const [typedInput, setTypedInput] = useState("");
  const [note, setNote] = useState<GeneratedNote | null>(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>("en-US");
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("keepsy:lang");
      if (saved) setLang(saved);
    } catch {}
  }, []);

  function changeLang(code: string) {
    setLang(code);
    setLangMenuOpen(false);
    try {
      localStorage.setItem("keepsy:lang", code);
    } catch {}
  }

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  async function generate(transcript: string) {
    setError(null);
    setPhase("processing");
    try {
      const res = await fetch("/api/notes/generate-from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, transcript, language: currentLang.name }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to generate");
      const data = await res.json();
      setNote(data.note as GeneratedNote);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("capture");
    }
  }

  function handleTypeGenerate() {
    const text = typedInput.trim();
    if (!text) return;
    generate(text);
  }

  if (phase === "result" && note) {
    return (
      <LessonResult
        lessonId={lessonId}
        studentFirstName={firstName}
        initialNote={note}
        nextLessonLabel={nextLessonLabel ?? null}
        onReRecord={() => {
          setNote(null);
          setPhase("capture");
          setMode("voice");
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--bg-canvas)] flex flex-col z-[60] overflow-hidden">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--line-subtle)" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[13px]"
          style={{ color: "var(--ink-secondary)" }}
        >
          ← Back
        </button>
        <div
          className="text-[14px] font-semibold"
          style={{ color: "var(--ink-primary)", letterSpacing: "-0.005em" }}
        >
          {firstName} · {timeLabel}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 hover:border-amber-400"
              aria-label="Language"
            >
              🌐 {currentLang.label}
            </button>
            {langMenuOpen && (
              <div
                className="absolute right-0 top-9 bg-white rounded-lg py-1 min-w-[160px] z-30"
                style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => changeLang(l.code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${
                      l.code === lang
                        ? "text-amber-700 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("voice")}
              className={`px-2.5 py-1 rounded-full transition ${
                mode === "voice" ? "bg-amber-600 text-white" : "text-gray-600"
              }`}
            >
              🎙 Speak
            </button>
            <button
              type="button"
              onClick={() => setMode("type")}
              className={`px-2.5 py-1 rounded-full transition ${
                mode === "type" ? "bg-amber-600 text-white" : "text-gray-600"
              }`}
            >
              ⌨ Type
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col">
        {phase === "processing" ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="text-3xl">✨</div>
            <p className="text-base text-gray-700">Writing it up…</p>
          </div>
        ) : mode === "voice" ? (
          <VoiceCapture
            key={lang}
            studentFirstName={firstName}
            lang={lang}
            onComplete={(text) => generate(text)}
          />
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 max-w-lg w-full mx-auto">
              <Textarea
                autoFocus
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={`Worked on…\nWent well / tricky bits…\nFor ${firstName} next week…`}
                className="w-full min-h-[260px] text-base leading-relaxed bg-white"
              />
              {typedInput.trim().length > 0 &&
                typedInput.trim().split(/\s+/).length < 15 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Short note — your message will be brief too.
                  </p>
                )}
            </div>
            <div
              className="shrink-0 bg-[var(--bg-canvas)] px-4 py-4 max-w-lg w-full mx-auto"
              style={{ borderTop: "1px solid var(--line-subtle)" }}
            >
              <Button
                size="lg"
                className="w-full h-12 text-[15px] font-semibold"
                style={{
                  backgroundColor: "var(--accent)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-cta)",
                  letterSpacing: "-0.005em",
                }}
                onClick={handleTypeGenerate}
                disabled={!typedInput.trim()}
              >
                Generate ✨
              </Button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-t border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
