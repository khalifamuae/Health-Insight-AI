import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  Trash2, 
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";

interface UploadedPdf {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "success" | "failed";
  errorMessage: string | null;
  testsExtracted: number | null;
  createdAt: string;
  processedAt: string | null;
}

export function UploadedFilesHistory() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = i18n.language === "ar";
  const dateLocale = isArabic ? ar : enUS;
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: uploadedPdfs = [], isLoading } = useQuery<UploadedPdf[]>({
    queryKey: ["/api/uploaded-pdfs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/uploaded-pdfs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-pdfs"] });
      toast({
        title: t("success"),
        description: t("fileDeleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("deleteFileFailed"),
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("pdf", file);
      const response = await fetch(`/api/uploaded-pdfs/${id}/retry`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Retry failed");
      }
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-pdfs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tests/all"] });
      setRetryingId(null);
      toast({
        title: t("success"),
        description: `${result.testsExtracted} ${t("testsFound")}`,
      });
    },
    onError: () => {
      setRetryingId(null);
      toast({
        title: t("error"),
        description: t("retryFailed"),
        variant: "destructive",
      });
    },
  });

  const handleRetryClick = (id: string) => {
    setRetryingId(id);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && retryingId) {
      if (file.type === "application/pdf") {
        retryMutation.mutate({ id: retryingId, file });
      } else {
        toast({
          title: t("error"),
          description: t("pleaseUploadPdf"),
          variant: "destructive",
        });
        setRetryingId(null);
      }
    }
    e.target.value = "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-emerald-600 gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("processed")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("failed")}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("processing")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("pending")}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (uploadedPdfs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("uploadedFiles")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="space-y-3">
          {uploadedPdfs.map((pdf) => (
            <div 
              key={pdf.id} 
              className="flex items-center justify-between p-3 border rounded-lg gap-3"
              data-testid={`file-item-${pdf.id}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" title={pdf.fileName}>
                    {pdf.fileName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pdf.createdAt && format(new Date(pdf.createdAt), "PPp", { locale: dateLocale })}
                  </p>
                  {pdf.status === "success" && pdf.testsExtracted !== null && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {pdf.testsExtracted} {t("testsExtracted")}
                    </p>
                  )}
                  {pdf.status === "failed" && pdf.errorMessage && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {pdf.errorMessage === "SCANNED_PDF" 
                        ? t("scannedPdfError") 
                        : pdf.errorMessage === "ANALYSIS_FAILED"
                          ? t("analysisFailedError")
                          : t("aiCouldNotRead")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(pdf.status)}
                {pdf.status === "failed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryClick(pdf.id)}
                    disabled={retryMutation.isPending && retryingId === pdf.id}
                    data-testid={`button-retry-${pdf.id}`}
                  >
                    {retryMutation.isPending && retryingId === pdf.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ms-1">{t("retry")}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(pdf.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-file-${pdf.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
