"use client";

import { useState } from "react";

/**
 * Landing-page "try it" demo. Purely illustrative — it shows a canned,
 * pre-written report so prospective teachers can feel the magic (talk → note,
 * in their language) WITHOUT a signup and WITHOUT calling OpenAI. The sample
 * input is fixed; the language switcher swaps between hand-authored outputs.
 */

type Lang = { code: string; native: string };

// Mirrors the real LANGUAGES list in lesson-capture.tsx. First three show
// inline; the rest live behind the "+N" expander.
const PRIMARY: Lang[] = [
  { code: "en-US", native: "English" },
  { code: "zh-CN", native: "中文" },
  { code: "es-ES", native: "Español" },
];
const MORE: Lang[] = [
  { code: "fr-FR", native: "Français" },
  { code: "de-DE", native: "Deutsch" },
  { code: "ja-JP", native: "日本語" },
  { code: "ko-KR", native: "한국어" },
  { code: "pt-BR", native: "Português" },
  { code: "it-IT", native: "Italiano" },
];

const REPORTS: Record<string, string> = {
  "en-US": `Hi Mia's family,
Great work today!
  • Worked on the C major scale
  • Timing was shaky — we slowed it down
Practice this week:
  • Hanon #1, hands separately
See you next Tuesday!
— Ms. Lee`,
  "zh-CN": `Mia 家长您好，
今天上得很棒！
  • 练习了 C 大调音阶
  • 节奏还不太稳，我们放慢了速度
本周练习：
  • Hanon 第 1 条，分手练
下周二见！
—— Lee 老师`,
  "es-ES": `Hola familia de Mia,
¡Gran trabajo hoy!
  • Trabajamos la escala de Do mayor
  • El ritmo fue inestable — lo bajamos
Para practicar esta semana:
  • Hanon n.º 1, manos separadas
¡Nos vemos el martes!
— Sra. Lee`,
  "fr-FR": `Bonjour à la famille de Mia,
Beau travail aujourd'hui !
  • Travaillé la gamme de do majeur
  • Le rythme était hésitant — on a ralenti
À pratiquer cette semaine :
  • Hanon n° 1, mains séparées
À mardi prochain !
— Mme Lee`,
  "de-DE": `Hallo Familie von Mia,
Tolle Arbeit heute!
  • An der C-Dur-Tonleiter gearbeitet
  • Das Timing war wacklig — wir haben es verlangsamt
Diese Woche üben:
  • Hanon Nr. 1, Hände einzeln
Bis nächsten Dienstag!
— Frau Lee`,
  "ja-JP": `Miaちゃんのご家族へ、
今日もよく頑張りました！
  • ハ長調の音階を練習しました
  • テンポが不安定だったので、ゆっくりにしました
今週の練習：
  • ハノン1番、片手ずつ
また来週の火曜日に！
— リー先生`,
  "ko-KR": `Mia 가족분께,
오늘 정말 잘했어요!
  • 다장조 음계를 연습했어요
  • 박자가 불안정해서 천천히 했어요
이번 주 연습:
  • 하논 1번, 양손 따로
다음 주 화요일에 만나요!
— 리 선생님`,
  "pt-BR": `Olá família da Mia,
Ótimo trabalho hoje!
  • Trabalhamos a escala de Dó maior
  • O ritmo estava instável — diminuímos
Para praticar esta semana:
  • Hanon nº 1, mãos separadas
Até terça-feira que vem!
— Profª Lee`,
  "it-IT": `Ciao famiglia di Mia,
Ottimo lavoro oggi!
  • Lavorato sulla scala di Do maggiore
  • Il tempo era incerto — abbiamo rallentato
Da fare questa settimana:
  • Hanon n. 1, mani separate
Ci vediamo martedì prossimo!
— Maestra Lee`,
};

