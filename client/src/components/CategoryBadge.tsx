import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { TestCategory } from "@shared/schema";
import { 
  Pill, 
  Gem, 
  Activity, 
  HeartPulse,
  Droplets,
  Shield,
  TestTube,
  Scissors,
  Microscope
} from "lucide-react";

interface CategoryBadgeProps {
  category: TestCategory;
  showIcon?: boolean;
}

const categoryConfig: Record<TestCategory, { icon: typeof Pill; colorClass: string }> = {
  vitamins: { icon: Pill, colorClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  minerals: { icon: Gem, colorClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
  hormones: { icon: Activity, colorClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  organ_functions: { icon: HeartPulse, colorClass: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-800" },
  lipids: { icon: Droplets, colorClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  immunity: { icon: Shield, colorClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  blood: { icon: TestTube, colorClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" },
  coagulation: { icon: Scissors, colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
  special: { icon: Microscope, colorClass: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800" },
};

export function CategoryBadge({ category, showIcon = true }: CategoryBadgeProps) {
  const { t } = useTranslation();
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Badge className={`${config.colorClass}`}>
      {showIcon && <Icon className="h-3 w-3 me-1" />}
      {t(category)}
    </Badge>
  );
}
