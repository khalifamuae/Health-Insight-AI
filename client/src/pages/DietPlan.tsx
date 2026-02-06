import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";
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
  Flame,
  Target,
  ShieldAlert,
  Beef,
  Wheat,
  Droplets,
} from "lucide-react";

interface MealItem {
  name: string;
  description: string;
  calories: number;
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
  goalDescription: string;
  calories: {
    bmr: number;
    tdee: number;
    target: number;
    deficit_or_surplus: number;
  };
  macros: {
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fats: { grams: number; percentage: number };
  };
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

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

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

  const goalLabels: Record<string, string> = {
    weight_loss: t("goalWeightLoss"),
    maintain: t("goalMaintain"),
    muscle_gain: t("goalMuscleGain"),
  };

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
              {profile?.fitnessGoal && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("fitnessGoal")}:</span>
                  <Badge variant="secondary" data-testid="badge-current-goal">
                    {goalLabels[profile.fitnessGoal] || profile.fitnessGoal}
                  </Badge>
                </div>
              )}
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
              {plan.goalDescription && (
                <div className="mt-2 flex items-start gap-2">
                  <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{plan.goalDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800/40" data-testid="card-nutrition-disclaimer">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("nutritionDisclaimer")}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="section-calories-macros">
            <Card>
              <CardContent className="p-4 text-center">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">{t("targetCalories")}</p>
                <p className="text-xl font-bold" data-testid="text-target-calories">{plan.calories.target}</p>
                <p className="text-xs text-muted-foreground">{t("kcalPerDay")}</p>
                {plan.calories.deficit_or_surplus !== 0 && (
                  <Badge variant={plan.calories.deficit_or_surplus < 0 ? "destructive" : "secondary"} className="mt-1 text-xs">
                    {plan.calories.deficit_or_surplus > 0 ? "+" : ""}{plan.calories.deficit_or_surplus} {t("kcal")}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <Beef className="h-4 w-4 text-red-500 mx-auto mb-0.5" />
                    <p className="text-xs text-muted-foreground">{t("protein")}</p>
                    <p className="text-sm font-bold" data-testid="text-protein">{plan.macros.protein.grams}{t("gram")}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.macros.protein.percentage}%</p>
                  </div>
                  <div className="text-center">
                    <Wheat className="h-4 w-4 text-amber-500 mx-auto mb-0.5" />
                    <p className="text-xs text-muted-foreground">{t("carbs")}</p>
                    <p className="text-sm font-bold" data-testid="text-carbs">{plan.macros.carbs.grams}{t("gram")}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.macros.carbs.percentage}%</p>
                  </div>
                  <div className="text-center">
                    <Droplets className="h-4 w-4 text-blue-500 mx-auto mb-0.5" />
                    <p className="text-xs text-muted-foreground">{t("fats")}</p>
                    <p className="text-sm font-bold" data-testid="text-fats">{plan.macros.fats.grams}{t("gram")}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.macros.fats.percentage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">{t("bmr")}</p>
                <p className="text-lg font-bold" data-testid="text-bmr">{plan.calories.bmr}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("tdee")}: {plan.calories.tdee}</p>
              </CardContent>
            </Card>
          </div>

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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{item.name}</p>
                      {item.calories > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Flame className="h-3 w-3 me-1 text-orange-500" />
                          {item.calories} {t("kcal")}
                        </Badge>
                      )}
                    </div>
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
