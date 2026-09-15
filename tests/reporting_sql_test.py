"""Exercise the actual migration SELECT using SQLite's shared join semantics.
This is not PostgreSQL trigger, permission, or migration execution validation.
"""
import pathlib
import sqlite3
import unittest

sql = pathlib.Path('supabase/migrations/202609150001_fix_ledger_summary.sql').read_text()
query = sql.split('RETURN QUERY', 1)[1].split(';', 1)[0]
query = query.replace('public.', '').replace('::text', '')
query = query.replace('p_period_start', ':start').replace('p_period_end', ':end')

class ReportingTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.db.executescript('''
          CREATE TABLE accounts(code TEXT, name TEXT, category TEXT);
          CREATE TABLE journal_entries(id TEXT, status TEXT, entry_date TEXT);
          CREATE TABLE journal_lines(entry_id TEXT, account_code TEXT, debit NUMERIC, credit NUMERIC);
          INSERT INTO accounts VALUES ('bank','Bank','asset'),('sales','Sales','revenue'),('unused','Unused','expense');
        ''')
        for ident,status,date,amount in [('current','posted','2026-09-10',100),('pending','pending','2026-09-10',200),('rejected','rejected','2026-09-10',300),('future','posted','2026-10-01',400),('prior','posted','2026-08-31',500),('end','posted','2026-09-30',25)]:
            self.db.execute('INSERT INTO journal_entries VALUES (?,?,?)',(ident,status,date))
            self.db.executemany('INSERT INTO journal_lines VALUES (?,?,?,?)',[(ident,'bank',amount,0),(ident,'sales',0,amount)])

    def totals(self,start):
        return {r[0]:r[3:] for r in self.db.execute(query,{'start':start,'end':'2026-09-30'})}

    def test_period_excludes_unposted_prior_and_future(self):
        self.assertEqual(self.totals('2026-09-01'),{'bank':(125,0),'sales':(0,125),'unused':(0,0)})

    def test_cumulative_includes_prior_and_end_day(self):
        self.assertEqual(self.totals(None),{'bank':(625,0),'sales':(0,625),'unused':(0,0)})

if __name__ == '__main__':
    unittest.main()
