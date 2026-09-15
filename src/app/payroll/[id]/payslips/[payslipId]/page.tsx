import { createClient } from "@/lib/supabase/server";
import Link from "next/link";


export default async function PayslipPage({
  params,
}: {
  params: Promise<{
    id: string;
    payslipId: string;
  }>;
}) {
  const { id, payslipId } = await params;

  const supabase = await createClient();


  const { data: payslip, error } = await supabase
    .from("payslips")
    .select(`
      *,
      employees (
        full_name,
        serial_number,
        tin,
        nssf_number
      ),
      payroll_runs (
        month,
        year
      )
    `)
    .eq("id", payslipId)
    .eq("run_id", id)
    .single();



  if (error || !payslip) {
    return <p role="alert" className="text-red-700">Cannot load payslip: {error?.message ?? "not found"}</p>;
  }



  if (!payslip.employees || !payslip.payroll_runs) return <p role="alert">Employee or payroll details are inaccessible.</p>;

  return (

    <div className="mx-auto max-w-3xl">

      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-3xl font-bold">
            Payslip
          </h1>

          <p className="mt-2 text-gray-600">
            {payslip.payroll_runs.month}/
            {payslip.payroll_runs.year}
          </p>

        </div>


        <Link
          href={`/payroll/${id}`}
          className="rounded border px-4 py-2"
        >
          Back
        </Link>

      </div>



      <div className="mt-8 rounded-lg border bg-white p-6">


        <h2 className="text-xl font-semibold">
          {payslip.employees.full_name}
        </h2>


        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">

          <p>
            Employee No:
            {" "}
            {payslip.employees.serial_number}
          </p>

          <p>
            TIN:
            {" "}
            {payslip.employees.tin ?? "-"}
          </p>

          <p>
            NSSF:
            {" "}
            {payslip.employees.nssf_number ?? "-"}
          </p>

        </div>



        <div className="mt-8 space-y-3">


          <div className="flex justify-between">
            <span>
              Basic Salary
            </span>

            <span>
              {Number(
                payslip.basic_salary
              ).toLocaleString()}
            </span>
          </div>



          <div className="flex justify-between">
            <span>
              Gross Salary
            </span>

            <span>
              {Number(
                payslip.gross_salary
              ).toLocaleString()}
            </span>
          </div>



          <div className="flex justify-between">
            <span>
              NSSF Employee
            </span>

            <span>
              {Number(
                payslip.nssf_employee
              ).toLocaleString()}
            </span>
          </div>



          <div className="flex justify-between">
            <span>
              PAYE
            </span>

            <span>
              {Number(
                payslip.paye
              ).toLocaleString()}
            </span>
          </div>



          <div className="flex justify-between">
            <span>
              SDL
            </span>

            <span>
              {Number(
                payslip.sdl_amount ?? payslip.sdl
              ).toLocaleString()}
            </span>
          </div>



          <hr />



          <div className="flex justify-between font-bold text-lg">

            <span>
              Net Salary
            </span>

            <span>
              {Number(
                payslip.net_salary
              ).toLocaleString()}
            </span>

          </div>


        </div>


      </div>

    </div>

  );
}