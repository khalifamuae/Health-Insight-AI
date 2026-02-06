import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, GitCompareArrows } from "lucide-react";
import type { TestResultWithDefinition, TestCategory } from "@shared/schema";

const categoryIcons: Record<TestCategory, string> = {
  vitamins: "💊",
  minerals: "🪨",
  hormones: "🧬",
  organ_functions: "🫀",
  lipids: "🩸",
  immunity: "🛡️",
  blood: "🔬",
  coagulation: "💉",
  special: "⚗️",
};

interface ComparisonItem {
  testId: string;
  nameEn: string;
  nameAr: string;
  category: TestCategory;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  oldValue: number | null;
  oldStatus: string;
  oldDate: string;
  newValue: number | null;
  newStatus: string;
  newDate: string;
  change: "improved" | "worsened" | "same" | "unknown";
  changePercent: number | null;
}

function getStatusColor(status: string) {
  if (status === "normal") return "text-green-600 dark:text-green-400";
  if (status === "high" || status === "low") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getStatusBadgeVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  if (status === "normal") return "secondary";
  if (status === "high" || status === "low") return "destructive";
  return "outline";
}

export default function Compare() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const { data: tests = [], isLoading } = useQuery<TestResultWithDefinition[]>({
    queryKey: ["/api/tests"],
  });

  const comparisons: ComparisonItem[] = (() => {
    const grouped = new Map<string, TestResultWithDefinition[]>();
    for (const test of tests) {
      const existing = grouped.get(test.testId) || [];
      existing.push(test);
      grouped.set(test.testId, existing);
    }

    const items: ComparisonItem[] = [];
    for (const [testId, results] of Array.from(grouped.entries())) {
      if (results.length < 2) continue;

      const sorted = [...results].sort((a, b) =>
        new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
      );

      const oldResult = sorted[sorted.length - 2];
      const newResult = sorted[sorted.length - 1];
      const def = newResult.testDefinition;

      let change: ComparisonItem["change"] = "unknown";
      let changePercent: number | null = null;

      if (oldResult.value != null && newResult.value != null && oldResult.value !== 0) {
        changePercent = ((newResult.value - oldResult.value) / oldResult.value) * 100;

        if (Math.abs(changePercent) < 1) {
          change = "same";
        } else {
          const oldWasAbnormal = oldResult.status === "high" || oldResult.status === "low";
          const newIsNormal = newResult.status === "normal";
          const newIsAbnormal = newResult.status === "high" || newResult.status === "low";
          const oldWasNormal = oldResult.status === "normal";

          if (oldWasAbnormal && newIsNormal) {
            change = "improved";
          } else if (oldWasNormal && newIsAbnormal) {
            change = "worsened";
          } else if (oldWasAbnormal && newIsAbnormal) {
            if (oldResult.status === newResult.status) {
              if (def.normalRangeMin != null && def.normalRangeMax != null) {
                const midRange = (def.normalRangeMin + def.normalRangeMax) / 2;
                const oldDist = Math.abs(oldResult.value - midRange);
                const newDist = Math.abs(newResult.value - midRange);
                change = newDist < oldDist ? "improved" : "worsened";
              } else {
                change = "same";
              }
            } else {
              change = "worsened";
            }
          } else {
            change = "same";
          }
        }
      }

      items.push({
        testId,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        category: def.category as TestCategory,
        unit: def.unit,
        normalRangeMin: def.normalRangeMin,
        normalRangeMax: def.normalRangeMax,
        oldValue: oldResult.value,
        oldStatus: oldResult.status || "normal",
        oldDate: oldResult.testDate ? new Date(oldResult.testDate).toLocaleDateString(isArabic ? "ar" : "en", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "",
        newValue: newResult.value,
        newStatus: newResult.status || "normal",
        newDate: newResult.testDate ? new Date(newResult.testDate).toLocaleDateString(isArabic ? "ar" : "en", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "",
        change,
        changePercent,
      });
    }

    return items;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MedicalDisclaimer />

      <div className="flex items-center gap-2">
        <GitCompareArrows className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold" data-testid="text-compare-title">{t("compareResults")}</h2>
      </div>

      {comparisons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <GitCompareArrows className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium" data-testid="text-no-comparison">
              {t("noComparisonData")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("noComparisonHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" /> {t("improved")}</span>
            <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> {t("worsened")}</span>
            <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-muted-foreground" /> {t("noChange")}</span>
          </div>

          <div className="space-y-3">
            {comparisons.map((item) => (
              <Card key={item.testId} data-testid={`card-compare-${item.testId}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{categoryIcons[item.category]}</span>
                      <span className="font-semibold text-sm truncate" data-testid={`text-test-name-${item.testId}`}>
                        {isArabic ? item.nameAr : item.nameEn}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.change === "improved" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                          <TrendingUp className="h-3 w-3 me-1" />
                          {t("improved")}
                        </Badge>
                      )}
                      {item.change === "worsened" && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="h-3 w-3 me-1" />
                          {t("worsened")}
                        </Badge>
                      )}
                      {item.change === "same" && (
                        <Badge variant="outline" className="text-xs">
                          <Minus className="h-3 w-3 me-1" />
                          {t("noChange")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground mb-1">{t("previousResult")}</p>
                      <p className={`text-sm font-bold ${getStatusColor(item.oldStatus)}`} data-testid={`text-old-value-${item.testId}`}>
                        {item.oldValue ?? "-"}
                      </p>
                      <Badge variant={getStatusBadgeVariant(item.oldStatus)} className="text-[10px] mt-1">
                        {t(item.oldStatus)}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.oldDate}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      {item.changePercent != null ? (
                        <>
                          <div className={`flex items-center gap-0.5 text-sm font-bold ${
                            item.change === "improved" ? "text-green-600 dark:text-green-400" :
                            item.change === "worsened" ? "text-red-600 dark:text-red-400" :
                            "text-muted-foreground"
                          }`}>
                            {item.changePercent > 0 ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : item.changePercent < 0 ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : null}
                            <span>{Math.abs(item.changePercent).toFixed(1)}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {item.unit || ""}
                          </p>
                        </>
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] text-muted-foreground mb-1">{t("latestResult")}</p>
                      <p className={`text-sm font-bold ${getStatusColor(item.newStatus)}`} data-testid={`text-new-value-${item.testId}`}>
                        {item.newValue ?? "-"}
                      </p>
                      <Badge variant={getStatusBadgeVariant(item.newStatus)} className="text-[10px] mt-1">
                        {t(item.newStatus)}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.newDate}</p>
                    </div>
                  </div>

                  {item.normalRangeMin != null && item.normalRangeMax != null && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      {t("normalRange")}: {item.normalRangeMin} - {item.normalRangeMax} {item.unit || ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
