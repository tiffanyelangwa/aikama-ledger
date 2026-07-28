import FinalizePayrollButton from "@/components/FinalizePayrollButton";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PayrollDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: run, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !run) {
    redirect("/payroll");
  }

  const { data: payslips } = await supabase
    .from("payslips")
    .select(`
      *,
      employees (
        full_name,
        serial_number
      )
    `)
    .eq("run_id", id);


  const totals = {
    gross: 0,
    nssfEmployee: 0,
    nssfEmployer: 0,
    paye: 0,
    sdl: 0,
    net: 0,
  };


  for (const slip of payslips ?? []) {
    totals.gross += Number(slip.gross_salary ?? 0);
    totals.nssfEmployee += Number(slip.nssf_employee ?? 0);
    totals.nssfEmployer += Number(slip.nssf_employer ?? 0);
    totals.paye += Number(slip.paye ?? 0);
    totals.sdl += Number(
      slip.sdl_amount ?? slip.sdl ?? 0
    );
    totals.net += Number(slip.net_salary ?? 0);
  }


  return (
    <div>

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Payroll Run
          </h1>

          <p className="mt-2 text-gray-600">
            {run.month}/{run.year}
          </p>
        </div>


        <Link
          href="/payroll"
          className="rounded border px-4 py-2"
        >
          Back
        </Link>

      </div>


      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">


        <div className="rounded border bg-white p-5">
          <p className="text-sm text-gray-500">
            Gross Salary
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totals.gross.toLocaleString()}
          </p>
        </div>


        <div className="rounded border bg-white p-5">
          <p className="text-sm text-gray-500">
            Total PAYE
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totals.paye.toLocaleString()}
          </p>
        </div>


        <div className="rounded border bg-white p-5">
          <p className="text-sm text-gray-500">
            Net Salaries
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totals.net.toLocaleString()}
          </p>
        </div>


      </div>


      <div className="mt-8 rounded border bg-white">

        <div className="border-b px-5 py-4">

          <h2 className="font-semibold">
            Payslips
          </h2>

        </div>


        <table className="w-full text-sm">

          <thead className="border-b bg-gray-50">

            <tr>

              <th className="px-4 py-3 text-left">
                Employee
              </th>

              <th className="px-4 py-3 text-right">
                Gross
              </th>

              <th className="px-4 py-3 text-right">
                PAYE
              </th>

              <th className="px-4 py-3 text-right">
                Net
              </th>

            </tr>

          </thead>


          <tbody>

            {payslips?.map((slip) => (

              <tr
                key={slip.id}
                className="border-b"
              >

                <td className="px-4 py-3">
                  <Link
                    href={`/payroll/${run.id}/payslips/${slip.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {slip.employees?.full_name}
                  </Link>
                </td>


                <td className="px-4 py-3 text-right">
                  {Number(
                    slip.gross_salary
                  ).toLocaleString()}
                </td>


                <td className="px-4 py-3 text-right">
                  {Number(
                    slip.paye
                  ).toLocaleString()}
                </td>


                <td className="px-4 py-3 text-right">
                  {Number(
                    slip.net_salary
                  ).toLocaleString()}
                </td>

              </tr>

            ))}


          </tbody>

        </table>

      </div>


      <div className="mt-8 rounded border bg-white p-6">

        <h2 className="font-semibold">
          Payroll Actions
        </h2>


        <p className="mt-2 text-sm text-gray-500">
          Finalizing payroll will create the accounting
          journal entry and lock this payroll run.
        </p>


        <FinalizePayrollButton
          payrollRunId={run.id}
        />


      </div>


    </div>
  );
}