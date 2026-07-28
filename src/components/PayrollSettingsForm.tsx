"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PayrollSettingsForm({
  settings,
}: {
  settings: {
    id: string;
    nssf_employee_rate: number;
    nssf_employer_rate: number;
    sdl_rate: number;
  };
}) {
  const supabase = createClient();
  const router = useRouter();

  const [employeeRate, setEmployeeRate] = useState(
    settings.nssf_employee_rate
  );

  const [employerRate, setEmployerRate] = useState(
    settings.nssf_employer_rate
  );

  const [sdlRate, setSdlRate] = useState(settings.sdl_rate);

  const [message, setMessage] = useState("");

  async function saveSettings() {
    const { error } = await supabase
      .from("payroll_settings")
      .update({
        nssf_employee_rate: employeeRate,
        nssf_employer_rate: employerRate,
        sdl_rate: sdlRate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Settings saved.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-white p-6 space-y-5">

      <div>
        <label className="block text-sm font-medium">
          NSSF Employee Contribution (%)
        </label>

        <input
          type="number"
          value={employeeRate}
          onChange={(e) =>
            setEmployeeRate(Number(e.target.value))
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>


      <div>
        <label className="block text-sm font-medium">
          NSSF Employer Contribution (%)
        </label>

        <input
          type="number"
          value={employerRate}
          onChange={(e) =>
            setEmployerRate(Number(e.target.value))
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>


      <div>
        <label className="block text-sm font-medium">
          SDL Rate (%)
        </label>

        <input
          type="number"
          value={sdlRate}
          onChange={(e) =>
            setSdlRate(Number(e.target.value))
          }
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>


      <button
        onClick={saveSettings}
        className="rounded bg-black px-4 py-2 text-white"
      >
        Save Settings
      </button>


      {message && (
        <p className="text-sm text-gray-600">
          {message}
        </p>
      )}

    </div>
  );
}