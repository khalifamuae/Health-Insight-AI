import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AllTestsTable } from "@/components/AllTestsTable";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Button } from "@/components/ui/button";
import { GitCompareArrows } from "lucide-react";
import type { AllTestsData } from "@shared/schema";

export default function MyTests() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { data: tests = [], isLoading } = useQuery<AllTestsData[]>({
    queryKey: ["/api/tests/all"],
  });

  return (
    <div className="space-y-4">
      <MedicalDisclaimer />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div />
        <Button
          variant="outline"
          onClick={() => setLocation("/compare")}
          data-testid="button-compare-results"
        >
          <GitCompareArrows className="h-4 w-4 me-2" />
          {t("compareResults")}
        </Button>
      </div>

      <AllTestsTable tests={tests} isLoading={isLoading} />
    </div>
  );
}
