"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FinalizePayrollButton({
  payrollRunId,
}: {
  payrollRunId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFinalize() {
    setLoading(true);
    setMessage("");

    const response = await fetch(
      `/api/payroll/${payrollRunId}/finalize`,
      {
        method: "POST",
      }
    );


    if (!response.ok) {
      setMessage("Failed to finalize payroll");
      setLoading(false);
      return;
    }


    setMessage("Payroll finalized successfully");

    router.refresh();

    setLoading(false);
  }


  return (
    <div>

      <button
        onClick={handleFinalize}
        disabled={loading}
        className="rounded bg-black px-5 py-2 text-white disabled:opacity-50"
      >
        {loading
          ? "Finalizing..."
          : "Finalize Payroll"}
      </button>


      {message && (
        <p className="mt-2 text-sm text-gray-600">
          {message}
        </p>
      )}

    </div>
  );
}