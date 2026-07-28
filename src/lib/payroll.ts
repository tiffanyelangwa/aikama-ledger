import { createClient } from "@/lib/supabase/server";


async function getAccountCode(
  supabase: any,
  name: string
) {
  const { data: account, error } = await supabase
    .from("chart_of_accounts")
    .select("code")
    .ilike("name", name)
    .single();


  if (error || !account) {
    throw new Error(
      `Missing account in chart of accounts: ${name}`
    );
  }


  return account.code;
}



export async function finalizePayroll(
  payrollRunId: string,
  userId: string
) {
  const supabase = await createClient();


  const { data: payrollRun, error: payrollError } =
    await supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", payrollRunId)
      .single();


  if (payrollError || !payrollRun) {
    throw new Error("Payroll run not found");
  }


  if (payrollRun.status === "finalized") {
    throw new Error("Payroll already finalized");
  }



  const { data: payslips, error: payslipError } =
    await supabase
      .from("payslips")
      .select("*")
      .eq("run_id", payrollRunId);


  if (payslipError || !payslips?.length) {
    throw new Error("No payslips found");
  }



  let grossSalary = 0;
  let nssfEmployee = 0;
  let nssfEmployer = 0;
  let paye = 0;
  let sdl = 0;
  let netSalary = 0;



  for (const slip of payslips) {

    grossSalary += Number(
      slip.gross_salary ?? 0
    );

    nssfEmployee += Number(
      slip.nssf_employee ?? 0
    );

    nssfEmployer += Number(
      slip.nssf_employer ?? 0
    );

    paye += Number(
      slip.paye ?? 0
    );

    sdl += Number(
      slip.sdl_amount ?? slip.sdl ?? 0
    );

    netSalary += Number(
      slip.net_salary ?? 0
    );
  }



  /*
    Get accounts dynamically
  */

  const salaryExpense =
    await getAccountCode(
      supabase,
      "Salary Expense"
    );


  const nssfPayable =
    await getAccountCode(
      supabase,
      "NSSF Payable"
    );


  const payePayable =
    await getAccountCode(
      supabase,
      "PAYE Payable"
    );


  const sdlPayable =
    await getAccountCode(
      supabase,
      "SDL Payable"
    );


  const salaryPayable =
    await getAccountCode(
      supabase,
      "Salary Payable"
    );




  const { data: journalEntry, error: journalError } =
    await supabase
      .from("journal_entries")
      .insert({
        description:
          `Payroll ${payrollRun.month}/${payrollRun.year}`,

        entry_date:
          new Date().toISOString(),

        created_by: userId,

        status: "posted",
      })
      .select()
      .single();



  if (journalError || !journalEntry) {
    throw new Error(
      journalError?.message ??
      "Failed creating journal entry"
    );
  }




  const lines = [

    {
      account_code: salaryExpense,
      debit: grossSalary,
      credit: 0,
      description:
        "Salary expense",
    },


    {
      account_code: nssfPayable,
      debit: 0,
      credit:
        nssfEmployee + nssfEmployer,
      description:
        "NSSF payable",
    },


    {
      account_code: payePayable,
      debit: 0,
      credit: paye,
      description:
        "PAYE payable",
    },


    {
      account_code: sdlPayable,
      debit: 0,
      credit: sdl,
      description:
        "SDL payable",
    },


    {
      account_code: salaryPayable,
      debit: 0,
      credit: netSalary,
      description:
        "Employee salaries payable",
    },

  ];



  const { error: lineError } =
    await supabase
      .from("journal_lines")
      .insert(
        lines.map((line) => ({
          journal_entry_id:
            journalEntry.id,

          ...line,
        }))
      );



  if (lineError) {
    throw new Error(
      lineError.message
    );
  }




  const { error: updateError } =
    await supabase
      .from("payroll_runs")
      .update({
        status: "finalized",
        journal_entry_id:
          journalEntry.id,
      })
      .eq("id", payrollRunId);



  if (updateError) {
    throw new Error(
      updateError.message
    );
  }



  return journalEntry;
}