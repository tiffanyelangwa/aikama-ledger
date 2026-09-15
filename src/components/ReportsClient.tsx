"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { accountBalance, currentMonthRange, formatMoney, netProfit, trialBalanceRows } from "@/lib/ledger";
import type { LedgerSummaryRow } from "@/types/database";

type Tab = "trial-balance" | "profit-loss" | "balance-sheet";

const TABS: { key: Tab; label: string }[] = [
  { key: "trial-balance", label: "Trial Balance" },
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "balance-sheet", label: "Balance Sheet" },
];

export default function ReportsClient() {
  const initialRange = currentMonthRange();
  const [start, setStart] = useState(initialRange.start);
  const [end, setEnd] = useState(initialRange.end);
  const [tab, setTab] = useState<Tab>("trial-balance");
  const [rows, setRows] = useState<LedgerSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!end || (tab === "profit-loss" && (!start || start > end))) {
          throw new Error("Choose valid dates; the start must not be after the end.");
        }
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc("get_ledger_summary", {
          p_period_start: tab === "profit-loss" ? start : null,
          p_period_end: end,
        });
        if (rpcError) throw new Error(rpcError.message);
        if (!data) throw new Error("No report response was returned.");
        if (!cancelled) setRows(data as LedgerSummaryRow[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [start, end, tab]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600">Start</label>
          <input
            type="date"
            disabled={tab !== "profit-loss"}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-gray-600">{tab === "profit-loss" ? `Activity from ${start} through ${end}` : `Cumulative balances through ${end}`}</p>
      <div className="mt-4">
        {loading && <p className="text-sm text-gray-400">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && tab === "trial-balance" && <TrialBalance rows={rows} />}
        {!loading && !error && tab === "profit-loss" && <ProfitAndLoss rows={rows} />}
        {!loading && !error && tab === "balance-sheet" && <BalanceSheet rows={rows} />}
      </div>
    </div>
  );
}

function TrialBalance({ rows: sourceRows }: { rows: LedgerSummaryRow[] }) {
  const rows = trialBalanceRows(sourceRows);
  const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit), 0);
  const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit), 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="px-3 py-2 font-medium">Code</th>
          <th className="px-3 py-2 font-medium">Account</th>
          <th className="px-3 py-2 font-medium">Category</th>
          <th className="px-3 py-2 font-medium text-right">Debit</th>
          <th className="px-3 py-2 font-medium text-right">Credit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code} className="border-t border-gray-50">
            <td className="px-3 py-2 font-mono text-gray-600">{r.code}</td>
            <td className="px-3 py-2 text-gray-900">{r.name}</td>
            <td className="px-3 py-2 capitalize text-gray-500">{r.category}</td>
            <td className="px-3 py-2 text-right">{formatMoney(Number(r.debit))}</td>
            <td className="px-3 py-2 text-right">{formatMoney(Number(r.credit))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-200 font-medium">
          <td className="px-3 py-2 text-gray-500" colSpan={3}>
            Totals
          </td>
          <td className="px-3 py-2 text-right">{formatMoney(totalDebit)}</td>
          <td className="px-3 py-2 text-right">{formatMoney(totalCredit)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function ProfitAndLoss({ rows }: { rows: LedgerSummaryRow[] }) {
  const revenueRows = rows.filter((r) => r.category === "revenue");
  const expenseRows = rows.filter((r) => r.category === "expense");
  const totalRevenue = revenueRows.reduce((sum, r) => sum + accountBalance(r), 0);
  const totalExpense = expenseRows.reduce((sum, r) => sum + accountBalance(r), 0);
  const net = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      <Section title="Revenue" rows={revenueRows} total={totalRevenue} />
      <Section title="Expense" rows={expenseRows} total={totalExpense} />
      <div className="flex justify-between border-t border-gray-300 pt-3 text-sm font-semibold text-gray-900">
        <span>Net profit</span>
        <span>{formatMoney(net)}</span>
      </div>
    </div>
  );
}

function BalanceSheet({ rows }: { rows: LedgerSummaryRow[] }) {
  const assetRows = rows.filter((r) => r.category === "asset");
  const liabilityRows = rows.filter((r) => r.category === "liability");
  const equityRows = rows.filter((r) => r.category === "equity");

  const totalAssets = assetRows.reduce((sum, r) => sum + accountBalance(r), 0);
  const totalLiabilities = liabilityRows.reduce((sum, r) => sum + accountBalance(r), 0);
  const totalEquityAccounts = equityRows.reduce((sum, r) => sum + accountBalance(r), 0);
  const unclosedEarnings = netProfit(rows);
  const totalEquity = totalEquityAccounts + unclosedEarnings;

  return (
    <div className="space-y-6">
      <p role="status" className={Math.round((totalAssets - totalLiabilities - totalEquity) * 100) === 0 ? "text-green-700" : "font-semibold text-red-700"}>
        Reconciliation difference (assets − liabilities − equity): {formatMoney(totalAssets - totalLiabilities - totalEquity)}
      </p>
      <Section title="Assets" rows={assetRows} total={totalAssets} />
      <Section title="Liabilities" rows={liabilityRows} total={totalLiabilities} />
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Equity</h3>
        <table className="mt-1 w-full text-sm">
          <tbody>
            {equityRows.map((r) => (
              <tr key={r.code} className="border-t border-gray-50">
                <td className="px-3 py-1.5 text-gray-700">
                  {r.code} — {r.name}
                </td>
                <td className="px-3 py-1.5 text-right">{formatMoney(accountBalance(r))}</td>
              </tr>
            ))}
            <tr className="border-t border-gray-50">
              <td className="px-3 py-1.5 text-gray-700">Unclosed earnings through end date</td>
              <td className="px-3 py-1.5 text-right">{formatMoney(unclosedEarnings)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 font-medium">
              <td className="px-3 py-1.5 text-gray-500">Total equity</td>
              <td className="px-3 py-1.5 text-right">{formatMoney(totalEquity)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex justify-between border-t border-gray-300 pt-3 text-sm font-semibold text-gray-900">
        <span>Total liabilities + equity</span>
        <span>{formatMoney(totalLiabilities + totalEquity)}</span>
      </div>
      <div className="flex justify-between text-sm font-semibold text-gray-900">
        <span>Total assets</span>
        <span>{formatMoney(totalAssets)}</span>
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  total,
}: {
  title: string;
  rows: LedgerSummaryRow[];
  total: number;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-gray-50">
              <td className="px-3 py-1.5 text-gray-700">
                {r.code} — {r.name}
              </td>
              <td className="px-3 py-1.5 text-right">{formatMoney(accountBalance(r))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-100 font-medium">
            <td className="px-3 py-1.5 text-gray-500">Total {title.toLowerCase()}</td>
            <td className="px-3 py-1.5 text-right">{formatMoney(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
