import { NextResponse } from "next/server";
import { sendLessonReminders } from "@/lib/notifications";

// Called daily at 8 AM UTC by Vercel Cron (vercel.json).
// Vercel sends Authorization: Bearer <CRON_SECRET> automatically.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendLessonReminders(24);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
