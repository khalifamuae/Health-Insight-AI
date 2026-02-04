import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PdfUploader } from "@/components/PdfUploader";
import { UploadedFilesHistory } from "@/components/UploadedFilesHistory";

export default function Upload() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleUploadComplete = (testsFound: number) => {
    queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/uploaded-pdfs"] });
    
    if (testsFound > 0) {
      setTimeout(() => setLocation("/tests"), 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PdfUploader onUploadComplete={handleUploadComplete} />
      <UploadedFilesHistory />
    </div>
  );
}
