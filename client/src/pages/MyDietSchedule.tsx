import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CalendarDays,
  Trash2,
  ChevronDown,
  ChevronUp,
  Salad,
  Info,
  AlertCircle,
  Coffee,
  Sun,
  Moon,
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Target,
  Stethoscope,
  TrendingUp,
  Pill,
  Lightbulb,
  Heart,
  Ban,
  BookOpen,
  AlertTriangle,
  ArrowDown,
  Loader2,
  Beaker,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedPlan {
  id: string;
  userId: string;
  planData: string;
  createdAt: string;
}

interface MealItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  benefits: string;
}

interface DietPlanData {
  healthSummary: string;
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
  intakeAlignment: string;
  deficiencies: { name: string; current: string; target: string; foods: string[] }[];
  supplements: { name: string; dosage: string; reason: string; duration: string; foodSources?: string[]; targetLabValue?: string; scientificBasis?: string }[];
  mealPlan: {
    breakfast: MealItem[];
    lunch: MealItem[];
    dinner: MealItem[];
    snacks: MealItem[];
  };
  tips: string[];
  warnings: string[];
  conditionTips: { condition: string; advice: string[]; avoidFoods: string[] }[];
  references: string[];
}

export default function MyDietSchedule() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { data: savedPlans, isLoading } = useQuery<SavedPlan[]>({
    queryKey: ["/api/saved-diet-plans"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-diet-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-diet-plans"] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const parsePlanData = (planDataStr: string): DietPlanData | null => {
    try {
      return JSON.parse(planDataStr);
    } catch {
      return null;
    }
  };

  const renderPlanContent = (plan: DietPlanData) => {
    const mealSections = [
      { key: "breakfast", icon: Coffee, label: t("breakfast"), items: plan.mealPlan.breakfast },
      { key: "lunch", icon: Sun, label: t("lunch"), items: plan.mealPlan.lunch },
      { key: "dinner", icon: Moon, label: t("dinner"), items: plan.mealPlan.dinner },
      { key: "snacks", icon: Apple, label: t("snacks"), items: plan.mealPlan.snacks },
    ];

    return (
      <div className="space-y-3 mt-3">
        {plan.healthSummary && (
          <Card data-testid="saved-section-health-summary">
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                {t("healthSummaryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs leading-relaxed text-muted-foreground">{plan.healthSummary}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-3">
            <p className="text-xs leading-relaxed">{plan.summary}</p>
            {plan.goalDescription && (
              <div className="mt-1.5 flex items-start gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{plan.goalDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="h-4 w-4 text-orange-500 mx-auto mb-0.5" />
              <p className="text-[10px] text-muted-foreground">{t("targetCalories")}</p>
              <p className="text-base font-bold">{plan.calories.target}</p>
              <p className="text-[10px] text-muted-foreground">{t("kcalPerDay")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="text-center">
                  <Beef className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">{t("protein")}</p>
                  <p className="text-xs font-bold">{plan.macros.protein.grams}{t("gram")}</p>
                </div>
                <div className="text-center">
                  <Wheat className="h-3 w-3 text-amber-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">{t("carbs")}</p>
                  <p className="text-xs font-bold">{plan.macros.carbs.grams}{t("gram")}</p>
                </div>
                <div className="text-center">
                  <Droplets className="h-3 w-3 text-blue-500 mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">{t("fats")}</p>
                  <p className="text-xs font-bold">{plan.macros.fats.grams}{t("gram")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-4 w-4 text-primary mx-auto mb-0.5" />
              <p className="text-[10px] text-muted-foreground">{t("bmr")}</p>
              <p className="text-base font-bold">{plan.calories.bmr}</p>
              <p className="text-[10px] text-muted-foreground">{t("tdee")}: {plan.calories.tdee}</p>
            </CardContent>
          </Card>
        </div>

        {plan.intakeAlignment && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {t("intakeAlignmentTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs leading-relaxed text-muted-foreground">{plan.intakeAlignment}</p>
            </CardContent>
          </Card>
        )}

        {plan.deficiencies && plan.deficiencies.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <ArrowDown className="h-3.5 w-3.5 text-primary" />
                {t("deficiencies")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {plan.deficiencies.map((d, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-xs">{d.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="destructive" className="text-[10px]">{d.current}</Badge>
                      <span className="text-[10px] text-muted-foreground">{isArabic ? "\u2190" : "\u2192"}</span>
                      <Badge variant="secondary" className="text-[10px]">{d.target}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {d.foods.map((food, fi) => (
                      <Badge key={fi} variant="outline" className="text-[10px]">{food}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {plan.supplements && plan.supplements.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Pill className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                {t("supplementsTitle")}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-1">{t("supplementsDisclaimer")}</p>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {plan.supplements.map((s, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-xs">{s.name}</p>
                    <Badge variant="outline" className="text-[10px]">{s.dosage}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                  {s.targetLabValue && (
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-blue-500 shrink-0" />
                      <p className="text-[10px] text-blue-600 dark:text-blue-400">{t("supplementTarget")}: {s.targetLabValue}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Pill className="h-3 w-3 text-green-500 shrink-0" />
                    <p className="text-[10px] text-green-600 dark:text-green-400">{t("supplementDuration")}: {s.duration}</p>
                  </div>
                  {s.foodSources && s.foodSources.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <UtensilsCrossed className="h-3 w-3 text-orange-500 shrink-0" />
                        <p className="text-[10px] font-medium">{t("supplementFoodSources")}</p>
                      </div>
                      <div className="ps-5 space-y-0.5">
                        {s.foodSources.map((food, fi) => (
                          <p key={fi} className="text-[10px] text-muted-foreground">- {food}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {s.scientificBasis && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Beaker className="h-3 w-3 text-purple-500 shrink-0" />
                      <p className="text-[10px] text-purple-600 dark:text-purple-400">{s.scientificBasis}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2.5">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-[11px] font-medium text-primary">{t("chooseOneMealNote")}</p>
        </div>

        {mealSections.map((section) => (
          <Card key={section.key}>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <section.icon className="h-3.5 w-3.5 text-primary" />
                {section.label}
                {section.items.length > 1 && (
                  <Badge variant="outline" className="text-[10px] ms-auto">{section.items.length} {t("mealOption")}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {section.items.length > 1 && (
                        <Badge variant="outline" className="text-[10px]">{t("mealOption")} {i + 1}</Badge>
                      )}
                      <p className="font-semibold text-xs">{item.name}</p>
                    </div>
                    {item.calories > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        <Flame className="h-2.5 w-2.5 me-0.5 text-orange-500" />
                        {item.calories} {t("kcal")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                  {(item.protein > 0 || item.carbs > 0 || item.fats > 0) && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{t("protein")}: {item.protein}{t("gram")}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{t("carbs")}: {item.carbs}{t("gram")}</span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">{t("fats")}: {item.fats}{t("gram")}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">{item.benefits}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {plan.conditionTips && plan.conditionTips.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-primary" />
                {t("conditionBasedTips")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {plan.conditionTips.map((ct, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-2 space-y-1">
                  <p className="font-semibold text-xs">{ct.condition}</p>
                  <ul className="space-y-0.5">
                    {ct.advice.map((a, ai) => (
                      <li key={ai} className="text-[10px] flex items-start gap-1">
                        <Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  {ct.avoidFoods.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Ban className="h-3 w-3 text-orange-500" />
                      {ct.avoidFoods.map((f, fi) => (
                        <Badge key={fi} variant="outline" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {plan.tips && plan.tips.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                {t("dietTips")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ul className="space-y-0.5">
                {plan.tips.map((tip, i) => (
                  <li key={i} className="text-[10px] flex items-start gap-1.5">
                    <span className="mt-1 h-1 w-1 rounded-full bg-primary shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {plan.references && plan.references.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                {t("referencesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <ul className="space-y-0.5">
                {plan.references.map((ref, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                    <span className="text-[9px] font-mono shrink-0">[{i + 1}]</span>
                    {ref}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold" data-testid="text-diet-schedule-title">{t("myDietSchedule")}</h2>
      </div>

      <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-diet-schedule-notes">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">{t("dietScheduleNotesTitle")}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-900/80 dark:text-blue-200/70 leading-relaxed">{t("dietScheduleNote")}</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-900/80 dark:text-blue-200/70 leading-relaxed">{t("plateauNote")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      )}

      {!isLoading && (!savedPlans || savedPlans.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <Salad className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="font-semibold text-sm" data-testid="text-no-saved-plans">{t("noSavedPlans")}</p>
            <p className="text-xs text-muted-foreground">{t("noSavedPlansDesc")}</p>
          </CardContent>
        </Card>
      )}

      {savedPlans && savedPlans.length > 0 && (
        <div className="space-y-3">
          {savedPlans.map((saved) => {
            const plan = parsePlanData(saved.planData);
            const isExpanded = expandedPlan === saved.id;

            return (
              <Card key={saved.id} data-testid={`card-saved-plan-${saved.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Salad className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{t("myDietSchedule")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("savedOn")} {formatDate(saved.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedPlan(isExpanded ? null : saved.id)}
                        data-testid={`button-toggle-plan-${saved.id}`}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(saved.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-plan-${saved.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {plan && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Flame className="h-3 w-3 me-1 text-orange-500" />
                        {plan.calories.target} {t("kcal")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Beef className="h-3 w-3 me-1 text-red-500" />
                        {plan.macros.protein.grams}{t("gram")}
                      </Badge>
                    </div>
                  )}

                  {isExpanded && plan && renderPlanContent(plan)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
