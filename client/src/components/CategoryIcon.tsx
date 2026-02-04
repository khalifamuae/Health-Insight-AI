import { useTranslation } from "react-i18next";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryIconProps {
  category: TestCategory;
}

const categoryConfig: Record<TestCategory, { icon: typeof Pill; colorClass: string }> = {
  vitamins: { icon: Pill, colorClass: "text-orange-600 dark:text-orange-400" },
  minerals: { icon: Gem, colorClass: "text-cyan-600 dark:text-cyan-400" },
  hormones: { icon: Activity, colorClass: "text-purple-600 dark:text-purple-400" },
  organ_functions: { icon: HeartPulse, colorClass: "text-pink-600 dark:text-pink-400" },
  lipids: { icon: Droplets, colorClass: "text-yellow-600 dark:text-yellow-400" },
  immunity: { icon: Shield, colorClass: "text-green-600 dark:text-green-400" },
  blood: { icon: TestTube, colorClass: "text-red-600 dark:text-red-400" },
  coagulation: { icon: Scissors, colorClass: "text-indigo-600 dark:text-indigo-400" },
  special: { icon: Microscope, colorClass: "text-slate-600 dark:text-slate-400" },
};

export function CategoryIcon({ category }: CategoryIconProps) {
  const { t } = useTranslation();
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">
          <Icon className={`h-4 w-4 ${config.colorClass}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm">{t(category)}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function CategoryLegend() {
  const { t } = useTranslation();
  
  const categories: TestCategory[] = [
    "vitamins", "minerals", "hormones", "organ_functions", 
    "lipids", "immunity", "blood", "coagulation", "special"
  ];

  return (
    <div className="flex flex-wrap gap-2 text-xs mb-2 p-2 bg-muted/50 rounded-lg">
      {categories.map(category => {
        const config = categoryConfig[category];
        const Icon = config.icon;
        return (
          <div key={category} className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${config.colorClass}`} />
            <span className="text-muted-foreground">{t(category)}</span>
          </div>
        );
      })}
    </div>
  );
}
