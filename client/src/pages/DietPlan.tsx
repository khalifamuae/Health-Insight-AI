import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  UtensilsCrossed,
  Sun,
  Coffee,
  Moon,
  Apple,
  AlertTriangle,
  Lightbulb,
  ArrowDown,
  Salad,
  RefreshCw,
} from "lucide-react";

interface MealItem {
  name: string;
  description: string;
  benefits: string;
}

interface Deficiency {
  name: string;
  current: string;
  target: string;
  foods: string[];
}

interface DietPlanData {
  summary: string;
  deficiencies: Deficiency[];
  mealPlan: {
    breakfast: MealItem[];
    lunch: MealItem[];
    dinner: MealItem[];
    snacks: MealItem[];
  };
  tips: string[];
  warnings: string[];
}

export default function DietPlan() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [plan, setPlan] = useState<DietPlanData | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/diet-plan", {
        language: i18n.language,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPlan(data);
    },
  });

  const mealSections = plan
    ? [
        { key: "breakfast", icon: Coffee, label: t("breakfast"), items: plan.mealPlan.breakfast },
        { key: "lunch", icon: Sun, label: t("lunch"), items: plan.mealPlan.lunch },
        { key: "dinner", icon: Moon, label: t("dinner"), items: plan.mealPlan.dinner },
        { key: "snacks", icon: Apple, label: t("snacks"), items: plan.mealPlan.snacks },
      ]
    : [];

  return (
    <div className="space-y-4">
      <MedicalDisclaimer />

      <div className="flex items-center gap-2">
        <Salad className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold" data-testid="text-diet-title">{t("dietPlan")}</h2>
      </div>

      {!plan && !generateMutation.isPending && (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <UtensilsCrossed className="h-12 w-12 text-primary mx-auto" />
            <div>
              <p className="font-semibold text-base" data-testid="text-diet-intro">
                {t("dietPlanIntro")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dietPlanDescription")}
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              data-testid="button-generate-diet"
            >
              <UtensilsCrossed className="h-4 w-4 me-2" />
              {t("generateDietPlan")}
            </Button>
            {generateMutation.isError && (
              <p className="text-sm text-destructive" data-testid="text-diet-error">
                {t("dietPlanError")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {generateMutation.isPending && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" data-testid="loading-diet" />
            <p className="text-sm text-muted-foreground font-medium">{t("generatingDietPlan")}</p>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed" data-testid="text-diet-summary">{plan.summary}</p>
            </CardContent>
          </Card>

          {plan.warnings.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {t("warnings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1">
                  {plan.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-destructive flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {plan.deficiencies.length > 0 && (
            <Card>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-red-500" />
                  {t("deficiencies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {plan.deficiencies.map((d, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{d.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="destructive" className="text-xs">{d.current}</Badge>
                        <span className="text-xs text-muted-foreground">{isArabic ? "\u2190" : "\u2192"}</span>
                        <Badge variant="secondary" className="text-xs">{d.target}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.foods.map((food, fi) => (
                        <Badge key={fi} variant="outline" className="text-xs">{food}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {mealSections.map((section) => (
            <Card key={section.key}>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-primary" />
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {section.items.map((item, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{item.benefits}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {plan.tips.length > 0 && (
            <Card>
              <CardHeader className="pb-2 p-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  {t("dietTips")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1">
                  {plan.tips.map((tip, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              onClick={() => {
                setPlan(null);
                generateMutation.mutate();
              }}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate-diet"
            >
              <RefreshCw className="h-4 w-4 me-2" />
              {t("regenerateDietPlan")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
