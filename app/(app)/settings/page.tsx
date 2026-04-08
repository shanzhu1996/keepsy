import Link from "next/link";
import { getProfile } from "@/lib/settings";
import SettingsForm from "@/components/settings-form";

export default async function SettingsPage() {
  const profile = await getProfile();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <SettingsForm profile={profile} />

      <div className="mt-8 border-t pt-6">
        <Link
          href="/settings/templates"
          className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
        >
          <div>
            <p className="font-medium">Note Templates</p>
            <p className="text-sm text-gray-500">
              Create reusable lesson note templates
            </p>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>
    </div>
  );
}
