import { useQuery } from "@tanstack/react-query";
import { TestsTable } from "@/components/TestsTable";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import type { TestResultWithDefinition } from "@shared/schema";

export default function MyTests() {
  const { data: tests = [], isLoading } = useQuery<TestResultWithDefinition[]>({
    queryKey: ["/api/tests"],
  });

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />
      <TestsTable tests={tests} isLoading={isLoading} />
    </div>
  );
}
