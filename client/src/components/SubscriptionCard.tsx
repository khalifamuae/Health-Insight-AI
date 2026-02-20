import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, FileText, Check, Sparkles, Star } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

interface SubscriptionCardProps {
  currentPlan: SubscriptionPlan;
  filesUsed: number;
  onUpgrade?: () => void;
}

const proFeatureKeys = [
  "proFeature1",
  "proFeature2",
  "proFeature3",
  "proFeature4",
  "proFeature5",
  "proFeature6",
  "proFeature7",
  "proFeature8",
  "proFeature9",
  "proFeature10",
];

const planConfig = {
  free: {
    name: "freePlan",
    icon: FileText,
    limit: 3,
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    features: ["3 PDF uploads", "Basic analysis", "Email reminders"],
  },
  pro: {
    name: "proPlan",
    icon: Crown,
    limit: Infinity,
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    features: ["Unlimited uploads", "Unlimited AI diet plans", "AI recommendations", "Phone reminders", "Data export", "Priority support"],
  },
};

export function SubscriptionCard({ currentPlan, filesUsed, onUpgrade }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const planKey = currentPlan === 'pro' ? 'pro' : 'free';
  const config = planConfig[planKey];
  const Icon = config.icon;
  const isUnlimited = config.limit === Infinity;
  const usagePercent = isUnlimited ? 0 : (filesUsed / config.limit) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {t("subscription")}
          </CardTitle>
          <Badge className={config.color}>
            <Icon className="h-3 w-3 me-1" />
            {t(config.name)}
          </Badge>
        </div>
        <CardDescription>
          {t("currentPlan")}: {t(config.name)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between gap-2 text-sm">
            <span>{t("filesUsed")}</span>
            <span className="font-medium">
              {filesUsed} / {isUnlimited ? t("unlimited") : config.limit}
            </span>
          </div>
          {!isUnlimited && (
            <Progress 
              value={usagePercent} 
              className={usagePercent > 80 ? "bg-red-100" : ""}
            />
          )}
        </div>

        {planKey !== "pro" && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-base">{t("whyUpgrade")}</h4>
            </div>

            <div className="space-y-2.5">
              {proFeatureKeys.map((key, i) => (
                <div key={i} className="flex items-start gap-2.5" data-testid={`pro-feature-${i + 1}`}>
                  <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span className="text-sm">{t(key)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-blue-500/10 dark:from-violet-500/20 dark:to-blue-500/20 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold">{t("proPrice")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("proSavings")}</p>
            </div>

            <Button 
              onClick={onUpgrade} 
              className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg" 
              size="lg"
              data-testid="button-upgrade"
            >
              <Crown className="h-5 w-5 me-2" />
              {t("upgrade")}
            </Button>

            <p className="text-xs text-center text-muted-foreground">{t("freeTrial")}</p>
          </div>
        )}

        {planKey === "pro" && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2 text-sm">{t("features")}</h4>
            <ul className="space-y-1">
              {config.features.map((feature, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
