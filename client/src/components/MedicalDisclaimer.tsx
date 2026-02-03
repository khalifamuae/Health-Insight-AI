import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MedicalDisclaimer() {
  const { t } = useTranslation();

  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
        {t("medicalDisclaimer")}
      </AlertDescription>
    </Alert>
  );
}