function Seg({
  langs,
  active,
  onPick,
}: {
  langs: Lang[];
  active: string;
  onPick: (code: string) => void;
}) {
  return (
    <div
      className="inline-flex p-[3px] rounded-[11px]"
      style={{ backgroundColor: "var(--bg-muted)", border: "1px solid var(--line-strong)" }}
    >
      {langs.map((l) => {
        const on = l.code === active;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onPick(l.code)}
            className="text-[13px] px-[13px] py-[6px] rounded-[8px] whitespace-nowrap transition-colors"
            style={{
              backgroundColor: on ? "var(--bg-surface)" : "transparent",
              color: on ? "var(--ink-primary)" : "var(--ink-secondary)",
              boxShadow: on ? "var(--shadow-card)" : "none",
              fontWeight: on ? 500 : 400,
            }}
            aria-pressed={on}
          >
            {l.native}
          </button>
        );
      })}
    </div>
  );
}

export default function LandingTryDemo() {
  const [lang, setLang] = useState("en-US");
  const [shown, setShown] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bump, setBump] = useState(0);

  function pick(code: string) {
    setLang(code);
    if (shown) setBump((b) => b + 1);
  }

  return (
    <div
      className="mx-auto max-w-[520px] rounded-[var(--radius-card)] p-4 sm:p-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--line-strong)" }}
    >
      {/* header: label + language switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <span className="font-label text-[10px]" style={{ color: "var(--ink-tertiary)" }}>
          try it · no signup
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Seg langs={PRIMARY} active={lang} onPick={pick} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[13px] px-[9px] py-[6px] whitespace-nowrap"
            style={{ color: "var(--ink-tertiary)" }}
            aria-expanded={expanded}
          >
            {expanded ? "− less" : "+6"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex justify-end mb-3">
          <Seg langs={MORE} active={lang} onPick={pick} />
        </div>
      )}

      {/* sample (fixed, illustrative) — framed as an example, not an input,
          so visitors don't try to type into it. */}
      <p className="font-label text-[10px] mb-1.5" style={{ color: "var(--ink-tertiary)" }}>
        for example, a teacher says
      </p>
      <div
        className="flex items-start gap-2.5 rounded-[11px] p-3"
        style={{ backgroundColor: "var(--accent-soft)" }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent-ink)", marginTop: 1, flexShrink: 0 }}
          aria-hidden="true"
        >
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
        </svg>
        <span className="text-[14px] leading-[1.5] italic" style={{ color: "var(--ink-primary)" }}>
          &ldquo;worked on C major scale, timing was shaky so we slowed it down, gave Mia Hanon #1
          to practice&rdquo;
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          setShown(true);
          setBump((b) => b + 1);
        }}
        className="btn-primary w-full mt-3 h-11 flex items-center justify-center gap-2 text-[14px]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
        </svg>
        <span>{shown ? "Write it again" : "Write the note"}</span>
      </button>

      {shown && (
        <div key={bump} className="mt-3 keepsy-rise">
          <div
            className="rounded-[12px] p-3.5"
            style={{ backgroundColor: "var(--message-bg)" }}
          >
            <pre
              className="whitespace-pre-wrap text-[13.5px] leading-[1.62] m-0"
              style={{ color: "var(--message-ink)", fontFamily: "inherit" }}
            >
              {REPORTS[lang]}
            </pre>
            <div
              className="flex items-center justify-between mt-2.5 pt-2.5"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span className="text-[12px]" style={{ color: "var(--ink-secondary)" }}>
                to Mia&rsquo;s family · via text
              </span>
              <span
                className="text-[11.5px] font-medium rounded-[7px] px-2 py-1"
                style={{ backgroundColor: "#E2F0E5", color: "var(--success)" }}
              >
                ✓ ready to send
              </span>
            </div>
          </div>
          <p className="text-[12px] text-center mt-2.5" style={{ color: "var(--ink-tertiary)" }}>
            that took Keepsy about a second —{" "}
            <a href="/login" style={{ color: "var(--accent-ink)" }}>
              make a free account to send it &rarr;
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
