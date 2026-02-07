import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface DietPlanJobContextType {
  activeJobId: string | null;
  isGenerating: boolean;
  completedPlan: any | null;
  startJob: (jobId: string) => void;
  clearCompletedPlan: () => void;
}

const DietPlanJobContext = createContext<DietPlanJobContextType>({
  activeJobId: null,
  isGenerating: false,
  completedPlan: null,
  startJob: () => {},
  clearCompletedPlan: () => {},
});

export function useDietPlanJob() {
  return useContext(DietPlanJobContext);
}

const STORAGE_KEY = "biotrack_diet_job_id";

export function DietPlanJobProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [completedPlan, setCompletedPlan] = useState<any | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch (e) {
        // fallback: ignore if notification fails
      }
    }
  }, []);

  const pollJob = useCallback((jobId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/diet-plan/job/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "completed" && data.plan) {
          stopPolling();
          setCompletedPlan(data.plan);
          setActiveJobId(null);
          localStorage.removeItem(STORAGE_KEY);
          const isAr = i18n.language === "ar";
          sendNotification(
            "BioTrack AI",
            isAr ? "تم إصدار جدولك الغذائي بنجاح!" : "Your diet plan is ready!"
          );
          toast({
            title: isAr ? "تم إصدار جدولك الغذائي بنجاح!" : "Your diet plan is ready!",
          });
        } else if (data.status === "failed") {
          stopPolling();
          setActiveJobId(null);
          localStorage.removeItem(STORAGE_KEY);
          const isAr = i18n.language === "ar";
          sendNotification(
            "BioTrack AI",
            isAr ? "فشل في تصميم النظام الغذائي" : "Diet plan generation failed"
          );
          toast({
            title: isAr ? "فشل في تصميم النظام الغذائي" : "Diet plan generation failed",
            variant: "destructive",
          });
        }
      } catch (err) {
        // ignore network errors, keep polling
      }
    }, 3000);
  }, [stopPolling, sendNotification, toast, i18n.language]);

  const startJob = useCallback((jobId: string) => {
    setActiveJobId(jobId);
    setCompletedPlan(null);
    localStorage.setItem(STORAGE_KEY, jobId);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    pollJob(jobId);
  }, [pollJob]);

  const clearCompletedPlan = useCallback(() => {
    setCompletedPlan(null);
  }, []);

  useEffect(() => {
    if (activeJobId) {
      pollJob(activeJobId);
    }
    return () => stopPolling();
  }, []);

  return (
    <DietPlanJobContext.Provider value={{ activeJobId, isGenerating: !!activeJobId, completedPlan, startJob, clearCompletedPlan }}>
      {children}
    </DietPlanJobContext.Provider>
  );
}
