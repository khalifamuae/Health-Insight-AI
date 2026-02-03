import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { MedicalDisclaimer } from "./MedicalDisclaimer";
import { apiRequest } from "@/lib/queryClient";

interface PdfUploaderProps {
  onUploadComplete?: (testsFound: number) => void;
}

export function PdfUploader({ onUploadComplete }: PdfUploaderProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testsFound, setTestsFound] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setTestsFound(null);
    } else {
      toast({
        title: t("error"),
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [toast, t]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setTestsFound(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      setProgress(30);
      setIsProcessing(true);

      const response = await fetch("/api/analyze-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setProgress(90);
      const result = await response.json();
      
      setProgress(100);
      setTestsFound(result.testsExtracted);
      
      toast({
        title: t("success"),
        description: `${result.testsExtracted} ${t("testsFound")}`,
      });

      onUploadComplete?.(result.testsExtracted);
    } catch (error) {
      toast({
        title: t("error"),
        description: "Failed to process PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setProgress(0);
    setTestsFound(null);
  };

  return (
    <div className="space-y-4">
      <MedicalDisclaimer />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("uploadTitle")}
          </CardTitle>
          <CardDescription>
            {t("uploadDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testsFound !== null ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t("analysisComplete")}</h3>
                <p className="text-muted-foreground">
                  {testsFound} {t("testsFound")}
                </p>
              </div>
              <Button onClick={resetUpload} variant="outline">
                {t("uploadPdf")}
              </Button>
            </div>
          ) : (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
                onClick={() => document.getElementById("pdf-input")?.click()}
                data-testid="dropzone-pdf"
              >
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-start">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">{t("dropzone")}</p>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isProcessing ? t("processing") : t("loading")}
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full"
                data-testid="button-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 me-2" />
                    {t("uploadPdf")}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
