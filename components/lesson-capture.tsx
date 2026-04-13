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
  studentPhone: string | null;
  studentEmail: string | null;
  contactMethod: string;
  timeLabel: string;
  dateLabel: string;
  teacherName: string | null;
  initialNote: GeneratedNote | null;
  initialMode?: "voice" | "type";
  nextLessonLabel?: string | null;
  prevLessonSnippet?: string | null;
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

const TOPIC_PILLS = ["what you covered", "assignments", "what's next"];

export default function LessonCapture({
  lessonId,
  studentName,
  studentPhone,
  studentEmail,
  contactMethod,
  timeLabel,
  dateLabel,
  teacherName,
  initialNote,
  initialMode = "voice",
  nextLessonLabel,
  prevLessonSnippet,
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
  const [hasStarted, setHasStarted] = useState(false);

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
        studentPhone={studentPhone}
        studentEmail={studentEmail}
        contactMethod={contactMethod}
        dateLabel={dateLabel}
        teacherName={teacherName}
        initialNote={note}
        nextLessonLabel={nextLessonLabel ?? null}
        onReRecord={() => {
          setNote(null);
          setPhase("capture");
          setMode("voice");
          setHasStarted(false);
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
          onClick={() => { router.refresh(); router.back(); }}
          className="text-[13px]"
          style={{ color: "var(--ink-secondary)" }}
        >
          ‹ back
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
              className="px-2.5 py-1 rounded-full text-xs"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--line-subtle)",
                color: "var(--ink-secondary)",
              }}
              aria-label="Language"
            >
              {currentLang.label}
            </button>
            {langMenuOpen && (
              <div
                className="absolute right-0 top-9 rounded-lg py-1 min-w-[160px] z-30"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  boxShadow: "var(--shadow-popover)",
                }}
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => changeLang(l.code)}
                    className="w-full text-left px-3 py-2 text-sm"
                    style={{
                      color:
                        l.code === lang
                          ? "var(--accent-ink)"
                          : "var(--ink-primary)",
                      fontWeight: l.code === lang ? 500 : 400,
                    }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="flex gap-0.5 rounded-full p-0.5"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--line-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("voice")}
              className="flex items-center gap-1.5 px-3 h-7 rounded-full transition"
              style={{
                backgroundColor:
                  mode === "voice" ? "var(--accent)" : "transparent",
                color: mode === "voice" ? "#fff" : "var(--ink-secondary)",
                fontSize: "12px",
                fontWeight: mode === "voice" ? 600 : 400,
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              voice
            </button>
            <button
              type="button"
              onClick={() => setMode("type")}
              className="flex items-center gap-1.5 px-3 h-7 rounded-full transition"
              style={{
                backgroundColor:
                  mode === "type" ? "var(--accent)" : "transparent",
                color: mode === "type" ? "#fff" : "var(--ink-secondary)",
                fontSize: "12px",
                fontWeight: mode === "type" ? 600 : 400,
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              type
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col">
        {phase === "processing" ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div
              className="w-6 h-6 rounded-full animate-spin"
              style={{
                border: "2px solid var(--line-subtle)",
                borderTopColor: "var(--accent)",
              }}
            />
            <p
              className="font-display text-[16px]"
              style={{ color: "var(--ink-secondary)" }}
            >
              writing {firstName}&apos;s report...
            </p>
          </div>
        ) : (
          <>
            {/* ─── Expectation banner ─── */}
            {phase === "capture" && (
              <div
                className={`text-center px-6 pt-4 pb-1 keepsy-rise keepsy-rise-1 ${hasStarted && mode === "voice" ? "keepsy-fade-up pointer-events-none" : ""}`}
              >
                <p
                  className="font-display text-[17px]"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  just the highlights — keepsy writes the full report
                </p>
                <p
                  className="text-[13px] mt-1"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  a few sentences is all it takes
                </p>
              </div>
            )}

            {/* ─── Topic nudge pills ─── */}
            {phase === "capture" && (
              <div
                className={`flex flex-wrap justify-center gap-2 px-4 pt-2 pb-1 keepsy-rise keepsy-rise-2 transition-opacity duration-300 ${
                  hasStarted && mode === "voice" ? "opacity-40" : "opacity-100"
                }`}
              >
                {TOPIC_PILLS.map((pill) => (
                  <span
                    key={pill}
                    className="text-[12px] px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}

            {/* ─── Previous lesson context ─── */}
            {phase === "capture" && prevLessonSnippet && !hasStarted && (
              <div
                className="text-center px-6 pt-2 pb-1 keepsy-rise keepsy-rise-3"
              >
                <p
                  className="text-[12px] italic"
                  style={{ color: "var(--ink-tertiary)", lineHeight: 1.5 }}
                >
                  last time: {prevLessonSnippet}
                </p>
              </div>
            )}

            {/* ─── Mode-specific content ─── */}
            {mode === "voice" ? (
              <VoiceCapture
                key={lang}
                studentFirstName={firstName}
                lang={lang}
                onComplete={(text) => generate(text)}
                onRecordingStart={() => setHasStarted(true)}
              />
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 max-w-lg w-full mx-auto">
                  <Textarea
                    autoFocus
                    value={typedInput}
                    onChange={(e) => {
                      setTypedInput(e.target.value);
                      if (!hasStarted && e.target.value.length > 0) {
                        setHasStarted(true);
                      }
                    }}
                    placeholder={`e.g. "Worked on freestyle breathing drills. Timing much better today. Assigned 3x20m sets focusing on bilateral breathing for next week."`}
                    className="w-full min-h-[120px] max-h-[40vh] text-base leading-relaxed"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--line-subtle)",
                      color: "var(--ink-primary)",
                    }}
                  />
                  {typedInput.trim().length > 0 &&
                    typedInput.trim().split(/\s+/).length < 15 && (
                      <p
                        className="text-xs mt-3 text-center"
                        style={{ color: "var(--ink-tertiary)" }}
                      >
                        keepsy works best with a few sentences — even brief
                        notes make great reports
                      </p>
                    )}
                </div>
                <div
                  className="shrink-0 px-4 py-4 max-w-lg w-full mx-auto"
                  style={{ borderTop: "1px solid var(--line-subtle)" }}
                >
                  <Button
                    size="lg"
                    className="w-full h-12 text-[15px] font-semibold"
                    style={{
                      backgroundColor: typedInput.trim()
                        ? "var(--accent)"
                        : "var(--bg-muted)",
                      borderRadius: "var(--radius)",
                      boxShadow: typedInput.trim()
                        ? "var(--shadow-cta)"
                        : "none",
                      letterSpacing: "-0.005em",
                      color: typedInput.trim()
                        ? "#fff"
                        : "var(--ink-tertiary)",
                    }}
                    onClick={handleTypeGenerate}
                    disabled={!typedInput.trim()}
                  >
                    write the report
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          className="px-4 py-2 text-sm"
          style={{
            color: "var(--danger)",
            backgroundColor: "var(--accent-soft)",
            borderTop: "1px solid var(--line-subtle)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
