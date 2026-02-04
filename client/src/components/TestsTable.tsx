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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestStatusBadge } from "./TestStatusBadge";
import { CategoryIcon, CategoryLegend } from "./CategoryIcon";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import type { TestResultWithDefinition, TestCategory, TestStatus } from "@shared/schema";
import { ArrowUpDown, Filter, Info, Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>("importance");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const generateShareText = () => {
    if (tests.length === 0) {
      return isArabic 
        ? "لا توجد نتائج فحوصات لمشاركتها"
        : "No test results to share";
    }

    const header = isArabic 
      ? "تقرير الفحوصات الطبية\n" + "═".repeat(30) + "\n\n"
      : "Medical Test Results Report\n" + "═".repeat(30) + "\n\n";

    const abnormalTests = tests.filter(t => t.status === "high" || t.status === "low");
    const normalTests = tests.filter(t => t.status === "normal");

    let text = header;

    if (abnormalTests.length > 0) {
      text += isArabic ? "[!] نتائج غير طبيعية:\n" : "[!] Abnormal Results:\n";
      abnormalTests.forEach(test => {
        const name = isArabic ? test.testDefinition.nameAr : test.testDefinition.nameEn;
        const statusText = test.status === "high" 
          ? (isArabic ? "مرتفع" : "High") 
          : (isArabic ? "منخفض" : "Low");
        const range = test.testDefinition.normalRangeMin !== null && test.testDefinition.normalRangeMax !== null
          ? `${test.testDefinition.normalRangeMin}-${test.testDefinition.normalRangeMax} ${test.testDefinition.unit || ""}`
          : "";
        const testDateStr = test.testDate 
          ? ` | ${isArabic ? "تاريخ الفحص" : "Test Date"}: ${format(new Date(test.testDate), "yyyy-MM-dd")}`
          : "";
        text += `- ${name}: ${test.value} ${test.testDefinition.unit || ""} (${statusText})`;
        if (range) text += ` [${isArabic ? "الطبيعي" : "Normal"}: ${range}]`;
        text += testDateStr;
        text += "\n";
      });
      text += "\n";
    }

    if (normalTests.length > 0) {
      text += isArabic ? "[OK] نتائج طبيعية:\n" : "[OK] Normal Results:\n";
      normalTests.forEach(test => {
        const name = isArabic ? test.testDefinition.nameAr : test.testDefinition.nameEn;
        const range = test.testDefinition.normalRangeMin !== null && test.testDefinition.normalRangeMax !== null
          ? `${test.testDefinition.normalRangeMin}-${test.testDefinition.normalRangeMax} ${test.testDefinition.unit || ""}`
          : "";
        const testDateStr = test.testDate 
          ? ` | ${isArabic ? "تاريخ الفحص" : "Test Date"}: ${format(new Date(test.testDate), "yyyy-MM-dd")}`
          : "";
        text += `- ${name}: ${test.value} ${test.testDefinition.unit || ""}`;
        if (range) text += ` [${isArabic ? "الطبيعي" : "Normal"}: ${range}]`;
        text += testDateStr;
        text += "\n";
      });
    }

    const footer = isArabic
      ? "\nالتاريخ: " + format(new Date(), "PPP", { locale: dateLocale })
      : "\nDate: " + format(new Date(), "PPP", { locale: dateLocale });
    text += footer;

    return text;
  };

  const handleShare = async () => {
    const shareText = generateShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: isArabic ? "تقرير الفحوصات" : "Test Results Report",
          text: shareText,
        });
        toast({ title: t("shareSuccess") });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          await copyToClipboard(shareText);
        }
      }
    } else {
      await copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: t("copiedToClipboard") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("error"), description: t("copyFailed"), variant: "destructive" });
    }
  };

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
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              {t("myTests")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1"
              data-testid="button-share-results"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{t("share")}</span>
            </Button>
          </div>
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
      <CardContent className="p-2">
        <CategoryLegend />
        {sortedAndFilteredTests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <div className="relative overflow-auto max-h-[55vh]">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-20">
                <TableRow className="bg-card border-b-2 border-border">
                  <TableHead className="w-[28px] bg-card p-1 text-center"></TableHead>
                  <TableHead className="bg-card font-bold p-1">{t("testName")}</TableHead>
                  <TableHead className="text-center bg-card font-bold p-1">{t("yourValue")}</TableHead>
                  <TableHead className="text-center bg-card font-bold p-1">{t("status")}</TableHead>
                  <TableHead className="bg-card font-bold p-1">{t("testDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredTests.map((test) => (
                  <TableRow 
                    key={test.id} 
                    className={getStatusRowClass(test.status)}
                    data-testid={`row-test-${test.id}`}
                  >
                    <TableCell className="p-1 text-center">
                      <CategoryIcon category={test.testDefinition.category} />
                    </TableCell>
                    <TableCell className="font-medium p-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{isArabic ? test.testDefinition.nameAr : test.testDefinition.nameEn}</span>
                        {(test.testDefinition.descriptionEn || test.testDefinition.descriptionAr) && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                <Info className="h-3 w-3 text-blue-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="max-w-[250px] p-3">
                              <p className="text-sm">
                                {isArabic ? test.testDefinition.descriptionAr : test.testDefinition.descriptionEn}
                              </p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono p-1">
                      {test.value !== null ? (
                        <div className="flex flex-col">
                          <span className={`text-xs ${test.status !== "normal" ? "font-bold text-red-600 dark:text-red-400" : ""}`}>
                            {test.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({test.testDefinition.normalRangeMin}-{test.testDefinition.normalRangeMax})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs">{test.valueText || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <TestStatusBadge status={test.status || "normal"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground p-1 text-xs">
                      {format(new Date(test.testDate), "MM/dd/yy", { locale: dateLocale })}
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
