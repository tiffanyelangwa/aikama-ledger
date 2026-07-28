import { createClient } from "@/lib/supabase/server";
import Link from "next/link";


export default async function PayrollPage() {
  const supabase = await createClient();


  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("created_at", {
      ascending: false,
    });



  return (
    <div>

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Payroll
          </h1>

          <p className="mt-2 text-gray-600">
            Manage monthly payroll runs, employees, and payslips.
          </p>
        </div>


        <div className="flex gap-3">
          <Link
            href="/payroll/new"
            className="rounded bg-black px-4 py-2 text-white"
          >
            New Payroll Run
          </Link>

          <Link
            href="/employees"
            className="rounded border px-4 py-2"
          >
            Employees
          </Link>

          <Link
            href="/payroll/settings"
            className="rounded border px-4 py-2"
          >
            Payroll Settings
          </Link>
        </div>

      </div>



      <div className="mt-8 rounded-lg border bg-white">


        <div className="border-b px-6 py-4">

          <h2 className="font-semibold">
            Payroll Runs
          </h2>

        </div>



        <table className="w-full text-sm">


          <thead className="border-b bg-gray-50">

            <tr>

              <th className="px-4 py-3 text-left">
                Period
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

              <th className="px-4 py-3 text-left">
                Created
              </th>

              <th className="px-4 py-3 text-right">
                Action
              </th>

            </tr>

          </thead>



          <tbody>

            {payrollRuns?.map((run) => (

              <tr
                key={run.id}
                className="border-b"
              >

                <td className="px-4 py-3">
                  {run.month}/{run.year}
                </td>


                <td className="px-4 py-3 capitalize">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {run.status}
                  </span>
                </td>


                <td className="px-4 py-3">
                  {new Date(
                    run.created_at
                  ).toLocaleDateString()}
                </td>


                <td className="px-4 py-3 text-right">

                  <Link
                    href={`/payroll/${run.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>

                </td>

              </tr>

            ))}



            {(!payrollRuns ||
              payrollRuns.length === 0) && (

              <tr>

                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  No payroll runs yet.
                </td>

              </tr>

            )}

          </tbody>


        </table>


      </div>


    </div>
  );
}