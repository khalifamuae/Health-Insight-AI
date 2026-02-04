import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon, CategoryLegend } from "./CategoryIcon";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import type { AllTestsData, TestCategory, Reminder } from "@shared/schema";
import { ArrowUpDown, Filter, CheckCircle, XCircle, Clock, CalendarDays, Bell, X, Share2, Check, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AllTestsTableProps {
  tests: AllTestsData[];
  isLoading?: boolean;
}

type SortOption = "default" | "importance" | "category" | "status";
type FilterCategory = TestCategory | "all";
type FilterStatus = "all" | "normal" | "low" | "high" | "pending";

interface ReminderWithDef extends Reminder {
  testDefinition?: {
    nameEn: string;
    nameAr: string;
  };
}

export function AllTestsTable({ tests, isLoading }: AllTestsTableProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const dateLocale = isArabic ? arSA : enUS;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: reminders = [] } = useQuery<ReminderWithDef[]>({
    queryKey: ["/api/reminders"],
  });

  const createReminderMutation = useMutation({
    mutationFn: async ({ testId, dueDate }: { testId: string; dueDate: Date }) => {
      return apiRequest("POST", "/api/reminders", { testId, dueDate: dueDate.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminderSet"), description: t("reminderSetDesc") });
      setOpenPopover(null);
    },
    onError: () => {
      toast({ title: t("error"), description: t("reminderError"), variant: "destructive" });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("DELETE", `/api/reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminderDeleted") });
    },
  });

  const generateShareText = () => {
    const testsWithResults = tests.filter(test => test.hasResult);
    if (testsWithResults.length === 0) {
      return isArabic 
        ? "لا توجد نتائج فحوصات لمشاركتها"
        : "No test results to share";
    }

    const header = isArabic 
      ? "تقرير الفحوصات الطبية\n" + "═".repeat(30) + "\n\n"
      : "Medical Test Results Report\n" + "═".repeat(30) + "\n\n";

    const abnormalTests = testsWithResults.filter(t => t.status === "high" || t.status === "low");
    const normalTests = testsWithResults.filter(t => t.status === "normal");

    let text = header;

    if (abnormalTests.length > 0) {
      text += isArabic ? "[!] نتائج غير طبيعية:\n" : "[!] Abnormal Results:\n";
      abnormalTests.forEach(test => {
        const name = isArabic ? test.nameAr : test.nameEn;
        const statusText = test.status === "high" 
          ? (isArabic ? "مرتفع" : "High") 
          : (isArabic ? "منخفض" : "Low");
        const range = test.normalRangeMin !== null && test.normalRangeMax !== null
          ? `${test.normalRangeMin}-${test.normalRangeMax} ${test.unit || ""}`
          : "";
        const testDateStr = test.testDate 
          ? ` | ${isArabic ? "تاريخ الفحص" : "Test Date"}: ${format(new Date(test.testDate), "yyyy-MM-dd")}`
          : "";
        text += `- ${name}: ${test.value} ${test.unit || ""} (${statusText})`;
        if (range) text += ` [${isArabic ? "الطبيعي" : "Normal"}: ${range}]`;
        text += testDateStr;
        text += "\n";
      });
      text += "\n";
    }

    if (normalTests.length > 0) {
      text += isArabic ? "[OK] نتائج طبيعية:\n" : "[OK] Normal Results:\n";
      normalTests.forEach(test => {
        const name = isArabic ? test.nameAr : test.nameEn;
        const range = test.normalRangeMin !== null && test.normalRangeMax !== null
          ? `${test.normalRangeMin}-${test.normalRangeMax} ${test.unit || ""}`
          : "";
        const testDateStr = test.testDate 
          ? ` | ${isArabic ? "تاريخ الفحص" : "Test Date"}: ${format(new Date(test.testDate), "yyyy-MM-dd")}`
          : "";
        text += `- ${name}: ${test.value} ${test.unit || ""}`;
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

  const remindersByTestId = useMemo(() => {
    const map: Record<string, ReminderWithDef> = {};
    reminders.forEach(r => {
      map[r.testId] = r;
    });
    return map;
  }, [reminders]);

  const sortedAndFilteredTests = useMemo(() => {
    let result = [...tests];

    if (filterCategory !== "all") {
      result = result.filter(test => test.category === filterCategory);
    }

    if (filterStatus !== "all") {
      result = result.filter(test => test.status === filterStatus);
    }

    switch (sortBy) {
      case "default":
        result.sort((a, b) => a.order - b.order);
        break;
      case "importance":
        result.sort((a, b) => a.importance - b.importance);
        break;
      case "category":
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "status":
        const statusOrder: Record<string, number> = { high: 0, low: 1, normal: 2, pending: 3 };
        result.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));
        break;
    }

    return result;
  }, [tests, sortBy, filterCategory, filterStatus]);

  const getStatusRowClass = (status: string, hasResult: boolean) => {
    if (!hasResult) return "bg-muted/30";
    if (status === "low" || status === "high") {
      return "bg-red-50 dark:bg-red-950/20";
    }
    if (status === "normal") {
      return "bg-green-50/50 dark:bg-green-950/10";
    }
    return "";
  };

  const getStatusBadge = (status: string, hasResult: boolean, test: AllTestsData) => {
    if (!hasResult) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {t("pending")}
        </Badge>
      );
    }
    
    if (status === "normal") {
      return (
        <Badge className="gap-1 bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3" />
          {t("normal")}
        </Badge>
      );
    }
    
    // Check if slightly high or slightly low (within 20% of boundary)
    let isSlightly = false;
    if (test.value !== null && test.normalRangeMin !== null && test.normalRangeMax !== null) {
      const range = test.normalRangeMax - test.normalRangeMin;
      const threshold = range * 0.2; // 20% threshold
      
      if (status === "high" && test.value <= test.normalRangeMax + threshold) {
        isSlightly = true;
      } else if (status === "low" && test.value >= test.normalRangeMin - threshold) {
        isSlightly = true;
      }
    }
    
    const statusText = status === "high" 
      ? (isSlightly ? t("slightlyHigh") : t("high"))
      : (isSlightly ? t("slightlyLow") : t("low"));
    
    return (
      <Badge variant="destructive" className={`gap-1 ${isSlightly ? "bg-orange-500 hover:bg-orange-600" : ""}`}>
        <XCircle className="h-3 w-3" />
        {statusText}
      </Badge>
    );
  };

  const handleSetReminder = (testId: string, date: Date | undefined) => {
    if (date) {
      createReminderMutation.mutate({ testId, dueDate: date });
    }
  };

  const testsWithResults = tests.filter(t => t.hasResult).length;
  const abnormalTests = tests.filter(t => t.status === "high" || t.status === "low").length;

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
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              {t("myTests")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {testsWithResults} / 50 {t("testsCompleted")} • {abnormalTests} {t("abnormal")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("defaultOrder")}</SelectItem>
                <SelectItem value="importance">{t("importance")}</SelectItem>
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
                <SelectItem value="all">{t("allCategories")}</SelectItem>
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
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="normal">{t("normal")}</SelectItem>
                <SelectItem value="low">{t("low")}</SelectItem>
                <SelectItem value="high">{t("high")}</SelectItem>
                <SelectItem value="pending">{t("pending")}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleShare}
              className="gap-2"
              data-testid="button-share-results"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {t("shareResults")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <CategoryLegend />
        <div className="relative overflow-auto max-h-[65vh]">
          <Table className="text-sm">
            <TableHeader className="sticky top-0 z-20">
              <TableRow className="bg-card border-b-2 border-border">
                <TableHead className="w-[28px] bg-card p-1 text-center"></TableHead>
                <TableHead className="bg-card font-bold p-1">{t("testName")}</TableHead>
                <TableHead className="text-center bg-card font-bold p-1 whitespace-nowrap">{t("yourValue")}</TableHead>
                <TableHead className="text-center bg-card font-bold p-1">{t("status")}</TableHead>
                <TableHead className="bg-card font-bold p-1 whitespace-nowrap">{t("testDate")}</TableHead>
                <TableHead className="text-center bg-card font-bold p-1">{t("reminder")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredTests.map((test, index) => {
                const existingReminder = remindersByTestId[test.testId];
                
                return (
                  <TableRow 
                    key={test.id} 
                    className={getStatusRowClass(test.status, test.hasResult)}
                    data-testid={`row-test-${test.testId}`}
                  >
                    <TableCell className="p-1 text-center">
                      <CategoryIcon category={test.category} />
                    </TableCell>
                    <TableCell className="font-medium p-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{isArabic ? test.nameAr : test.nameEn}</span>
                        {(test.descriptionEn || test.descriptionAr) && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                <Info className="h-3 w-3 text-blue-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="max-w-[250px] p-3">
                              <p className="text-sm">
                                {isArabic ? test.descriptionAr : test.descriptionEn}
                              </p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono p-1">
                      {test.hasResult ? (
                        <div className="flex flex-col">
                          <span className={`text-xs ${test.status !== "normal" && test.status !== "pending" ? "font-bold text-red-600 dark:text-red-400" : ""}`}>
                            {test.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({test.normalRangeMin}-{test.normalRangeMax})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center p-1">
                      {getStatusBadge(test.status, test.hasResult, test)}
                    </TableCell>
                    <TableCell className="text-muted-foreground p-1 text-xs">
                      {test.testDate 
                        ? format(new Date(test.testDate), "MM/dd", { locale: dateLocale })
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-center p-1">
                      {existingReminder ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600">
                              <Bell className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="center">
                            <div className="flex flex-col gap-2">
                              <span className="text-sm">{format(new Date(existingReminder.dueDate), "PP", { locale: dateLocale })}</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteReminderMutation.mutate(existingReminder.id)}
                                data-testid={`button-delete-reminder-${test.testId}`}
                              >
                                <X className="h-3 w-3 me-1" />
                                {isArabic ? "حذف" : "Delete"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Popover 
                          open={openPopover === test.testId} 
                          onOpenChange={(open) => setOpenPopover(open ? test.testId : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              data-testid={`button-set-reminder-${test.testId}`}
                            >
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                              mode="single"
                              selected={undefined}
                              onSelect={(date) => handleSetReminder(test.testId, date)}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                              locale={dateLocale}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
