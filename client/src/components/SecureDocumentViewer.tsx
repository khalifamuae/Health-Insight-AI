import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function SecureDocumentViewer({ fileId, fileName, fileType }: { fileId: string; fileName: string; fileType: "pdf" | "image" }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    
    const loadDocument = async () => {
      try {
        setLoading(true);
        // Using apiRequest to fetch securely
        const res = await apiRequest("GET", `/api/subscriber-management/documents/${fileId}`);
        const blob = await res.blob();
        
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err: any) {
        setError(err.message || "Failed to load document securely");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 border rounded-xl bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{isRTL ? "جاري تحميل المستند الآمن..." : "Loading secure document..."}</p>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 border rounded-xl bg-card text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>{error || "Error loading document"}</p>
      </div>
    );
  }

  return (
    <div 
      className="relative rounded-xl border border-muted bg-neutral-100 dark:bg-neutral-900 overflow-hidden" 
      onContextMenu={(e) => e.preventDefault()} // Disable right click
      style={{ userSelect: "none" }} // Disable text selection
    >
      {/* We apply pointer-events-auto for images so they can be panned/zoomed if supported natively, but the container intercepts right clicks */}
      {fileType === "pdf" ? (
        <iframe 
          src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
          className="w-full h-[600px] border-none !pointer-events-auto"
          title={fileName}
        />
      ) : (
        <div className="flex items-center justify-center p-4 min-h-[400px]">
          <img 
            src={blobUrl} 
            alt={fileName} 
            className="max-w-full max-h-[600px] object-contain pointer-events-auto select-none"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
