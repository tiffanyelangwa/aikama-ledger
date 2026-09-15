-- Apply alongside the report UI change. NULL start means cumulative;
-- a non-NULL start means period activity for ALL account categories.
-- Preserves the existing signature and grants. No record or RLS changes.
BEGIN;

-- Do not silently change an existing SECURITY DEFINER authorization path.
-- Such a deployment needs its live function privileges reviewed first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid = to_regprocedure('public.get_ledger_summary(date,date)')
      AND prosecdef
  ) THEN
    RAISE EXCEPTION 'Reporting function is SECURITY DEFINER; review live authorization before applying this migration';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ledger_summary(p_period_start date, p_period_end date)
RETURNS TABLE (code text, name text, category text, debit numeric, credit numeric)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
BEGIN
  IF p_period_end IS NULL OR p_period_start > p_period_end THEN
    RAISE EXCEPTION 'An end date is required and start must not be after end';
  END IF;
  RETURN QUERY
  WITH posted_totals AS (
    SELECT jl.account_code, SUM(jl.debit) AS debit, SUM(jl.credit) AS credit
    FROM public.journal_lines jl
    JOIN public.journal_entries je ON je.id = jl.entry_id
    WHERE je.status = 'posted'
      AND je.entry_date <= p_period_end
      AND (p_period_start IS NULL OR je.entry_date >= p_period_start)
    GROUP BY jl.account_code
  )
  SELECT a.code::text, a.name::text, a.category::text,
         COALESCE(t.debit, 0), COALESCE(t.credit, 0)
  FROM public.accounts a
  LEFT JOIN posted_totals t ON t.account_code = a.code
  ORDER BY a.code;
END;
$$;

COMMIT;
