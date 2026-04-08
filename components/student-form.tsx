"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Student } from "@/lib/types";

interface StudentFormProps {
  student?: Student;
}

export default function StudentForm({ student }: StudentFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = !!student;

  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [billingEnabled, setBillingEnabled] = useState(
    student?.billing_enabled ?? true
  );
  const [autoRemind, setAutoRemind] = useState(
    student?.auto_remind ?? true
  );
  const [billingCycleLessons, setBillingCycleLessons] = useState(
    student?.billing_cycle_lessons?.toString() ?? "4"
  );
  const [cyclePrice, setCyclePrice] = useState(
    student?.cycle_price?.toString() ?? ""
  );
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      contact_method: phone ? "sms" as const : "email" as const,
      billing_enabled: billingEnabled,
      auto_remind: autoRemind,
      billing_cycle_lessons: billingEnabled
        ? parseInt(billingCycleLessons) || null
        : null,
      cycle_price: billingEnabled ? parseFloat(cyclePrice) || null : null,
      notes: notes || null,
      is_active: true,
      lesson_default_duration_min: null,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("students")
          .update(payload)
          .eq("id", student.id);
        if (error) throw error;
        router.push(`/students/${student.id}`);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("students")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();
        if (error) throw error;
        router.push(`/students/${data.id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Student" : "New Student"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Phone</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this student..."
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Auto lesson reminders</label>
            <Switch
              checked={autoRemind}
              onCheckedChange={setAutoRemind}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-900">Track payments</label>
            <Switch
              checked={billingEnabled}
              onCheckedChange={setBillingEnabled}
            />
          </div>

          {billingEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Lessons per billing cycle
                </label>
                <Input
                  type="number"
                  min="1"
                  value={billingCycleLessons}
                  onChange={(e) => setBillingCycleLessons(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Price per cycle ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cyclePrice}
                  onChange={(e) => setCyclePrice(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Add Student"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
