"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { TeacherProfile } from "@/lib/settings";

interface SettingsFormProps {
  profile: TeacherProfile | null;
}

export default function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile?.name ?? "");
  const [defaultDuration, setDefaultDuration] = useState(
    profile?.default_duration_min?.toString() ?? "60"
  );
  const [hourlyRate, setHourlyRate] = useState(
    profile?.default_hourly_rate?.toString() ?? ""
  );
  const [timezone, setTimezone] = useState(
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        name: name || null,
        default_duration_min: parseInt(defaultDuration) || 60,
        default_hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        timezone,
      };

      const { error } = await supabase
        .from("teacher_profiles")
        .upsert(
          { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      {/* Teacher Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Your Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Chen"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
              />
              <p className="text-xs text-gray-500 mt-1">
                Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>

            <Separator />

            <h3 className="font-semibold text-sm">Lesson Defaults</h3>

            <div>
              <label className="text-sm font-medium block mb-1">
                Default Lesson Duration (minutes)
              </label>
              <Input
                type="number"
                min="15"
                step="15"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                placeholder="60"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pre-fills when creating new lessons.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Default Hourly Rate ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="e.g. 80"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used as reference when setting per-student billing.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving}>
              {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Signed in as{" "}
            <span className="font-medium">{profile?.email ?? "—"}</span>
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Setup Reminder */}
      <Card>
        <CardHeader>
          <CardTitle>Database Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            If the Settings page shows errors, make sure you&apos;ve run this
            SQL in your Supabase SQL Editor:
          </p>
          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
{`create table teacher_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  default_duration_min integer not null default 60,
  default_hourly_rate numeric(10,2),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);
alter table teacher_profiles enable row level security;
create policy "Users manage own profile"
  on teacher_profiles for all using (auth.uid() = user_id);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
