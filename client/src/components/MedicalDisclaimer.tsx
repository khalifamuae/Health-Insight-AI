import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MedicalDisclaimer() {
  const { t } = useTranslation();

  return (
    <Alert className="border-red-500 bg-red-50 dark:bg-red-950/30">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      <AlertTitle className="text-red-700 dark:text-red-300 font-bold text-base">
        {t("warning")}
      </AlertTitle>
      <AlertDescription className="text-red-600 dark:text-red-300 font-semibold">
        {t("appPurpose")}
        <br />
        {t("medicalDisclaimer")}
      </AlertDescription>
    </Alert>
  );
}
