import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import type { TestStatus } from "@shared/schema";

interface TestStatusBadgeProps {
  status: TestStatus;
}

export function TestStatusBadge({ status }: TestStatusBadgeProps) {
  const { t } = useTranslation();

  if (status === "normal") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
        <Check className="h-3 w-3 me-1" />
        {t("normal")}
      </Badge>
    );
  }

  if (status === "low") {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
        <ArrowDown className="h-3 w-3 me-1" />
        Low
      </Badge>
    );
  }

  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
      <ArrowUp className="h-3 w-3 me-1" />
      High
    </Badge>
  );
}
