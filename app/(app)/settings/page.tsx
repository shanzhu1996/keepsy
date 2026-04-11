import Link from "next/link";
import { getProfile } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();

  return (
    <div>
      <SettingsForm profile={profile} authEmail={user?.email ?? null} />
    </div>
  );
}
