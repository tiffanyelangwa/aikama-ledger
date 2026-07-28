"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddEmployeeForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [tin, setTin] = useState("");
  const [nssfNumber, setNssfNumber] = useState("");
  const [employmentType, setEmploymentType] = useState("permanent");
  const [startDate, setStartDate] = useState("");

  const [basicSalary, setBasicSalary] = useState("");
  const [annualLeave, setAnnualLeave] = useState("0");
  const [transportAllowance, setTransportAllowance] = useState("0");
  const [overtimeBonus, setOvertimeBonus] = useState("0");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data: latestEmployee, error: fetchError } = await supabase
      .from("employees")
      .select("serial_number")
      .order("serial_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setMessage(fetchError.message);
      setLoading(false);
      return;
    }

    const nextNumber = (latestEmployee?.serial_number ?? 0) + 1;

    const { error } = await supabase
      .from("employees")
      .insert({
        serial_number: nextNumber,
        full_name: fullName,
        tin: tin || null,
        nssf_number: nssfNumber || null,
        employment_type: employmentType,
        start_date: startDate || null,

        basic_salary: Number(basicSalary),
        annual_leave: Number(annualLeave),
        transport_allowance: Number(transportAllowance),
        overtime_bonus: Number(overtimeBonus),
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Employee added successfully.");

    setFullName("");
    setTin("");
    setNssfNumber("");
    setEmploymentType("permanent");
    setStartDate("");

    setBasicSalary("");
    setAnnualLeave("0");
    setTransportAllowance("0");
    setOvertimeBonus("0");

    router.refresh();

    setLoading(false);
  }

  return (
    <div className="rounded-lg border bg-white p-5">
      <h2 className="text-lg font-semibold">
        Add Employee
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">

        <div>
          <label className="block text-sm font-medium">
            Full Name
          </label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            TIN
          </label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            NSSF Number
          </label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={nssfNumber}
            onChange={(e) => setNssfNumber(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Employment Type
          </label>

          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
          >
            <option value="permanent">Permanent</option>
            <option value="casual">Casual</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Start Date
          </label>

          <input
            type="date"
            className="mt-1 w-full rounded border px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <hr />

        <div>
          <label className="block text-sm font-medium">
            Basic Salary
          </label>

          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border px-3 py-2"
            value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Annual Leave
          </label>

          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border px-3 py-2"
            value={annualLeave}
            onChange={(e) => setAnnualLeave(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Transport Allowance
          </label>

          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border px-3 py-2"
            value={transportAllowance}
            onChange={(e) => setTransportAllowance(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Overtime / Bonus
          </label>

          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded border px-3 py-2"
            value={overtimeBonus}
            onChange={(e) => setOvertimeBonus(e.target.value)}
          />
        </div>

        <button
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Add Employee"}
        </button>

        {message && (
          <p className="text-sm text-gray-600">
            {message}
          </p>
        )}

      </form>
    </div>
  );
}