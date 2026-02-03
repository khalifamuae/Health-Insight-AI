import { useQuery } from "@tanstack/react-query";
import { AllTestsTable } from "@/components/AllTestsTable";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import type { AllTestsData } from "@shared/schema";

export default function MyTests() {
  const { data: tests = [], isLoading } = useQuery<AllTestsData[]>({
    queryKey: ["/api/tests/all"],
  });

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />
      <AllTestsTable tests={tests} isLoading={isLoading} />
    </div>
  );
}
