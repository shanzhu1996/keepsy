"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Detects the browser timezone and updates the teacher profile
 * if it's currently set to "UTC" (the default from signup).
 * Runs once on first app load, then never again.
 */
export default function TimezoneSync() {
  useEffect(() => {
    const key = "keepsy:tz-synced";
    if (typeof window === "undefined") return;
    if (localStorage.getItem(key)) return;

    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detectedTz || detectedTz === "UTC") return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("teacher_profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.timezone === "UTC" || !data?.timezone) {
            supabase
              .from("teacher_profiles")
              .update({ timezone: detectedTz, updated_at: new Date().toISOString() })
              .eq("user_id", user.id)
              .then(() => {
                localStorage.setItem(key, "1");
              });
          } else {
            // Already has a real timezone, no need to check again
            localStorage.setItem(key, "1");
          }
        });
    });
  }, []);

  return null;
}
