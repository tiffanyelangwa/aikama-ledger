import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";


export default function EditEmployeeSalary({
  employeeId,
  currentSalary,
}: {
  employeeId: string;
  currentSalary: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [salary, setSalary] = useState(
    currentSalary
  );

  const [loading, setLoading] = useState(false);


  async function saveSalary() {
    setLoading(true);


    const { error } = await supabase
      .from("employees")
      .update({
        basic_salary: salary,
      })
      .eq("id", employeeId);


    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }


    router.refresh();

    setLoading(false);
  }


  return (
    <div className="flex items-center gap-2">

      <input
        type="number"
        value={salary}
        onChange={(e) =>
          setSalary(
            Number(e.target.value)
          )
        }
        className="w-32 rounded border px-2 py-1"
      />


      <button
        onClick={saveSalary}
        disabled={loading}
        className="rounded bg-black px-3 py-1 text-white"
      >
        {loading ? "Saving..." : "Save"}
      </button>

    </div>
  );
}