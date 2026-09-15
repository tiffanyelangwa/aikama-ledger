const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, (name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  });
  return module.exports;
}
const ledger = load('src/lib/ledger.ts');
const payroll = load('src/lib/payroll-journal.ts');
const codes = Object.fromEntries(Object.keys(payroll.PAYROLL_ACCOUNTS).map(k => [k, `test-${k}`]));
const confirmed = [
  { code: '1430', category: 'expense', active: true },
  { code: '1440', category: 'expense', active: true },
  { code: '2200', category: 'liability', active: true },
  { code: '2210', category: 'liability', active: true },
];
const slip = {
  gross_salary: '1000.00', nssf_employee: '100.00', nssf_employer: '100.00',
  paye: '50.00', sdl: '35.00', sdl_amount: '35.00', net_salary: '850.00',
};

test('month ends cover leap years, century years, and short months', () => {
  for (const [year, month, end] of [[2024,2,'2024-02-29'],[2026,2,'2026-02-28'],[2100,2,'2100-02-28'],[2000,2,'2000-02-29'],[2026,9,'2026-09-30'],[2026,12,'2026-12-31']]) {
    assert.equal(ledger.monthRange(year, month).end, end);
  }
  for (const [y,m] of [[2026,0],[2026,13],[0,1],[10000,1],[2026,1.5],[NaN,2],[Infinity,1]]) assert.throws(() => ledger.monthRange(y,m));
});

test('Tanzania month boundaries do not shift under host timezone', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'Africa/Dar_es_Salaam';
    const a = ledger.currentMonthRange();
    process.env.TZ = 'America/Los_Angeles';
    assert.deepEqual(ledger.currentMonthRange(), a);
    assert.match(a.start, /-01$/);
    assert.equal(a.end, ledger.monthRange(Number(a.start.slice(0,4)), Number(a.start.slice(5,7))).end);
  } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
});

test('trial balance nets each account; prior unclosed earnings reconcile equity', () => {
  const rows = [
    { code:'bank',name:'Bank',category:'asset',debit:100,credit:20 },
    { code:'sales',name:'Sales',category:'revenue',debit:0,credit:100 },
    { code:'expense',name:'Expense',category:'expense',debit:20,credit:0 },
  ];
  const tb = ledger.trialBalanceRows(rows);
  assert.deepEqual([tb[0].debit,tb[0].credit],[80,0]);
  assert.equal(tb.reduce((s,r)=>s+r.debit-r.credit,0),0);
  assert.equal(ledger.netProfit(rows),80);
  assert.equal(ledger.accountBalance(rows[0])-ledger.netProfit(rows),0);
});

test('all three missing mappings are named; confirmed accounts are validated', () => {
  assert.throws(() => payroll.resolvePayrollAccounts(confirmed), (e) => {
    for (const label of ['Salary Expense','SDL Payable','Salary Payable']) assert.ok(e.message.includes(`Missing account mapping: ${label}`));
    assert.ok(!e.message.includes('1430'));
    return true;
  });
  assert.throws(() => payroll.resolvePayrollAccounts(confirmed.map(a => ({...a,active:false}))), /must be an active/);
  assert.throws(() => payroll.resolvePayrollAccounts(confirmed.map(a => ({...a,category:'asset'}))), /must be an active/);
});

test('stored payroll produces seven balanced expense/liability legs', () => {
  const lines = payroll.buildPayrollJournal([slip], codes);
  assert.equal(lines.length,7);
  assert.equal(lines.reduce((s,l)=>s+Math.round(l.debit*100)-Math.round(l.credit*100),0),0);
  assert.equal(lines.find(l=>l.account_code===codes.nssfExpense).debit,100);
  assert.equal(lines.find(l=>l.account_code===codes.sdlExpense).debit,35);
  assert.equal(lines.find(l=>l.account_code===codes.nssfPayable).credit,200);
});

test('zero statutory amounts produce only salary expense/payable lines', () => {
  const lines = payroll.buildPayrollJournal([{gross_salary:100,nssf_employee:0,nssf_employer:0,paye:0,sdl:0,net_salary:100}], codes);
  assert.equal(lines.length,2);
});

test('reject inconsistent amounts, duplicate SDL disagreements, loans and empty payroll', () => {
  for (const patch of [{net_salary:849.99},{sdl:34},{paye:-1},{paye:NaN},{paye:'50.001'},{gross_salary:null},{staff_loan:1}]) {
    assert.throws(() => payroll.buildPayrollJournal([{...slip,...patch}], codes));
  }
  assert.throws(() => payroll.buildPayrollJournal([],codes));
});

test('finalization reads only canonical account metadata and never writes without mappings', async () => {
  const calls=[];
  const client={from(table) {
    calls.push(table);
    assert.equal(table,'accounts');
    return { select(columns) {
      assert.equal(columns,'code, category, active');
      return { in: async () => ({data:confirmed,error:null}) };
    }};
  }};
  const finalizer=load('src/lib/payroll.ts', {
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/lib/payroll-journal':payroll, '@/lib/ledger':ledger,
  });
  await assert.rejects(finalizer.finalizePayroll('test-run','test-user'), /Missing account mapping: Salary Expense.*SDL Payable.*Salary Payable/);
  assert.deepEqual(calls,['accounts']);
});

test('closing entries transfer earnings to equity without counting them twice', () => {
  const rows = [
    {code:'bank',name:'Bank',category:'asset',debit:100,credit:20},
    {code:'sales',name:'Sales',category:'revenue',debit:100,credit:100},
    {code:'retained',name:'Retained earnings',category:'equity',debit:0,credit:100},
    {code:'expense',name:'Expense',category:'expense',debit:20,credit:0},
  ];
  assert.equal(ledger.netProfit(rows),-20);
  assert.equal(ledger.accountBalance(rows[0]),ledger.accountBalance(rows[2])+ledger.netProfit(rows));
});
