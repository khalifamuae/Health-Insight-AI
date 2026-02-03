import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TestTube, 
  CheckCircle, 
  AlertCircle, 
  Bell,
  FileText
} from "lucide-react";

interface DashboardStatsProps {
  totalTests: number;
  normalTests: number;
  abnormalTests: number;
  pendingReminders: number;
  recentUploads: number;
}

export function DashboardStats({
  totalTests,
  normalTests,
  abnormalTests,
  pendingReminders,
  recentUploads,
}: DashboardStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("totalTests"),
      value: totalTests,
      icon: TestTube,
      colorClass: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: t("normalTests"),
      value: normalTests,
      icon: CheckCircle,
      colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: t("abnormalTests"),
      value: abnormalTests,
      icon: AlertCircle,
      colorClass: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    },
    {
      label: t("pendingReminders"),
      value: pendingReminders,
      icon: Bell,
      colorClass: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: t("recentUploads"),
      value: recentUploads,
      icon: FileText,
      colorClass: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.colorClass}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
