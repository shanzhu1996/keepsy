"use client";

import { useEffect } from "react";
import type { LessonReport } from "@/lib/types";

interface PrintReportProps {
  studentName: string;
  dateLabel: string;
  timeLabel: string;
  durationMin: number | null;
  report: LessonReport;
  teacherName?: string | null;
}

const SECTIONS: { key: keyof LessonReport; label: string }[] = [
  { key: "covered", label: "Covered" },
  { key: "assignments", label: "Assignments" },
  { key: "next_lesson_plan", label: "Next Class" },
  { key: "materials", label: "Materials" },
];

export default function PrintReport({
  studentName,
  dateLabel,
  timeLabel,
  durationMin,
  report,
  teacherName,
}: PrintReportProps) {
  const teacherFirst = teacherName?.split(" ")[0] ?? null;

  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const visibleSections = SECTIONS.filter(
    ({ key }) => report[key].filter(Boolean).length > 0
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0.8in 0.9in;
            size: letter;
          }
          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-toolbar {
            display: none !important;
          }
        }

        /* Reset everything — standalone document, no app styles */
        .report-page * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
      `}</style>

      <div
        className="report-page"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#fff",
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "620px",
            margin: "0 auto",
            padding: "40px 48px 60px",
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: "#2B1F17",
          }}
        >
          {/* Screen-only toolbar */}
          <div
            className="report-toolbar"
            style={{
              marginBottom: "36px",
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: "8px 20px",
                backgroundColor: "#A5522A",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Save as PDF
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              style={{
                fontSize: "14px",
                color: "#6B5644",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Close
            </button>
          </div>

          {/* Accent top rule */}
          <div
            style={{
              width: "40px",
              height: "3px",
              backgroundColor: "#A5522A",
              borderRadius: "2px",
              marginBottom: "28px",
            }}
          />

          {/* Header — two-column layout */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "32px",
              paddingBottom: "24px",
              borderBottom: "1px solid #E4DAC7",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Lesson Summary
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "#2B1F17",
                  marginTop: "6px",
                  fontWeight: 600,
                }}
              >
                {studentName}
              </p>
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: "13px",
                color: "#6B5644",
                lineHeight: 1.6,
              }}
            >
              <div>{dateLabel}</div>
              <div>
                {timeLabel}
                {durationMin ? ` · ${durationMin} min` : ""}
              </div>
            </div>
          </header>

          {/* Sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {visibleSections.map(({ key, label }) => {
              const items = report[key].filter(Boolean);
              return (
                <section key={key}>
                  <h2
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#9D8A76",
                      marginBottom: "8px",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    {label}
                  </h2>
                  <div style={{ paddingLeft: "2px" }}>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "baseline",
                          marginBottom: "3px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "8px",
                            color: "#9D8A76",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          ●
                        </span>
                        <span
                          style={{
                            fontSize: "13.5px",
                            lineHeight: 1.65,
                            color: "#2B1F17",
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Footer */}
          {teacherFirst && (
            <footer
              style={{
                marginTop: "44px",
                paddingTop: "14px",
                borderTop: "1px solid #E4DAC7",
                fontSize: "11px",
                color: "#9D8A76",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {teacherFirst}
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
