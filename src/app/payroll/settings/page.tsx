import { createClient } from "@/lib/supabase/server";
import PayrollSettingsForm from "@/components/PayrollSettingsForm";

export default async function PayrollSettingsPage() {

  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("payroll_settings")
    .select("*")
    .limit(1)
    .single();


  if (error) {
    return (
      <div>
        Error loading payroll settings:
        {error.message}
      </div>
    );
  }


  return (
    <div>

      <h1 className="text-3xl font-bold">
        Payroll Settings
      </h1>

      <p className="mt-2 text-gray-600">
        Configure NSSF, SDL and salary calculation rules.
      </p>


      <div className="mt-6">
        <PayrollSettingsForm settings={settings}/>
      </div>

    </div>
  );
}