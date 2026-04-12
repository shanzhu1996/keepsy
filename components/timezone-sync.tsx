"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * On first app load:
 * 1. Ensures teacher_profiles row exists (creates if missing)
 * 2. Detects browser timezone and updates if set to "UTC"
 *
 * Belt-and-suspenders for the auth callback profile creation
 * which can silently fail due to RLS timing or network issues.
 */
export default function TimezoneSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      supabase
        .from("teacher_profiles")
        .select("id, timezone")
        .eq("user_id", user.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            // Profile doesn't exist — create it
            const meta = user.user_metadata;
            const name =
              meta?.full_name ||
              [meta?.first_name, meta?.last_name].filter(Boolean).join(" ") ||
              meta?.name ||
              null;

            supabase
              .from("teacher_profiles")
              .insert({
                user_id: user.id,
                name,
                email: user.email ?? null,
                default_duration_min: 60,
                timezone: detectedTz,
                updated_at: new Date().toISOString(),
              })
              .then(() => {
                // Reload to pick up the new profile in server components
                window.location.reload();
              });
          } else if (data.timezone === "UTC" && detectedTz !== "UTC") {
            // Profile exists but timezone is default — update it
            supabase
              .from("teacher_profiles")
              .update({ timezone: detectedTz, updated_at: new Date().toISOString() })
              .eq("user_id", user.id);
          }
        });
    });
  }, []);

  return null;
}
