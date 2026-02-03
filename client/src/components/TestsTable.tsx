import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestStatusBadge } from "./TestStatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import type { TestResultWithDefinition, TestCategory, TestStatus } from "@shared/schema";
import { ArrowUpDown, Filter } from "lucide-react";

interface TestsTableProps {
  tests: TestResultWithDefinition[];
  isLoading?: boolean;
}

type SortOption = "importance" | "newest" | "oldest" | "status" | "category";
type FilterCategory = TestCategory | "all";
type FilterStatus = TestStatus | "all";

export function TestsTable({ tests, isLoading }: TestsTableProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const dateLocale = isArabic ? arSA : enUS;

  const [sortBy, setSortBy] = useState<SortOption>("importance");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const categories: TestCategory[] = [
    "vitamins", "minerals", "hormones", "organ_functions",
    "lipids", "immunity", "blood", "coagulation", "special"
  ];

  const sortedAndFilteredTests = useMemo(() => {
    let result = [...tests];

    if (filterCategory !== "all") {
      result = result.filter(test => test.testDefinition.category === filterCategory);
    }

    if (filterStatus !== "all") {
      result = result.filter(test => test.status === filterStatus);
    }

    switch (sortBy) {
      case "importance":
        result.sort((a, b) => a.testDefinition.level - b.testDefinition.level);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
        break;
      case "status":
        const statusOrder = { high: 0, low: 1, normal: 2 };
        result.sort((a, b) => statusOrder[a.status || "normal"] - statusOrder[b.status || "normal"]);
        break;
      case "category":
        result.sort((a, b) => a.testDefinition.category.localeCompare(b.testDefinition.category));
        break;
    }

    return result;
  }, [tests, sortBy, filterCategory, filterStatus]);

  const getStatusRowClass = (status: TestStatus | null) => {
    if (status === "low" || status === "high") {
      return "bg-red-50 dark:bg-red-950/20";
    }
    return "";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            {t("myTests")}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="importance">{t("importance")}</SelectItem>
                <SelectItem value="newest">{t("newest")}</SelectItem>
                <SelectItem value="oldest">{t("oldest")}</SelectItem>
                <SelectItem value="status">{t("byStatus")}</SelectItem>
                <SelectItem value="category">{t("byCategory")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as FilterCategory)}>
              <SelectTrigger className="w-[140px]" data-testid="select-category">
                <Filter className="h-4 w-4 me-1" />
                <SelectValue placeholder={t("category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("category")}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{t(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[120px]" data-testid="select-status">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status")}</SelectItem>
                <SelectItem value="normal">{t("normal")}</SelectItem>
                <SelectItem value="low">{t("low")}</SelectItem>
                <SelectItem value="high">{t("high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAndFilteredTests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("testName")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead className="text-center">{t("yourValue")}</TableHead>
                  <TableHead className="text-center">{t("normalRange")}</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                  <TableHead>{t("testDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredTests.map((test) => (
                  <TableRow 
                    key={test.id} 
                    className={getStatusRowClass(test.status)}
                    data-testid={`row-test-${test.id}`}
                  >
                    <TableCell className="font-medium">
                      {isArabic ? test.testDefinition.nameAr : test.testDefinition.nameEn}
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={test.testDefinition.category} />
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {test.value !== null ? (
                        <span className={test.status !== "normal" ? "font-bold text-red-600 dark:text-red-400" : ""}>
                          {test.value} {test.testDefinition.unit}
                        </span>
                      ) : (
                        test.valueText || "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {test.testDefinition.normalRangeMin !== null && test.testDefinition.normalRangeMax !== null
                        ? `${test.testDefinition.normalRangeMin} - ${test.testDefinition.normalRangeMax} ${test.testDefinition.unit || ""}`
                        : test.testDefinition.normalRangeText || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <TestStatusBadge status={test.status || "normal"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(test.testDate), "PP", { locale: dateLocale })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
