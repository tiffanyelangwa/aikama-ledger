import { createClient } from "@/lib/supabase/server";
import AddEmployeeForm from "@/components/AddEmployeeForm";
import EditEmployeeSalary from "@/components/EditEmployeeSalary";

export default async function EmployeesPage() {
  const supabase = await createClient();

  const { data: employees, error } = await supabase
    .from("employees")
    .select("*")
    .order("full_name");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Employees
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Manage permanent and casual employees.
      </p>

      {error && (
        <p className="mt-4 text-red-600">
          {error.message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Employee table */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Employee No.</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">TIN</th>
                  <th className="px-4 py-3 text-left">NSSF</th>
                  <th className="px-4 py-3 text-right">Basic Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {employees?.map((employee) => (
                  <tr key={employee.id} className="border-b">
                    <td className="px-4 py-3">
                      {employee.serial_number ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {employee.full_name}
                    </td>

                    <td className="px-4 py-3 capitalize">
                      {employee.employment_type}
                    </td>

                    <td className="px-4 py-3">
                      {employee.tin ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {employee.nssf_number ?? "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                  <EditEmployeeSalary
                    employeeId={employee.id}
                    currentSalary={Number(employee.basic_salary ?? 0)}
                  />
                </td>

                <td className="px-4 py-3 text-center">
                      {employee.active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}

                {employees?.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No employees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add employee form */}
        <div>
          <AddEmployeeForm />
        </div>

      </div>
    </div>
  );
}