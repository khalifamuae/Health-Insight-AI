import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Home, FlaskConical, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, labelKey: "home" },
  { path: "/tests", icon: FlaskConical, labelKey: "myTests" },
  { path: "/upload", icon: Upload, labelKey: "upload" },
  { path: "/profile", icon: User, labelKey: "profile" },
];

export function BottomNav() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const isRTL = i18n.language === "ar";

  const items = isRTL ? [...navItems].reverse() : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.labelKey}`}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn("text-xs", isActive && "font-semibold")}>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
