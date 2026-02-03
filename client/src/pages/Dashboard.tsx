import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/components/DashboardStats";
import { TestsTable } from "@/components/TestsTable";
import { RemindersCard } from "@/components/RemindersCard";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
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
