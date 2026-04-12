import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Auto-create teacher profile for new users
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: existing } = await supabase
            .from("teacher_profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (!existing) {
            const meta = user.user_metadata;
            const name =
              meta?.full_name ||
              [meta?.first_name, meta?.last_name]
                .filter(Boolean)
                .join(" ") ||
              meta?.name ||
              null;

            await supabase.from("teacher_profiles").insert({
              user_id: user.id,
              name,
              email: user.email ?? null,
              default_duration_min: 60,
              timezone: "UTC",
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Don't block redirect if profile creation fails
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
