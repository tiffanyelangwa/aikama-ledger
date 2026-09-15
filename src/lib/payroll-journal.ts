import type { Account } from "@/types/database";

// Only business-verified mappings. Missing purposes must be configured explicitly.
export const PAYROLL_ACCOUNTS = {
  salaryExpense: { label: "Salary Expense", code: null, category: "expense" },
  nssfExpense: { label: "Employer NSSF Expense", code: "1430", category: "expense" },
  sdlExpense: { label: "SDL Expense", code: "1440", category: "expense" },
  nssfPayable: { label: "NSSF Payable", code: "2200", category: "liability" },
  payePayable: { label: "PAYE Payable", code: "2210", category: "liability" },
  sdlPayable: { label: "SDL Payable", code: null, category: "liability" },
  salaryPayable: { label: "Salary Payable", code: null, category: "liability" },
} as const;

type Purpose = keyof typeof PAYROLL_ACCOUNTS;
export type PayrollCodes = Record<Purpose, string>;

export function resolvePayrollAccounts(accounts: Pick<Account, "code" | "category" | "active">[]): PayrollCodes {
  const errors: string[] = [];
  const codes = {} as PayrollCodes;
  for (const [purpose, mapping] of Object.entries(PAYROLL_ACCOUNTS)) {
    if (!mapping.code) {
      errors.push(`Missing account mapping: ${mapping.label}`);
      continue;
    }
    const account = accounts.find((a) => a.code === mapping.code);
    if (!account) errors.push(`${mapping.label} (${mapping.code}) is missing or inaccessible in accounts`);
    else if (!account.active || account.category !== mapping.category) {
      errors.push(`${mapping.label} (${mapping.code}) must be an active ${mapping.category} account`);
    } else codes[purpose as Purpose] = account.code;
  }
  if (errors.length) throw new Error(`Cannot finalize payroll. ${errors.join("; ")}. No journal was created.`);
  return codes;
}

// Validate stored decimal values; never recalculate statutory deductions.
function cents(value: unknown, field: string): number {
  const text = String(value ?? "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`Invalid stored ${field}; expected a nonnegative amount with at most two decimals.`);
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error(`Stored ${field} exceeds safe precision.`);
  return amount;
}

export function buildPayrollJournal(slips: Record<string, unknown>[], codes: PayrollCodes) {
  if (!slips.length) throw new Error("No payslips found; payroll cannot be finalized.");
  const totals = { gross: 0, employee: 0, employer: 0, paye: 0, sdl: 0, net: 0 };
  for (const slip of slips) {
    if (cents(slip.salary_advance ?? 0, "salary_advance") || cents(slip.staff_loan ?? 0, "staff_loan")) {
      throw new Error("Payroll contains advance/loan recoveries without confirmed accounting mappings.");
    }
    const values = {
      gross: cents(slip.gross_salary, "gross_salary"),
      employee: cents(slip.nssf_employee, "nssf_employee"),
      employer: cents(slip.nssf_employer, "nssf_employer"),
      paye: cents(slip.paye, "paye"),
      sdl: cents(slip.sdl_amount ?? slip.sdl, "sdl"),
      net: cents(slip.net_salary, "net_salary"),
    };
    if (slip.sdl != null && slip.sdl_amount != null && cents(slip.sdl, "sdl") !== values.sdl) {
      throw new Error("Stored sdl and sdl_amount disagree; reconcile them before finalization.");
    }
    if (values.gross !== values.employee + values.paye + values.net) {
      throw new Error("Stored payslip gross salary does not reconcile to net salary and deductions.");
    }
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
      totals[key] += values[key];
      if (!Number.isSafeInteger(totals[key])) throw new Error("Payroll totals exceed safe precision.");
    }
  }
  const amounts: [Purpose, number, number][] = [
    ["salaryExpense", totals.gross, 0],
    ["nssfExpense", totals.employer, 0],
    ["sdlExpense", totals.sdl, 0],
    ["nssfPayable", 0, totals.employee + totals.employer],
    ["payePayable", 0, totals.paye],
    ["sdlPayable", 0, totals.sdl],
    ["salaryPayable", 0, totals.net],
  ];
  const debit = amounts.reduce((sum, line) => sum + line[1], 0);
  const credit = amounts.reduce((sum, line) => sum + line[2], 0);
  if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit) || debit === 0 || debit !== credit) {
    throw new Error("Generated payroll journal must have equal, positive debit and credit totals.");
  }
  return amounts.filter(([, d, c]) => d !== 0 || c !== 0).map(([purpose, d, c]) => ({
    account_code: codes[purpose], debit: d / 100, credit: c / 100,
  }));
}
