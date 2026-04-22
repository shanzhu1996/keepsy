import { createClient } from "@/lib/supabase/server";

/**
 * Returns whether the current request has an authenticated user. Cheap to
 * call during server-side rendering; used by public pages to decide whether
 * to show "log in / get started" vs "go to dashboard" CTAs.
 */
export async function getLoggedIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}
