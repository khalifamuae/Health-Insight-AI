import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

export function MedicalDisclaimer() {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2 px-1 py-2 text-muted-foreground" data-testid="text-disclaimer">
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">
        {t("appPurpose")} {t("medicalDisclaimer")}
      </p>
    </div>
  );
}
