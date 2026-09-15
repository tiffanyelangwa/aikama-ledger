"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

    try {
      const response = await fetch(`/api/payroll/${payrollRunId}/finalize`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? "Could not finalize payroll. Check your session and try again.");
      }
      setMessage("Payroll finalized successfully");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Network error while finalizing payroll.");
    } finally {
      setLoading(false);
    }
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
        <p role="status" className="mt-2 text-sm text-gray-600">
          {message}
        </p>
      )}

    </div>
  );
}