import ReportsClient from "@/components/ReportsClient";

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
      <div className="mt-6">
        <ReportsClient />
      </div>
    </div>
  );
}
