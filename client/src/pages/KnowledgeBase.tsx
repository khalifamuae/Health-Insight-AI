import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Pill,
  Beaker,
  Loader2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeEntry {
  id: string;
  domain: string;
  topic: string;
  content: string;
  contentAr: string | null;
  source: string;
  sourceUrl: string | null;
  tags: string[] | null;
  createdAt: string;
}

interface KnowledgeStats {
  counts: Record<string, number>;
  lastLearned: Record<string, string | null>;
  totalEntries: number;
}

const DOMAIN_INFO: Record<string, { icon: typeof Brain; labelEn: string; labelAr: string; color: string }> = {
  nutrition: { icon: HeartPulse, labelEn: "Clinical Nutrition", labelAr: "التغذية العلاجية", color: "text-red-500" },
  aerobic_training: { icon: Zap, labelEn: "Aerobic Training", labelAr: "التدريب الهوائي", color: "text-blue-500" },
  resistance_training: { icon: Dumbbell, labelEn: "Resistance Training", labelAr: "تدريب المقاومة", color: "text-orange-500" },
  vitamins_minerals: { icon: Pill, labelEn: "Vitamins & Minerals", labelAr: "الفيتامينات والمعادن", color: "text-green-500" },
  hormones: { icon: Beaker, labelEn: "Hormones", labelAr: "الهرمونات", color: "text-purple-500" },
};

export default function KnowledgeBase() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { toast } = useToast();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const statsQuery = useQuery<KnowledgeStats>({
    queryKey: ["/api/knowledge/stats"],
  });

  const entriesQuery = useQuery<KnowledgeEntry[]>({
    queryKey: ["/api/knowledge", selectedDomain],
    queryFn: async () => {
      const url = selectedDomain ? `/api/knowledge?domain=${selectedDomain}` : "/api/knowledge";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: selectedDomain !== null,
  });

  const learnMutation = useMutation({
    mutationFn: async (domain?: string) => {
      const res = await apiRequest("POST", "/api/knowledge/learn", domain ? { domain } : {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
      toast({
        title: isArabic ? "تم التعلّم بنجاح" : "Learning Complete",
        description: data.entriesAdded !== undefined
          ? (isArabic ? `تم إضافة ${data.entriesAdded} معلومة جديدة` : `Added ${data.entriesAdded} new entries`)
          : (isArabic ? "بدأت عملية التعلّم لجميع المجالات" : "Learning started for all domains"),
      });
    },
    onError: () => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في عملية التعلّم" : "Learning failed",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/stats"] });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return isArabic ? "لم يتم بعد" : "Not yet";
    return new Date(dateStr).toLocaleDateString(isArabic ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto" data-testid="knowledge-base-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold" data-testid="text-knowledge-title">
            {isArabic ? "قاعدة المعرفة" : "Knowledge Base"}
          </h2>
        </div>
        <Button
          onClick={() => learnMutation.mutate(undefined)}
          disabled={learnMutation.isPending}
          data-testid="button-learn-all"
        >
          {learnMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ms-2">{isArabic ? "تعلّم الآن" : "Learn Now"}</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {isArabic
          ? "النظام يبحث تلقائياً كل يوم في المصادر العلمية الموثوقة ويخزّن المعلومات. يستخدم هذه المعرفة عند توليد الخطط الغذائية لتقديم توصيات أدق."
          : "The system automatically searches trusted scientific sources daily and stores knowledge. It uses this knowledge when generating diet plans for more accurate recommendations."}
      </p>

      {statsQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(DOMAIN_INFO).map(([domain, info]) => {
            const Icon = info.icon;
            const count = statsQuery.data?.counts[domain] || 0;
            const lastLearned = statsQuery.data?.lastLearned[domain] || null;
            const isSelected = selectedDomain === domain;

            return (
              <Card
                key={domain}
                className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedDomain(isSelected ? null : domain)}
                data-testid={`card-domain-${domain}`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      <span className="font-semibold text-sm">
                        {isArabic ? info.labelAr : info.labelEn}
                      </span>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-count-${domain}`}>
                      {count}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {isArabic ? "آخر تعلّم: " : "Last learned: "}
                    {formatDate(lastLearned)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      learnMutation.mutate(domain);
                    }}
                    disabled={learnMutation.isPending}
                    data-testid={`button-learn-${domain}`}
                  >
                    {learnMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    <span className="ms-1.5 text-xs">
                      {isArabic ? "تعلّم هذا المجال" : "Learn this domain"}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          <Card data-testid="card-total-knowledge">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-2xl font-bold" data-testid="text-total-entries">
                {statsQuery.data?.totalEntries || 0}
              </span>
              <span className="text-xs text-muted-foreground">
                {isArabic ? "إجمالي المعلومات المخزّنة" : "Total stored knowledge"}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedDomain && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {(() => {
              const info = DOMAIN_INFO[selectedDomain];
              const Icon = info.icon;
              return (
                <>
                  <Icon className={`h-4 w-4 ${info.color}`} />
                  {isArabic ? info.labelAr : info.labelEn}
                  <span className="text-muted-foreground">
                    ({entriesQuery.data?.length || 0})
                  </span>
                </>
              );
            })()}
          </h3>

          {entriesQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entriesQuery.data && entriesQuery.data.length > 0 ? (
            <div className="space-y-2">
              {entriesQuery.data.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                return (
                  <Card key={entry.id} data-testid={`knowledge-entry-${entry.id}`}>
                    <CardContent className="p-3 space-y-1.5">
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs">{entry.topic}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {entry.source} | {formatDate(entry.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(entry.id);
                            }}
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-2 pt-1.5 border-t">
                          <p className="text-xs leading-relaxed">{entry.content}</p>
                          {entry.contentAr && isArabic && (
                            <p className="text-xs leading-relaxed text-muted-foreground">{entry.contentAr}</p>
                          )}
                          {entry.sourceUrl && (
                            <a
                              href={entry.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary underline"
                            >
                              {entry.sourceUrl}
                            </a>
                          )}
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {entry.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-[9px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isArabic
                    ? "لا توجد معلومات مخزّنة في هذا المجال بعد. اضغط \"تعلّم هذا المجال\" لبدء البحث."
                    : "No knowledge stored in this domain yet. Click \"Learn this domain\" to start."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
