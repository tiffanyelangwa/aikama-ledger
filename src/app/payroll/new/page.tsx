import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { monthRange, currentMonthRange } from "@/lib/ledger";
import { getCurrentProfile } from "@/lib/auth";

export default async function NewPayrollRunPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: actionError } = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("*")
    .eq("active", true)
    .order("serial_number");

  if (employeesError) return <p role="alert">Cannot load employees: {employeesError.message}</p>;
  const [year, month] = currentMonthRange().start.split("-").map(Number);

  const monthName = new Date(
    year,
    month - 1,
    1
  ).toLocaleString("default", {
    month: "long",
  });

  async function createPayroll(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const profile = await getCurrentProfile();

    if (!profile) {
      redirect("/login");
    }

    try {
      const month = Number(formData.get("month"));
      const year = Number(formData.get("year"));
      const period = monthRange(year, month);
      const { data: employees, error: employeeError } = await supabase
        .from("employees").select("*").eq("active", true);
      if (employeeError) throw new Error(`Cannot load employees: ${employeeError.message}`);
      if (!employees?.length) throw new Error("No active employees are available. Check employee access before generating payroll.");
      const { data: settings, error: settingsError } = await supabase
        .from("payroll_settings").select("*").limit(1).single();
      if (settingsError || !settings) throw new Error(`Cannot load payroll settings: ${settingsError?.message ?? "not found"}`);
      const { data: run, error: runError } = await supabase
        .from("payroll_runs").insert({
          month, year, period_start: period.start, period_end: period.end,
          status: "draft", created_by: profile.id,
        }).select().single();
      if (runError || !run) throw new Error(`Cannot create payroll: ${runError?.message ?? "no run returned"}`);

      for (const employee of employees) {
        const basicSalary =
          Number(employee.basic_salary ?? 0);

        const annualLeave = 0;
        const overtime = 0;

        const grossSalary =
          basicSalary +
          annualLeave +
          overtime;

        /*
        ---------------------------------
        NSSF
        ---------------------------------
        */

        const employeeRate =
          Number(settings?.nssf_employee_rate ?? 10);

        const employerRate =
          Number(settings?.nssf_employer_rate ?? 10);

        const sdlRate =
          Number(settings?.sdl_rate ?? 3.5);

        const nssfEmployee =
          grossSalary *
          employeeRate /
          100;

        const nssfEmployer =
          grossSalary *
          employerRate /
          100;

        /*
        ---------------------------------
        TAXABLE PAY
        ---------------------------------
        */

        const taxablePay =
          grossSalary -
          nssfEmployee;

        /*
        ---------------------------------
        PAYE
        Placeholder
        Will replace with Tanzania
        tax brackets later.
        ---------------------------------
        */

        let paye = 0;

        // Tanzania PAYE brackets
        if (taxablePay <= 270000) {
          paye = 0;
        } else if (taxablePay <= 520000) {
          paye =
            (taxablePay - 270000) * 0.08;
        } else if (taxablePay <= 760000) {
          paye =
            20000 +
            (taxablePay - 520000) * 0.20;
        } else if (taxablePay <= 1000000) {
          paye =
            68000 +
            (taxablePay - 760000) * 0.25;
        } else {
          paye =
            128000 +
            (taxablePay - 1000000) * 0.30;
        }

        /*
        ---------------------------------
        SDL
        ---------------------------------
        */

        const sdlAmount =
          grossSalary *
          sdlRate /
          100;

        /*
        ---------------------------------
        DEDUCTIONS
        ---------------------------------
        */

        const salaryAdvance = 0;
        const staffLoan = 0;

        const netSalary =
          grossSalary -
          nssfEmployee -
          paye -
          salaryAdvance -
          staffLoan;

        /*
        ---------------------------------
        SAVE PAYSLIP
        ---------------------------------
        */

        const { error: payslipError } = await supabase
          .from("payslips")
          .insert({
            run_id: run.id,
            employee_id: employee.id,

            basic_salary: basicSalary,

            allowances: overtime + annualLeave,

            annual_leave: annualLeave,

            overtime: overtime,

            gross_salary: grossSalary,

            nssf_employee: nssfEmployee,

            nssf_employer: nssfEmployer,

            taxable_pay: taxablePay,

            paye: paye,

            sdl: sdlAmount,

            sdl_amount: sdlAmount,

            salary_advance: salaryAdvance,

            staff_loan: staffLoan,

            net_salary: netSalary,
          });

        if (payslipError) {
          throw new Error(`Payroll run ${run.id} is incomplete: ${payslipError.message}. Do not generate a replacement without reviewing this draft.`);
        }
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Payroll generation failed.";
      redirect(`/payroll/new?error=${encodeURIComponent(message)}`);
    }
    redirect("/payroll");
  }

  return (
    <div className="mx-auto max-w-5xl">
      {actionError && <p role="alert" className="mb-4 text-red-700">{actionError}</p>}

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            New Payroll Run
          </h1>

          <p className="mt-2 text-gray-600">
            Generate payroll for all active employees.
          </p>

        </div>

        <Link
          href="/payroll"
          className="rounded border px-4 py-2"
        >
          Back
        </Link>

      </div>

      <form
        action={createPayroll}
        className="rounded-lg border bg-white p-6"
      >

        <div className="grid grid-cols-2 gap-6">

          <div>

            <label className="block text-sm font-medium">
              Month
            </label>

            <select
              name="month"
              defaultValue={month}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <option
                  key={index + 1}
                  value={index + 1}
                >
                  {new Date(
                    2026,
                    index,
                    1
                  ).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>

          </div>

          <div>

            <label className="block text-sm font-medium">
              Year
            </label>

            <input
              type="number"
              name="year"
              min="1" max="9999" step="1" required
              defaultValue={year}
              className="mt-1 w-full rounded border px-3 py-2"
            />

          </div>

        </div>

        <div className="mt-8 rounded border bg-gray-50 p-4">

          <h2 className="font-semibold">
            Payroll Preview
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Payroll will be created for
            {" "}
            <strong>
              {employees?.length ?? 0}
            </strong>
            {" "}
            active employee(s).
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Default payroll period:
            {" "}
            <strong>
              {monthName} {year}
            </strong>
          </p>

        </div>
                <div className="mt-8 rounded-lg border">

          <table className="w-full text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="px-4 py-3 text-left">
                  Employee No.
                </th>

                <th className="px-4 py-3 text-left">
                  Employee
                </th>

                <th className="px-4 py-3 text-left">
                  Type
                </th>

              </tr>

            </thead>

            <tbody>

              {employees?.map((employee) => (

                <tr
                  key={employee.id}
                  className="border-b"
                >

                  <td className="px-4 py-3">
                    {employee.serial_number ?? "-"}
                  </td>

                  <td className="px-4 py-3">
                    {employee.full_name}
                  </td>

                  <td className="px-4 py-3 capitalize">
                    {employee.employment_type}
                  </td>

                </tr>

              ))}

              {employees?.length === 0 && (

                <tr>

                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No active employees.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

        <div className="mt-8 flex justify-end gap-3">

          <Link
            href="/payroll"
            className="rounded border px-4 py-2"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="rounded bg-black px-5 py-2 text-white"
          >
            Generate Payroll
          </button>

        </div>

      </form>

    </div>
  );
}