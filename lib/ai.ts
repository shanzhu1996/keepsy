import OpenAI from "openai";
import type { GeneratedNote } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateFromTranscript(
  transcript: string,
  studentName: string,
  language: string = "English"
): Promise<GeneratedNote> {
  const firstName = studentName.split(" ")[0] || studentName;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private music teacher. The teacher just finished a lesson with ${firstName} and spoke (or typed) freely about what happened. Write BOTH outputs in ${language}. From that input, produce TWO outputs:

1. "student_message" — a short, warm, encouraging message addressed directly to ${firstName} (or their parent). 2-3 sentences, friendly tone, ready to send as a text. No bullet points. Do not sign off with a name.

2. "lesson_report" — a structured teacher report with five sections. Each section is an ARRAY of concise bullet strings. Keep the teacher's natural voice — casual, specific, no corporate fluff. Each section should have at most 1–3 bullets. Use empty arrays when a section doesn't apply — never invent content.
   - "covered": key topics, pieces, or techniques worked on (e.g. "C major scale", "Fur Elise bars 1-16").
   - "teacher_notes": the teacher's quick personal recap — what actually happened, how it went, what stood out. Write like a sticky note to yourself: "went over C major and A minor, picked up new keys quickly" or "struggled with left hand timing, needs more slow practice". Keep the teacher's words, don't over-polish or generalize. Never write generic praise like "showed improvement" — be specific.
   - "assignments": clear practice tasks for before next lesson. Each ≤12 words.
   - "next_lesson_plan": what to focus on next time.
   - "materials": resources, links, or references mentioned (optional; empty array if none).

Do not invent details. If the input is very short, keep the outputs short too.

Respond in strict JSON:
{
  "student_message": "...",
  "lesson_report": {
    "covered": ["..."],
    "teacher_notes": ["..."],
    "assignments": ["..."],
    "next_lesson_plan": ["..."],
    "materials": ["..."]
  }
}`,
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 900,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  const parsed = JSON.parse(content);
  const toStringArray = (x: unknown): string[] =>
    Array.isArray(x)
      ? x.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
  const report = (parsed.lesson_report ?? {}) as Record<string, unknown>;
  return {
    student_message:
      typeof parsed.student_message === "string" ? parsed.student_message : "",
    lesson_report: {
      covered: toStringArray(report.covered),
      teacher_notes: toStringArray(report.teacher_notes),
      assignments: toStringArray(report.assignments),
      next_lesson_plan: toStringArray(report.next_lesson_plan),
      materials: toStringArray(report.materials),
    },
  };
}

export async function generateLessonSummaries(
  rawNote: string,
  studentName: string
): Promise<{ studentSummary: string }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private teacher. Given structured lesson notes, write a friendly, encouraging message to send to the student (or their parent). Mention what was worked on, highlight positive progress, and include one specific thing to practice before next lesson. Keep it warm and brief (2-3 sentences). The student's name is ${studentName}.

Respond in JSON format: { "studentSummary": "..." }`,
      },
      { role: "user", content: rawNote },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  const parsed = JSON.parse(content);
  return { studentSummary: parsed.studentSummary ?? "" };
}

export async function structureLessonNotes(
  brainDump: string,
  studentName: string
): Promise<{ covered: string[]; teacherNotes: string; assignments: string[] }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private teacher. The teacher will give you a quick brain-dump from a lesson with ${studentName}. Your job is to organize it into three buckets:

1. "covered": array of short bullets describing what was worked on / covered in the lesson (pieces, topics, exercises, concepts).
2. "teacherNotes": a short paragraph of observations, feedback, and things to remember. Keep the teacher's voice — don't over-polish. 2-5 sentences.
3. "assignments": array of short bullets describing what the student should practice or do before the next lesson.

If a bucket has nothing relevant, return an empty array or empty string. Do not invent information.

Respond in JSON:
{
  "covered": ["..."],
  "teacherNotes": "...",
  "assignments": ["..."]
}`,
      },
      { role: "user", content: brainDump },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  const parsed = JSON.parse(content);
  return {
    covered: Array.isArray(parsed.covered) ? parsed.covered : [],
    teacherNotes: typeof parsed.teacherNotes === "string" ? parsed.teacherNotes : "",
    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
  };
}

export async function generatePaymentReminder(
  studentName: string,
  amount: number,
  lessonCount: number
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private music teacher. Generate a polite, friendly payment reminder message. Keep it brief (2-3 sentences). Don't be pushy. Include the amount and number of lessons covered.`,
      },
      {
        role: "user",
        content: `Student: ${studentName}, Amount: $${amount}, Lessons covered: ${lessonCount}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function generateLessonReminder(
  studentName: string,
  dateTime: string,
  duration: number | null
): Promise<string> {
  const date = new Date(dateTime);
  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayStr = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private music teacher. Generate a brief, friendly lesson reminder message (1-2 sentences). Include the day, time, and duration if available.`,
      },
      {
        role: "user",
        content: `Student: ${studentName}, Lesson on: ${dayStr} at ${timeStr}${duration ? `, Duration: ${duration} minutes` : ""}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function generateRescheduleMessage(
  studentName: string,
  originalDateTime: string,
  reason?: string
): Promise<string> {
  const date = new Date(originalDateTime);
  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayStr = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an assistant for a private music teacher. Generate a brief, professional cancellation/reschedule message (2-3 sentences). Be apologetic and suggest rescheduling.`,
      },
      {
        role: "user",
        content: `Student: ${studentName}, Original lesson: ${dayStr} at ${timeStr}${reason ? `, Reason: ${reason}` : ""}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function generateProgressSummary(
  lessonNotes: { date: string; covered: string[]; teacherNotes: string[]; assignments: string[]; nextPlan: string[] }[],
  studentName: string
): Promise<string> {
  const lessonsText = lessonNotes
    .map((l, i) => {
      const parts: string[] = [];
      if (l.covered.length) parts.push(`Covered: ${l.covered.join(", ")}`);
      if (l.teacherNotes.length) parts.push(`Notes: ${l.teacherNotes.join("; ")}`);
      if (l.assignments.length) parts.push(`Assignments: ${l.assignments.join(", ")}`);
      if (l.nextPlan.length) parts.push(`Next plan: ${l.nextPlan.join(", ")}`);
      return `Lesson ${i + 1} (${l.date}):\n${parts.join("\n")}`;
    })
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a private teacher's internal voice. Given notes from ${lessonNotes.length} lessons with ${studentName}, write a brief progress note to yourself.

Format: 1-2 short sentences summarizing what you've covered so far and any progress. If there's a recurring issue across lessons, add one more sentence starting with "keep an eye on" or "watch for". If no recurring issue, skip it.

Rules:
- Write in lowercase, casual teacher voice — like a sticky note to yourself
- Reference specific pieces, techniques, or concepts from the notes
- Total length: 2-3 sentences max
- Don't invent information not in the notes
- Use "${studentName.split(" ")[0]}" not "the student"

Respond in JSON: { "summary": "..." }`,
      },
      { role: "user", content: lessonsText },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  const parsed = JSON.parse(content);
  return typeof parsed.summary === "string" ? parsed.summary : "";
}
