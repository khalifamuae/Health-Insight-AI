import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardStats } from "@/components/DashboardStats";
import { TestsTable } from "@/components/TestsTable";
import { RemindersCard } from "@/components/RemindersCard";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Salad, GitCompareArrows } from "lucide-react";
import type { TestResultWithDefinition, Reminder, TestDefinition } from "@shared/schema";

interface DashboardStats {
  totalTests: number;
  normalTests: number;
  abnormalTests: number;
  pendingReminders: number;
  recentUploads: number;
}

interface ReminderWithDefinition extends Reminder {
  testDefinition: TestDefinition;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const { data: tests = [], isLoading: testsLoading } = useQuery<TestResultWithDefinition[]>({
    queryKey: ["/api/tests"],
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<ReminderWithDefinition[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const normalTests = tests.filter(t => t.status === "normal").length;
  const abnormalTests = tests.filter(t => t.status === "low" || t.status === "high").length;

  return (
    <div className="space-y-6">
      <MedicalDisclaimer />

      <DashboardStats
        totalTests={stats?.totalTests ?? tests.length}
        normalTests={stats?.normalTests ?? normalTests}
        abnormalTests={stats?.abnormalTests ?? abnormalTests}
        pendingReminders={stats?.pendingReminders ?? reminders.length}
        recentUploads={stats?.recentUploads ?? 0}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/diet")} data-testid="card-diet-shortcut">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-2">
              <Salad className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t("dietPlan")}</p>
              <p className="text-xs text-muted-foreground truncate">{t("dietPlanDescription")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setLocation("/compare")} data-testid="card-compare-shortcut">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-2">
              <GitCompareArrows className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t("compareResults")}</p>
              <p className="text-xs text-muted-foreground truncate">{t("noComparisonHint")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TestsTable tests={tests} isLoading={testsLoading} />
        </div>
        <div>
          <RemindersCard 
            reminders={reminders.map((r) => ({
              id: r.id,
              testName: r.testDefinition?.nameEn || "Test",
              testNameAr: r.testDefinition?.nameAr || "فحص",
              dueDate: new Date(r.dueDate),
              sent: r.sent ?? false,
            }))} 
            isLoading={remindersLoading} 
          />
        </div>
      </div>
    </div>
  );
}
