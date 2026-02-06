import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";
import {
  Loader2,
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
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Armchair,
  Bike,
  Dumbbell,
  Zap,
  Heart,
  Leaf,
  BarChart3,
  Scale,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ConditionTip {
  condition: string;
  advice: string[];
  avoidFoods: string[];
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
  conditionTips: ConditionTip[];
}

type QuestionnaireStep = "disclaimer" | "activity" | "allergy" | "allergySelect" | "preference" | "generating";

const ALLERGY_OPTIONS = [
  { key: "eggs", labelKey: "allergyEggs" },
  { key: "dairy", labelKey: "allergyDairy" },
  { key: "peanuts", labelKey: "allergyPeanuts" },
  { key: "nuts", labelKey: "allergyNuts" },
  { key: "seafood", labelKey: "allergySeafood" },
  { key: "soy", labelKey: "allergySoy" },
  { key: "sesame", labelKey: "allergySesame" },
  { key: "wheat", labelKey: "allergyWheat" },
  { key: "fish", labelKey: "allergyFish" },
];

export default function DietPlan() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [plan, setPlan] = useState<DietPlanData | null>(null);
  const [step, setStep] = useState<QuestionnaireStep>("disclaimer");
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const [activityLevel, setActivityLevel] = useState<string>("");
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [mealPreference, setMealPreference] = useState<string>("");

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync({
        activityLevel,
        mealPreference,
        hasAllergies: hasAllergies || false,
        allergies: hasAllergies ? selectedAllergies : [],
      });
      const res = await apiRequest("POST", "/api/diet-plan", {
        language: i18n.language,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPlan(data);
      setShowQuestionnaire(false);
    },
  });

  const startQuestionnaire = () => {
    if (profile?.activityLevel) setActivityLevel(profile.activityLevel);
    if (profile?.mealPreference) setMealPreference(profile.mealPreference);
    if (profile?.hasAllergies != null) setHasAllergies(profile.hasAllergies);
    if (profile?.allergies) setSelectedAllergies(profile.allergies);
    setShowQuestionnaire(true);
    setStep("disclaimer");
  };

  const handleAllergyToggle = (key: string) => {
    setSelectedAllergies(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  };

  const handleFinishQuestionnaire = () => {
    setStep("generating");
    generateMutation.mutate();
  };

  const BackArrow = isArabic ? ChevronRight : ChevronLeft;
  const NextArrow = isArabic ? ChevronLeft : ChevronRight;

  const activityOptions = [
    { key: "sedentary", labelKey: "activitySedentary", descKey: "activitySedentaryDesc", icon: Armchair },
    { key: "lightly_active", labelKey: "activityLight", descKey: "activityLightDesc", icon: Bike },
    { key: "very_active", labelKey: "activityVery", descKey: "activityVeryDesc", icon: Dumbbell },
    { key: "extremely_active", labelKey: "activityExtreme", descKey: "activityExtremeDesc", icon: Zap },
  ];

  const preferenceOptions = [
    { key: "high_protein", labelKey: "prefHighProtein", descKey: "prefHighProteinDesc", icon: Beef, recommended: true, macroRanges: { protein: "40-50%", carbs: "35-40%", fats: "10-25%" } },
    { key: "balanced", labelKey: "prefBalanced", descKey: "prefBalancedDesc", icon: Scale, recommended: false, macroRanges: { protein: "20-35%", carbs: "40-55%", fats: "20-30%" } },
    { key: "low_carb", labelKey: "prefLowCarb", descKey: "prefLowCarbDesc", icon: Leaf, recommended: false, macroRanges: { protein: "25-35%", carbs: "10-20%", fats: "40-50%" } },
    { key: "vegetarian", labelKey: "prefVegetarian", descKey: "prefVegetarianDesc", icon: Leaf, recommended: false, macroRanges: { protein: "15-25%", carbs: "45-55%", fats: "20-30%" } },
    { key: "custom_macros", labelKey: "prefCustomMacros", descKey: "prefCustomMacrosDesc", icon: BarChart3, recommended: false, macroRanges: null },
  ];

  const goalLabels: Record<string, string> = {
    weight_loss: t("goalWeightLoss"),
    maintain: t("goalMaintain"),
    muscle_gain: t("goalMuscleGain"),
  };

  if (showQuestionnaire && !plan) {
    return (
      <div className="space-y-4">
        {step === "disclaimer" && (
          <div className="space-y-4">
            <Card className="border-orange-200 dark:border-orange-800/40">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <ShieldAlert className="h-10 w-10 text-orange-500" />
                <h2 className="text-lg font-bold">{t("warning")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("nutritionDisclaimer")}
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => setStep("activity")}
                  data-testid="button-accept-disclaimer"
                >
                  {t("questContinue")}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setStep("disclaimer")} data-testid="button-back-activity">
                <BackArrow className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground">{t("questStep")} 1 {t("questOf")} 3</span>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold" data-testid="text-activity-title">{t("questActivityTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("questActivitySubtitle")}</p>
            </div>
            <div className="space-y-3">
              {activityOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = activityLevel === opt.key;
                return (
                  <Card
                    key={opt.key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected && "border-primary bg-primary/5"
                    )}
                    onClick={() => setActivityLevel(opt.key)}
                    data-testid={`card-activity-${opt.key}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg", isSelected ? "bg-primary/10" : "bg-muted/50")}>
                        <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{t(opt.labelKey)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button
              className="w-full"
              disabled={!activityLevel}
              onClick={() => setStep("allergy")}
              data-testid="button-next-activity"
            >
              {t("questNext")} <NextArrow className="h-4 w-4 ms-1" />
            </Button>
          </div>
        )}

        {step === "allergy" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setStep("activity")} data-testid="button-back-allergy">
                <BackArrow className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground">{t("questStep")} 2 {t("questOf")} 3</span>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold" data-testid="text-allergy-title">{t("questAllergyTitle")}</h2>
            </div>
            <div className="space-y-3">
              <Card
                className={cn(
                  "cursor-pointer transition-colors",
                  hasAllergies === true && "border-primary bg-primary/5"
                )}
                onClick={() => setHasAllergies(true)}
                data-testid="card-allergy-yes"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm">{t("questAllergyYes")}</span>
                  <div className={cn("p-1.5 rounded-full", hasAllergies === true ? "bg-primary/10" : "bg-muted/50")}>
                    <Check className={cn("h-5 w-5", hasAllergies === true ? "text-primary" : "text-muted-foreground")} />
                  </div>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "cursor-pointer transition-colors",
                  hasAllergies === false && "border-primary bg-primary/5"
                )}
                onClick={() => { setHasAllergies(false); setSelectedAllergies([]); }}
                data-testid="card-allergy-no"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm">{t("questAllergyNo")}</span>
                  <div className={cn("p-1.5 rounded-full", hasAllergies === false ? "bg-primary/10" : "bg-muted/50")}>
                    <X className={cn("h-5 w-5", hasAllergies === false ? "text-primary" : "text-muted-foreground")} />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button
              className="w-full"
              disabled={hasAllergies === null}
              onClick={() => setStep(hasAllergies ? "allergySelect" : "preference")}
              data-testid="button-next-allergy"
            >
              {t("questNext")} <NextArrow className="h-4 w-4 ms-1" />
            </Button>
          </div>
        )}

        {step === "allergySelect" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setStep("allergy")} data-testid="button-back-allergySelect">
                <BackArrow className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground">{t("questStep")} 2 {t("questOf")} 3</span>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold" data-testid="text-allergySelect-title">{t("questAllergyWhich")}</h2>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {ALLERGY_OPTIONS.map(opt => {
                const isSelected = selectedAllergies.includes(opt.key);
                return (
                  <Badge
                    key={opt.key}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-4 py-2 text-sm",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleAllergyToggle(opt.key)}
                    data-testid={`badge-allergy-${opt.key}`}
                  >
                    {t(opt.labelKey)}
                  </Badge>
                );
              })}
            </div>
            <Button
              className="w-full"
              onClick={() => setStep("preference")}
              data-testid="button-next-allergySelect"
            >
              {t("questContinue")}
            </Button>
          </div>
        )}

        {step === "preference" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="ghost" size="icon" onClick={() => setStep(hasAllergies ? "allergySelect" : "allergy")} data-testid="button-back-preference">
                <BackArrow className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground">{t("questStep")} 3 {t("questOf")} 3</span>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold" data-testid="text-preference-title">{t("questPreferenceTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("questPreferenceSubtitle")}</p>
            </div>
            <div className="space-y-3">
              {preferenceOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = mealPreference === opt.key;
                return (
                  <Card
                    key={opt.key}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected && "border-primary bg-primary/5"
                    )}
                    onClick={() => setMealPreference(opt.key)}
                    data-testid={`card-preference-${opt.key}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg shrink-0", isSelected ? "bg-primary/10" : "bg-muted/50")}>
                          <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{t(opt.labelKey)}</p>
                            {opt.recommended && (
                              <Badge variant="secondary" className="text-[10px]">{t("recommended")}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                          {opt.macroRanges && (
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                                <div className="bg-red-400 dark:bg-red-500" style={{ width: opt.macroRanges.protein.split("-")[0] + "%" }} />
                                <div className="bg-amber-400 dark:bg-amber-500" style={{ width: opt.macroRanges.carbs.split("-")[0] + "%" }} />
                                <div className="bg-blue-400 dark:bg-blue-500" style={{ width: opt.macroRanges.fats.split("-")[0] + "%" }} />
                              </div>
                            </div>
                          )}
                          {opt.macroRanges && (
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                              <span>{opt.macroRanges.protein} {t("protein")}</span>
                              <span>{opt.macroRanges.carbs} {t("carbs")}</span>
                              <span>{opt.macroRanges.fats} {t("fats")}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary shrink-0 mt-1" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button
              className="w-full"
              disabled={!mealPreference || generateMutation.isPending}
              onClick={handleFinishQuestionnaire}
              data-testid="button-generate-diet"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("generatingDietPlan")}
                </>
              ) : (
                <>
                  <Salad className="h-4 w-4 me-2" />
                  {t("generateDietPlan")}
                </>
              )}
            </Button>
            {generateMutation.isError && (
              <p className="text-sm text-destructive text-center" data-testid="text-diet-error">
                {t("dietPlanError")}
              </p>
            )}
          </div>
        )}

        {step === "generating" && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" data-testid="loading-diet" />
              <p className="text-sm text-muted-foreground font-medium">{t("generatingDietPlan")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (plan) {
    const mealSections = [
      { key: "breakfast", icon: Coffee, label: t("breakfast"), items: plan.mealPlan.breakfast },
      { key: "lunch", icon: Sun, label: t("lunch"), items: plan.mealPlan.lunch },
      { key: "dinner", icon: Moon, label: t("dinner"), items: plan.mealPlan.dinner },
      { key: "snacks", icon: Apple, label: t("snacks"), items: plan.mealPlan.snacks },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Salad className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold" data-testid="text-diet-title">{t("dietPlan")}</h2>
        </div>

        <Card className="border-orange-200 dark:border-orange-800/40" data-testid="card-nutrition-disclaimer">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("nutritionDisclaimer")}
            </p>
          </CardContent>
        </Card>

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
                {section.key !== "snacks" && section.items.length > 1 && (
                  <Badge variant="outline" className="text-[10px] ms-auto">{section.items.length} {t("mealOption")}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {section.key !== "snacks" && section.items.length > 1 && (
                        <Badge variant="outline" className="text-[10px]">{t("mealOption")} {i + 1}</Badge>
                      )}
                      <p className="font-semibold text-sm">{item.name}</p>
                    </div>
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

        {plan.conditionTips && plan.conditionTips.length > 0 && (
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                {t("conditionBasedTips")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {plan.conditionTips.map((ct, i) => (
                <div key={i} className="rounded-md bg-muted/50 p-3 space-y-2">
                  <p className="font-semibold text-sm">{ct.condition}</p>
                  <ul className="space-y-1">
                    {ct.advice.map((a, ai) => (
                      <li key={ai} className="text-sm flex items-start gap-2">
                        <Lightbulb className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  {ct.avoidFoods.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
                        <Ban className="h-3 w-3" />
                        {t("avoidTheseFoods")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {ct.avoidFoods.map((f, fi) => (
                          <Badge key={fi} variant="destructive" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
              startQuestionnaire();
            }}
            disabled={generateMutation.isPending}
            data-testid="button-regenerate-diet"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("regenerateDietPlan")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Salad className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold" data-testid="text-diet-title">{t("dietPlan")}</h2>
      </div>

      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <Salad className="h-12 w-12 text-primary mx-auto" />
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
          <Button onClick={startQuestionnaire} data-testid="button-start-diet">
            <Salad className="h-4 w-4 me-2" />
            {t("generateDietPlan")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
