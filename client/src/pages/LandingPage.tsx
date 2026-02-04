import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { 
  Activity, 
  FileText, 
  Bell, 
  Shield, 
  Pill,
  ChevronRight,
  LogIn
} from "lucide-react";

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const features = [
    {
      icon: FileText,
      title: isArabic ? "تحليل PDF بالذكاء الاصطناعي" : "AI PDF Analysis",
      description: isArabic 
        ? "ارفع تحاليلك وسيقوم الذكاء الاصطناعي باستخراج النتائج تلقائياً" 
        : "Upload your lab results and AI will automatically extract test values",
    },
    {
      icon: Activity,
      title: isArabic ? "50 نوع فحص" : "50 Test Types",
      description: isArabic 
        ? "نغطي الفيتامينات والمعادن والهرمونات ووظائف الأعضاء والمزيد" 
        : "Covering vitamins, minerals, hormones, organ functions, and more",
    },
    {
      icon: Bell,
      title: isArabic ? "تذكيرات إعادة الفحص" : "Recheck Reminders",
      description: isArabic 
        ? "تنبيهات تلقائية لإعادة الفحوصات بناءً على المدة الموصى بها" 
        : "Automatic alerts for retesting based on recommended intervals",
    },
    {
      icon: Shield,
      title: isArabic ? "حماية البيانات" : "Data Security",
      description: isArabic 
        ? "بياناتك الصحية مشفرة ومحمية بأعلى معايير الأمان" 
        : "Your health data is encrypted and protected with highest security standards",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pill className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">
                <LogIn className="h-4 w-4 me-2" />
                {t("login")}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <MedicalDisclaimer />
        </div>

        <section className="text-center py-16 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("appDescription")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {isArabic 
              ? "حلل نتائج تحاليلك الطبية بسهولة واتبع صحتك مع تذكيرات ذكية"
              : "Easily analyze your medical lab results and track your health with smart reminders"
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">
                {isArabic ? "ابدأ الآن" : "Get Started"}
                <ChevronRight className="h-4 w-4 ms-2" />
              </a>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
          {features.map((feature, i) => (
            <Card key={i} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="p-3 w-fit rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="py-12">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center space-y-4">
              <h2 className="text-2xl font-bold">
                {isArabic ? "ابدأ تتبع صحتك اليوم" : "Start Tracking Your Health Today"}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {isArabic 
                  ? "سجّل مجاناً وارفع أول ملف PDF لتحاليلك للحصول على تحليل فوري"
                  : "Sign up for free and upload your first lab PDF for instant analysis"
                }
              </p>
              <Button size="lg" asChild>
                <a href="/api/login">
                  {isArabic ? "سجّل مجاناً" : "Sign Up Free"}
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t("medicalDisclaimer")}</p>
          <p className="mt-4 font-semibold text-foreground">{t("appName")}</p>
          <p className="text-xs">{t("companyName")}</p>
          <p className="mt-2">© 2024 {t("appName")}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
