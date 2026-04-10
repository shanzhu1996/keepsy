import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { orderedIds } = (await request.json()) as { orderedIds: string[] };
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update each student's display_order based on array position
    const updates = orderedIds.map((id, index) =>
      supabase
        .from("students")
        .update({ display_order: index + 1 })
        .eq("id", id)
        .eq("user_id", user.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
