import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DietPlanJobProvider } from "@/context/DietPlanJobContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import MyTests from "@/pages/MyTests";
import Compare from "@/pages/Compare";
import Upload from "@/pages/Upload";
import DietPlan from "@/pages/DietPlan";
import MyDietSchedule from "@/pages/MyDietSchedule";
import Profile from "@/pages/Profile";
import "./lib/i18n";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Menu, FlaskConical, GitCompareArrows, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function HamburgerMenu() {
  const { t, i18n } = useTranslation();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const isRTL = i18n.language === "ar";

  const menuItems = [
    { path: "/tests", icon: FlaskConical, labelKey: "menuMyTests" },
    { path: "/compare", icon: GitCompareArrows, labelKey: "menuCompare" },
    { path: "/my-diet-schedule", icon: CalendarDays, labelKey: "menuMyDietSchedule" },
  ];

  const handleNav = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-hamburger-menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={isRTL ? "right" : "left"} className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-start">
            <span className="text-primary font-bold">{t("appName")}</span>
          </SheetTitle>
          <SheetDescription className="sr-only">Navigation menu</SheetDescription>
        </SheetHeader>
        <div className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                data-testid={`menu-${item.labelKey}`}
                className={cn(
                  "flex items-center gap-3 w-full rounded-md px-3 py-3 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover-elevate"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <HamburgerMenu />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-primary">{t("appName")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function AppContent() {
  const { i18n } = useTranslation();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <DietPlanJobProvider>
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tests" component={MyTests} />
          <Route path="/compare" component={Compare} />
          <Route path="/upload" component={Upload} />
          <Route path="/diet" component={DietPlan} />
          <Route path="/my-diet-schedule" component={MyDietSchedule} />
          <Route path="/profile" component={Profile} />
          <Route path="/reminders" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    </DietPlanJobProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
