import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  TestTube, 
  Upload, 
  User, 
  Bell,
  Pill,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@shared/schema";

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const menuItems = [
    { title: t("dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("myTests"), url: "/tests", icon: TestTube },
    { title: t("uploadPdf"), url: "/upload", icon: Upload },
    { title: t("reminders"), url: "/reminders", icon: Bell },
    { title: t("profile"), url: "/profile", icon: User },
  ];

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User" : "";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold">{t("appName")}</h1>
            <p className="text-xs text-muted-foreground">{t("appDescription")}</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage 
                src={profile?.profileImagePath || user.profileImageUrl || undefined} 
                alt={displayName}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href="/api/logout" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full" data-testid="button-login-sidebar">
            <a href="/api/login">{t("login")}</a>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
