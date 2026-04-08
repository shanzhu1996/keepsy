import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
