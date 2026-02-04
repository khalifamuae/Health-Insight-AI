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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "./CategoryBadge";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import type { AllTestsData, TestCategory, Reminder } from "@shared/schema";
import { ArrowUpDown, Filter, CheckCircle, XCircle, Clock, CalendarDays, Bell, X, Share2, Copy, Check } from "lucide-react";
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
      ? "📋 تقرير الفحوصات الطبية\n" + "═".repeat(30) + "\n\n"
      : "📋 Medical Test Results Report\n" + "═".repeat(30) + "\n\n";

    const abnormalTests = testsWithResults.filter(t => t.status === "high" || t.status === "low");
    const normalTests = testsWithResults.filter(t => t.status === "normal");

    let text = header;

    if (abnormalTests.length > 0) {
      text += isArabic ? "⚠️ نتائج غير طبيعية:\n" : "⚠️ Abnormal Results:\n";
      abnormalTests.forEach(test => {
        const name = isArabic ? test.nameAr : test.nameEn;
        const statusText = test.status === "high" 
          ? (isArabic ? "مرتفع" : "High") 
          : (isArabic ? "منخفض" : "Low");
        const range = test.normalRangeMin !== null && test.normalRangeMax !== null
          ? `${test.normalRangeMin}-${test.normalRangeMax} ${test.unit || ""}`
          : "";
        text += `• ${name}: ${test.value} ${test.unit || ""} (${statusText})`;
        if (range) text += ` [${isArabic ? "الطبيعي" : "Normal"}: ${range}]`;
        text += "\n";
      });
      text += "\n";
    }

    if (normalTests.length > 0) {
      text += isArabic ? "✅ نتائج طبيعية:\n" : "✅ Normal Results:\n";
      normalTests.forEach(test => {
        const name = isArabic ? test.nameAr : test.nameEn;
        text += `• ${name}: ${test.value} ${test.unit || ""}\n`;
      });
    }

    const footer = isArabic
      ? "\n📅 " + format(new Date(), "PPP", { locale: dateLocale })
      : "\n📅 " + format(new Date(), "PPP", { locale: dateLocale });
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

  const getStatusBadge = (status: string, hasResult: boolean) => {
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
    
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        {status === "high" ? t("high") : t("low")}
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
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>{t("testName")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="text-center">{t("yourValue")}</TableHead>
                <TableHead className="text-center">{t("normalRange")}</TableHead>
                <TableHead className="text-center">{t("status")}</TableHead>
                <TableHead>{t("testDate")}</TableHead>
                <TableHead className="text-center">{t("reminder")}</TableHead>
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
                    <TableCell className="text-muted-foreground text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {isArabic ? test.nameAr : test.nameEn}
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={test.category} />
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {test.hasResult ? (
                        <span className={test.status !== "normal" && test.status !== "pending" ? "font-bold text-red-600 dark:text-red-400" : ""}>
                          {test.value} {test.unit || ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {test.normalRangeMin !== null && test.normalRangeMax !== null
                        ? `${test.normalRangeMin} - ${test.normalRangeMax} ${test.unit || ""}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(test.status, test.hasResult)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {test.testDate 
                        ? format(new Date(test.testDate), "PP", { locale: dateLocale })
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {existingReminder ? (
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="secondary" className="gap-1">
                            <Bell className="h-3 w-3" />
                            {format(new Date(existingReminder.dueDate), "PP", { locale: dateLocale })}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteReminderMutation.mutate(existingReminder.id)}
                            data-testid={`button-delete-reminder-${test.testId}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Popover 
                          open={openPopover === test.testId} 
                          onOpenChange={(open) => setOpenPopover(open ? test.testId : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              data-testid={`button-set-reminder-${test.testId}`}
                            >
                              <CalendarDays className="h-4 w-4" />
                              {t("setReminder")}
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
